package llmproxy

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// 云端模型访问绑定加固（第一期）：客户端 HMAC 签名。
//
// 只有 mclaw 客户端持有 deviceSecret（存 macOS Keychain，经 Electron safeStorage 加密，
// 启动 Gateway 子进程时解密后通过环境变量注入），纯 curl 拿 runtime key 也算不出签名，
// llmproxy 验签不过直接 401。这是"绑定 mclaw 客户端"的本质。
//
// 签名头格式：
//
//	X-Mclaw-Sig: t=<unix秒>, v1=<hex>
//
// 其中 v1 = HMAC-SHA256(deviceSecret, "<t>\n<METHOD>\n<path>\n<bodySha256>")
// bodySha256 = SHA256(请求体) 的 hex。body 完整性隐含在签名输入里——服务端用实际
// 收到的 body 重算 bodySha256 再算 HMAC，body 被篡改则 HMAC 不等。

const (
	// sigHeader 客户端签名头名
	sigHeader = "X-Mclaw-Sig"
	// sigMaxSkew 允许的时间偏差（防重放窗口），放宽到 ±10 分钟容忍客户端时钟漂移
	sigMaxSkew = 10 * time.Minute
)

var (
	errMissingDeviceSecret = errors.New("runtime key has no device secret, re-issue required")
	errMissingSig          = errors.New("missing X-Mclaw-Sig header")
	errBadSigFormat        = errors.New("invalid X-Mclaw-Sig format")
	errStaleSig            = errors.New("stale signature timestamp")
	errSigMismatch         = errors.New("signature mismatch")
)

// signSignature 计算签名 v1 = HMAC-SHA256(deviceSecret, "<t>\n<METHOD>\n<path>\n<bodySha256>")。
// 暴露给桌面端测试对齐用（后端单测也复用此函数生成期望签名）。
func signSignature(deviceSecret string, t int64, method, path string, body []byte) string {
	bodySum := sha256.Sum256(body)
	mac := hmac.New(sha256.New, []byte(deviceSecret))
	fmt.Fprintf(mac, "%d\n%s\n%s\n%s", t, strings.ToUpper(method), path, hex.EncodeToString(bodySum[:]))
	return hex.EncodeToString(mac.Sum(nil))
}

// parseSigHeader 解析 "t=<unix秒>, v1=<hex>" 头，返回时间戳与签名。
func parseSigHeader(raw string) (t int64, v1 string, ok bool) {
	var tsStr string
	for _, p := range strings.Split(raw, ",") {
		p = strings.TrimSpace(p)
		k, v, found := strings.Cut(p, "=")
		if !found {
			return 0, "", false
		}
		switch strings.TrimSpace(k) {
		case "t":
			tsStr = strings.TrimSpace(v)
		case "v1":
			v1 = strings.TrimSpace(v)
		}
	}
	if tsStr == "" || v1 == "" {
		return 0, "", false
	}
	t, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return 0, "", false
	}
	return t, v1, true
}

// verifySignature 校验请求签名。deviceSecret 为空直接拒绝（老 key 无绑定，必须重新签发）。
// now 参数注入便于单测控制时间窗口。
func verifySignature(r *http.Request, body []byte, deviceSecret string, now time.Time) error {
	if deviceSecret == "" {
		return errMissingDeviceSecret
	}
	raw := r.Header.Get(sigHeader)
	if raw == "" {
		return errMissingSig
	}
	t, v1, ok := parseSigHeader(raw)
	if !ok {
		return errBadSigFormat
	}
	if absDur(now.Unix()-t) > int64(sigMaxSkew.Seconds()) {
		return errStaleSig
	}
	expect := signSignature(deviceSecret, t, r.Method, r.URL.Path, body)
	if !hmac.Equal([]byte(expect), []byte(v1)) {
		return errSigMismatch
	}
	return nil
}

func absDur(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
