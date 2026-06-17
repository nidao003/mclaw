package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
)

// NewApiKeyUsecase creates a new ApiKeyUsecase.
func NewApiKeyUsecase(i *do.Injector) (domain.ApiKeyUsecase, error) {
	repo := do.MustInvoke[domain.ApiKeyRepo](i)
	logger := do.MustInvoke[*slog.Logger](i)
	return &apiKeyUsecase{repo: repo, logger: logger}, nil
}

type apiKeyUsecase struct {
	repo   domain.ApiKeyRepo
	logger *slog.Logger
}

func (uc *apiKeyUsecase) Create(ctx context.Context, userID uuid.UUID, req *domain.CreateApiKeyReq) (*domain.CreateApiKeyResp, error) {
	// 生成随机 API key: mclaw_ + 32 hex chars
	raw, err := generateApiKey()
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}

	// SHA-256 hash
	hash := sha256Hash(raw)
	prefix := raw[:16] // "mclaw_xxxxxxxx"

	detail, err := uc.repo.Create(ctx, &domain.CreateApiKeyParams{
		UserID:    userID,
		KeyHash:   hash,
		KeyPrefix: prefix,
		Name:      req.Name,
		ExpiresAt: req.ExpiresAt,
	})
	if err != nil {
		return nil, fmt.Errorf("create key: %w", err)
	}

	return &domain.CreateApiKeyResp{
		Key:    raw,
		Detail: detail,
	}, nil
}

func (uc *apiKeyUsecase) List(ctx context.Context, userID uuid.UUID) ([]*domain.ApiKeyDetail, error) {
	return uc.repo.ListByUser(ctx, userID)
}

func (uc *apiKeyUsecase) Revoke(ctx context.Context, userID, keyID uuid.UUID) error {
	return uc.repo.Revoke(ctx, userID, keyID)
}

func (uc *apiKeyUsecase) Validate(ctx context.Context, rawKey string) (*domain.User, error) {
	hash := sha256Hash(rawKey)

	_, user, err := uc.repo.GetByHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("invalid api key: %w", err)
	}

	return user, nil
}

// generateApiKey creates a random key: "mclaw_" + 32 hex chars
func generateApiKey() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "mclaw_" + hex.EncodeToString(b), nil
}

// sha256Hash returns the hex-encoded SHA-256 hash of s.
func sha256Hash(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
