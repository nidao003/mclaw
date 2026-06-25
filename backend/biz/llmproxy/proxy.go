package llmproxy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/modelapikey"
	"github.com/nidao003/mclaw/backend/db/taskvirtualmachine"
	"github.com/nidao003/mclaw/backend/pkg/modelusage"
)

const upstreamFailureMessage = "连接上游模型失败，请检查模型配置，或重试"

var allowPaths = map[string]string{
	"/v1/chat/completions": "/chat/completions",
	"/v1/responses":        "/responses",
	"/v1/messages":         "/messages",
}

type contextKey struct{}

type modelContext struct {
	modelID      uuid.UUID
	userID       uuid.UUID
	vmID         string
	provider     string
	modelName    string
	baseURL      string
	apiKey       string
	deviceSecret string    // 客户端 HMAC 签名密钥（绑 mclaw 客户端），空表示老 key 无绑定
	expiresAt    *time.Time // runtime key 过期时间，nil 表示不过期（兼容）
	revokedAt    *time.Time // 撤销时间，非 nil 即失效
}

type proxyContext struct {
	model        *modelContext
	upstreamPath string
	stream       bool
}

type Proxy struct {
	db         *db.Client
	logger     *slog.Logger
	recorder   usageRecorder
	billing    billingService
	autoRouter autoRouter
	transport  *http.Transport
	proxy      *httputil.ReverseProxy
}

type usageRecorder interface {
	Record(ctx context.Context, event modelusage.Event) error
}

// billingService defines the interface for billing deduction after LLM usage.
type billingService interface {
	RecordUsageAndDeduct(ctx context.Context, userID uuid.UUID, modelName string, inputTokens, outputTokens uint64) error
}

type Option func(*Proxy)

func WithUsageRecorder(recorder usageRecorder) Option {
	return func(p *Proxy) {
		p.recorder = recorder
	}
}

// WithBillingService injects the billing service for usage deduction.
func WithBillingService(billing billingService) Option {
	return func(p *Proxy) {
		p.billing = billing
	}
}

// WithAutoRouter injects the auto-router for model="auto" requests.
func WithAutoRouter(r autoRouter) Option {
	return func(p *Proxy) {
		p.autoRouter = r
	}
}

