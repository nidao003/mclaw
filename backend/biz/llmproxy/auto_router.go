package llmproxy

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sort"
	"strings"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/model"
	"github.com/nidao003/mclaw/backend/db/user"
)

// autoRouter 把 model="auto" 的请求路由到具体云端模型。
// 候选集 = 用户自己或 admin 公共模型中 is_hidden=false 且非 auto 的、
// 与请求协议(InterfaceType)匹配的模型；优先可用(LastCheckSuccess)、再按 Weight 降序。
type autoRouter interface {
	Resolve(ctx context.Context, userID uuid.UUID, vmID string, upstreamPath string) (*modelContext, error)
}

type autoRouterImpl struct {
	db     *db.Client
	logger *slog.Logger
}

// NewAutoRouter creates the default auto-router backed by the ent db client.
func NewAutoRouter(client *db.Client, logger *slog.Logger) autoRouter {
	if logger == nil {
		logger = slog.Default()
	}
	return &autoRouterImpl{
		db:     client,
		logger: logger.With("module", "auto_router"),
	}
}

func (a *autoRouterImpl) Resolve(ctx context.Context, userID uuid.UUID, vmID string, upstreamPath string) (*modelContext, error) {
	ifaceType := pathToInterfaceType(upstreamPath)

	q := a.db.Model.Query().Where(
		model.IsHidden(false),
		model.ModelNEQ("auto"),
		model.Or(
			model.UserID(userID),
			// admin 名下模型即公共模型，对所有用户可见
			model.HasUserWith(user.Role(consts.UserRoleAdmin)),
		),
	)
	if ifaceType != "" {
		q = q.Where(model.InterfaceTypeEQ(string(ifaceType)))
	}

	candidates, err := q.All(ctx)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, errors.New("no available model for auto routing")
	}

	// 排序：LastCheckSuccess 优先，其次 Weight 降序
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].LastCheckSuccess != candidates[j].LastCheckSuccess {
			return candidates[i].LastCheckSuccess
		}
		return candidates[i].Weight > candidates[j].Weight
	})
	chosen := candidates[0]

	a.logger.DebugContext(ctx, "auto route resolved",
		"user_id", userID, "model", chosen.Model, "provider", chosen.Provider,
		"candidates", len(candidates))

	return &modelContext{
		modelID:   chosen.ID,
		userID:    userID,
		vmID:      vmID,
		provider:  chosen.Provider,
		modelName: chosen.Model,
		baseURL:   chosen.BaseURL,
		apiKey:    chosen.APIKey,
	}, nil
}

// pathToInterfaceType maps the upstream path to the model InterfaceType.
func pathToInterfaceType(upstreamPath string) consts.InterfaceType {
	switch {
	case strings.HasSuffix(upstreamPath, "/chat/completions"):
		return consts.InterfaceTypeOpenAIChat
	case strings.HasSuffix(upstreamPath, "/responses"):
		return consts.InterfaceTypeOpenAIResponse
	case strings.HasSuffix(upstreamPath, "/messages"):
		return consts.InterfaceTypeAnthropic
	default:
		return ""
	}
}

// rewriteModelField replaces the "model" field in a JSON request body with newModel.
func rewriteModelField(body []byte, newModel string) ([]byte, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	payload["model"] = newModel
	return json.Marshal(payload)
}
