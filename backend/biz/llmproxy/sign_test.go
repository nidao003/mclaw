package llmproxy

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

const testDeviceSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func newSignedRequest(t *testing.T, method, path, secret string, body []byte, ts int64) *http.Request {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set(sigHeader, "t="+strconv.FormatInt(ts, 10)+", v1="+signSignature(secret, ts, method, path, body))
	return req
}

func TestVerifySignature_OK(t *testing.T) {
	body := []byte(`{"model":"auto","messages":[]}`)
	now := time.Now()
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, body, now.Unix())
	if err := verifySignature(req, body, testDeviceSecret, now); err != nil {
		t.Fatalf("expected ok, got %v", err)
	}
}

func TestVerifySignature_WrongSecret(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	// 客户端用别的 secret 签，服务端用 testDeviceSecret 验 → 不匹配
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", "wrongsecret", body, now.Unix())
	if err := verifySignature(req, body, testDeviceSecret, now); err != errSigMismatch {
		t.Fatalf("expected errSigMismatch, got %v", err)
	}
}

func TestVerifySignature_StaleTimestamp(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	// 签名时间戳早于 now 超过 10 分钟 → 重放/过期
	stale := now.Add(-11 * time.Minute)
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, body, stale.Unix())
	if err := verifySignature(req, body, testDeviceSecret, now); err != errStaleSig {
		t.Fatalf("expected errStaleSig, got %v", err)
	}
}

func TestVerifySignature_ReplayWithinWindow(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	ts := now.Unix()
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, body, ts)
	// 同一 ts 在窗口内可复用（本方案防重放靠时间窗口，不存 nonce）
	if err := verifySignature(req, body, testDeviceSecret, now); err != nil {
		t.Fatalf("first verify expected ok, got %v", err)
	}
	// 窗口边界：刚超过 10 分钟即拒
	edge := now.Add(-sigMaxSkew - time.Second)
	req2 := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, body, edge.Unix())
	if err := verifySignature(req2, body, testDeviceSecret, now); err != errStaleSig {
		t.Fatalf("expected errStaleSig past window, got %v", err)
	}
}

func TestVerifySignature_TamperedBody(t *testing.T) {
	origBody := []byte(`{"model":"auto","messages":[]}`)
	tamperedBody := []byte(`{"model":"auto","messages":[{"role":"user","content":"hi"}]}`)
	now := time.Now()
	// 用 origBody 签名，但服务端收到的是 tamperedBody → bodySha256 不同 → HMAC 不等
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, origBody, now.Unix())
	if err := verifySignature(req, tamperedBody, testDeviceSecret, now); err != errSigMismatch {
		t.Fatalf("expected errSigMismatch for tampered body, got %v", err)
	}
}

func TestVerifySignature_MissingDeviceSecret(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	req := newSignedRequest(t, http.MethodPost, "/v1/chat/completions", testDeviceSecret, body, now.Unix())
	// device_secret 为空（老 key 无绑定）→ 直接拒绝
	if err := verifySignature(req, body, "", now); err != errMissingDeviceSecret {
		t.Fatalf("expected errMissingDeviceSecret, got %v", err)
	}
}

func TestVerifySignature_MissingHeader(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewReader(body))
	if err := verifySignature(req, body, testDeviceSecret, now); err != errMissingSig {
		t.Fatalf("expected errMissingSig, got %v", err)
	}
}

func TestVerifySignature_BadFormat(t *testing.T) {
	body := []byte(`{"model":"auto"}`)
	now := time.Now()
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set(sigHeader, "garbage-no-equals")
	if err := verifySignature(req, body, testDeviceSecret, now); err != errBadSigFormat {
		t.Fatalf("expected errBadSigFormat, got %v", err)
	}
}

func TestParseSigHeader(t *testing.T) {
	cases := []struct {
		raw string
		ok  bool
		ts  int64
		v1  string
	}{
		{"t=1700000000, v1=abc123", true, 1700000000, "abc123"},
		{"  t=1700000000 , v1 = abc123  ", true, 1700000000, "abc123"}, // 容忍空格
		{"v1=abc123", false, 0, ""},
		{"t=notanint, v1=abc", false, 0, ""},
		{"", false, 0, ""},
	}
	for i, c := range cases {
		ts, v1, ok := parseSigHeader(c.raw)
		if ok != c.ok || ts != c.ts || v1 != c.v1 {
			t.Fatalf("case %d: parseSigHeader(%q) = (%d,%q,%v), want (%d,%q,%v)", i, c.raw, ts, v1, ok, c.ts, c.v1, c.ok)
		}
	}
}