func NewProxy(db *db.Client, logger *slog.Logger, opts ...Option) *Proxy {
	if logger == nil {
		logger = slog.Default()
	}
	p := &Proxy{
		db:     db,
		logger: logger.With("module", "llmproxy"),
		transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 100,
			MaxConnsPerHost:     100,
			IdleConnTimeout:     90 * time.Second,
			Proxy:               http.ProxyFromEnvironment,
			DialContext: (&net.Dialer{
				Timeout:   5 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   5 * time.Second,
			ResponseHeaderTimeout: 300 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(p)
	}
	p.proxy = &httputil.ReverseProxy{
		Transport:      p.transport,
		Rewrite:        p.rewrite,
		ModifyResponse: p.modifyResponse,
		ErrorHandler:   p.errorHandler,
		FlushInterval:  100 * time.Millisecond,
	}
	return p
}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	upstreamPath, ok := allowPaths[r.URL.Path]
	if !ok {
		http.NotFound(w, r)
		return
	}
	token, ok := extractToken(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	r.ContentLength = int64(len(body))

	reqMeta, err := readRequestMeta(body)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	m, err := p.resolveModel(r.Context(), token)
	if err != nil {
		p.logger.WarnContext(r.Context(), "resolve runtime model failed", "error", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 加固校验：撤销 → 过期 → 客户端 HMAC 签名。验签绑 runtime key（用户凭证），
	// 必须在 auto 路由之前——auto 只改写转发目标，不影响鉴权，复用同一把 key 的 device_secret。
	if m.revokedAt != nil {
		p.logger.WarnContext(r.Context(), "runtime key revoked", "user_id", m.userID)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if m.expiresAt != nil && time.Now().After(*m.expiresAt) {
		p.logger.WarnContext(r.Context(), "runtime key expired", "user_id", m.userID, "expires_at", *m.expiresAt)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	// 桌面端 key（vmID 为空）必须有 device_secret 并验签；老 key（device_secret 空）作废需重新签发。
	// VM key（vmID 非空）是后端可信调度环境签发、不在用户配置文件，第一期豁免签名，留第二期统一加固。
	if m.vmID == "" {
		if err := verifySignature(r, body, m.deviceSecret, time.Now()); err != nil {
			p.logger.WarnContext(r.Context(), "verify signature failed", "error", err, "user_id", m.userID)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// auto 模型路由：请求 model="auto" 时，由 autoRouter 选具体云端模型并改写请求体
	if m.modelName == "auto" && p.autoRouter != nil {
		target, routeErr := p.autoRouter.Resolve(r.Context(), m.userID, m.vmID, upstreamPath)
		if routeErr != nil {
			p.logger.WarnContext(r.Context(), "auto route failed", "error", routeErr, "user_id", m.userID)
			http.Error(w, "无可用云端模型，请先在模型页配置一个可用模型", http.StatusServiceUnavailable)
			return
		}
		if newBody, marshalErr := rewriteModelField(body, target.modelName); marshalErr == nil {
			body = newBody
			r.Body = io.NopCloser(bytes.NewReader(body))
			r.ContentLength = int64(len(body))
		}
		p.logger.DebugContext(r.Context(), "auto route", "from", "auto", "to", target.modelName, "provider", target.provider)
		m = target
	} else if reqMeta.Model != "" && reqMeta.Model != m.modelName {
		p.logger.WarnContext(r.Context(), "model mismatch", "request_model", reqMeta.Model, "expected_model", m.modelName)
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	ctx := context.WithValue(r.Context(), contextKey{}, &proxyContext{
		model:        m,
		upstreamPath: upstreamPath,
		stream:       reqMeta.Stream,
	})
	p.proxy.ServeHTTP(w, r.WithContext(ctx))
}

func (p *Proxy) resolveModel(ctx context.Context, token string) (*modelContext, error) {
	keyID, err := uuid.Parse(token)
	query := p.db.ModelApiKey.Query().
		WithModel().
		Where(modelapikey.APIKey(token))
	if err == nil {
		query = p.db.ModelApiKey.Query().
			WithModel().
			Where(modelapikey.Or(modelapikey.ID(keyID), modelapikey.APIKey(token)))
	}
	key, err := query.Only(ctx)
	if err != nil {
		return nil, err
	}
	if key.Edges.Model == nil {
		return nil, errors.New("model not found")
	}
	mc := &modelContext{
		modelID:   key.Edges.Model.ID,
		userID:    key.UserID,
		vmID:      key.VirtualmachineID,
		provider:  key.Edges.Model.Provider,
		modelName: key.Edges.Model.Model,
		baseURL:   key.Edges.Model.BaseURL,
		apiKey:    key.Edges.Model.APIKey,
	}
	// 加固字段：device_secret/expires_at/revoked_at（均可能为零值，由 ServeHTTP 校验）
	if key.DeviceSecret != "" {
		mc.deviceSecret = key.DeviceSecret
	}
	if !key.ExpiresAt.IsZero() {
		mc.expiresAt = &key.ExpiresAt
	}
	if !key.RevokedAt.IsZero() {
		mc.revokedAt = &key.RevokedAt
	}
	return mc, nil
}

var LLMAllowPaths []string = []string{
	"/v1/messages",
	"/chat/completions",
	"/responses",
}

func fetchAllowPath(path string) string {
	for _, v := range LLMAllowPaths {
		if strings.HasSuffix(path, v) {
			return v
		}
	}
	return ""
}

func (p *Proxy) rewrite(r *httputil.ProxyRequest) {
	path := r.In.URL.Path
	p.logger.With("path", path).DebugContext(r.In.Context(), "new rewrite request")

	ctx, ok := r.In.Context().Value(contextKey{}).(*proxyContext)
	if !ok || ctx == nil || ctx.model == nil {
		p.logger.WarnContext(r.In.Context(), "missing model context")
		return
	}

	uppath := fetchAllowPath(path)
	if uppath == "" {
		p.logger.With("path", path).WarnContext(r.In.Context(), "unsupport api type")
		return
	}

	m := ctx.model
	ul, err := url.Parse(m.baseURL)
	if err != nil {
		p.logger.ErrorContext(r.In.Context(), "parse model base url failed", "base_url", m.baseURL, "error", err)
		return
	}
	r.Out.URL.Scheme = ul.Scheme
	r.Out.URL.Host = ul.Host
	r.Out.URL.Path = filepath.Join(ul.Path, uppath)
	r.Out.Header.Set("Authorization", "Bearer "+m.apiKey)
	r.Out.Header.Set("X-Api-Key", m.apiKey)
	r.SetXForwarded()
	r.Out.Host = ul.Host
	p.logger.With(
		"model", m.modelName,
		"in", r.In.URL.String(),
		"out", r.Out.URL.String(),
	).DebugContext(r.In.Context(), "rewrite request success")
}

func (p *Proxy) errorHandler(w http.ResponseWriter, r *http.Request, err error) {
	p.logger.ErrorContext(r.Context(), "proxy upstream failed", "path", r.URL.Path, "error", err)
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusBadGateway)
	_, _ = w.Write([]byte(upstreamFailureMessage))
}

func (p *Proxy) modifyResponse(resp *http.Response) error {
	if resp == nil || resp.Body == nil {
		return nil
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil
	}
	ctx, ok := resp.Request.Context().Value(contextKey{}).(*proxyContext)
	if !ok || ctx == nil || ctx.model == nil {
		return nil
	}
	resp.Body = NewUsageCapture(p.logger, resp.Body, &UsageCaptureContext{
		ctx:      resp.Request.Context(),
		path:     normalizeUsageCapturePath(resp.Request.URL.Path),
		stream:   ctx.stream,
		proxyCtx: ctx,
		proxy:    p,
	})
	return nil
}

func normalizeUsageCapturePath(path string) string {
	switch {
	case strings.HasSuffix(path, "/chat/completions"):
		return "/v1/chat/completions"
	case strings.HasSuffix(path, "/responses"):
		return "/v1/responses"
	case strings.HasSuffix(path, "/messages"):
		return "/v1/messages"
	default:
		return path
	}
}

func (p *Proxy) recordUsage(ctx context.Context, proxyCtx *proxyContext, result usageResult) {
	event, ok := p.buildUsageEvent(ctx, proxyCtx, result)
	if !ok {
		return
	}
	if err := p.recorder.Record(ctx, event); err != nil {
		p.logger.WarnContext(ctx, "record model usage failed", "model", proxyCtx.model.modelName, "error", err)
	}
}

func (p *Proxy) buildUsageEvent(ctx context.Context, proxyCtx *proxyContext, result usageResult) (modelusage.Event, bool) {
	if p.recorder == nil || proxyCtx == nil || proxyCtx.model == nil {
		return modelusage.Event{}, false
	}
	if !result.hasTokens() {
		return modelusage.Event{}, false
	}
	m := proxyCtx.model
	taskID := p.resolveTaskID(ctx, m.vmID)
	// mclaw: taskID can be nil (no VM/Task in mclaw mode), still record usage

	// Deduct from billing if billing service is available
	if p.billing != nil {
		if err := p.billing.RecordUsageAndDeduct(ctx, m.userID, m.modelName,
			result.InputTokens+result.CacheReadInputTokens, result.OutputTokens); err != nil {
			p.logger.WarnContext(ctx, "billing deduction failed", "error", err, "user_id", m.userID, "model", m.modelName)
		}
	}

	return modelusage.Event{
		EventTime:    time.Now(),
		TaskID:       taskID,
		UserID:       m.userID,
		Provider:     m.provider,
		ModelID:      m.modelID.String(),
		ModelName:    m.modelName,
		InputTokens:  result.InputTokens + result.CacheReadInputTokens,
		OutputTokens: result.OutputTokens,
		CachedTokens: result.CacheReadInputTokens + result.CachedTokens,
		TotalTokens:  result.totalTokens(),
		Success:      true,
		RequestID:    result.ResponseID,
		Source:       "llmproxy",
	}, true
}

func (p *Proxy) resolveTaskID(ctx context.Context, vmID string) uuid.UUID {
	if p == nil || p.db == nil || vmID == "" {
		return uuid.Nil
	}
	taskVM, err := p.db.TaskVirtualMachine.Query().
		Where(taskvirtualmachine.VirtualmachineIDEQ(vmID)).
		Order(db.Desc(taskvirtualmachine.FieldCreatedAt)).
		First(ctx)
	if err != nil {
		p.logger.WarnContext(ctx, "resolve task from vm failed", "vm_id", vmID, "error", err)
		return uuid.Nil
	}
	return taskVM.TaskID
}

func extractToken(req *http.Request) (string, bool) {
	token := strings.TrimSpace(req.Header.Get("X-Api-Key"))
	if token != "" {
		return token, true
	}
	token, ok := strings.CutPrefix(req.Header.Get("Authorization"), "Bearer ")
	if !ok {
		return "", false
	}
	token = strings.TrimSpace(token)
	return token, token != ""
}

type requestMeta struct {
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

func readRequestMeta(body []byte) (requestMeta, error) {
	var payload struct {
		Model  string `json:"model"`
		Stream bool   `json:"stream"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return requestMeta{}, fmt.Errorf("parse llm request: %w", err)
	}
	return requestMeta{Model: payload.Model, Stream: payload.Stream}, nil
}
