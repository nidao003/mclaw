package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/userapikey"
	"github.com/nidao003/mclaw/backend/domain"
)

// NewApiKeyRepo creates a new ApiKeyRepo.
func NewApiKeyRepo(i *do.Injector) (domain.ApiKeyRepo, error) {
	client := do.MustInvoke[*db.Client](i)
	return &apiKeyRepo{client: client}, nil
}

type apiKeyRepo struct {
	client *db.Client
}

func (r *apiKeyRepo) Create(ctx context.Context, params *domain.CreateApiKeyParams) (*domain.ApiKeyDetail, error) {
	q := r.client.UserApiKey.Create().
		SetID(uuid.New()).
		SetUserID(params.UserID).
		SetKeyHash(params.KeyHash).
		SetKeyPrefix(params.KeyPrefix).
		SetName(params.Name)
	if params.ExpiresAt != nil {
		q.SetExpiresAt(*params.ExpiresAt)
	}
	key, err := q.Save(ctx)
	if err != nil {
		return nil, err
	}
	return toApiKeyDetail(key), nil
}

func (r *apiKeyRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.ApiKeyDetail, error) {
	keys, err := r.client.UserApiKey.Query().
		Where(userapikey.UserIDEQ(userID), userapikey.IsActive(true)).
		Order(db.Desc(userapikey.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]*domain.ApiKeyDetail, len(keys))
	for i, k := range keys {
		result[i] = toApiKeyDetail(k)
	}
	return result, nil
}

func (r *apiKeyRepo) GetByHash(ctx context.Context, hash string) (*domain.ApiKeyDetail, *domain.User, error) {
	key, err := r.client.UserApiKey.Query().
		Where(userapikey.KeyHash(hash), userapikey.IsActive(true)).
		WithUser().
		First(ctx)
	if err != nil {
		return nil, nil, err
	}
	if key.Edges.User == nil {
		return nil, nil, fmt.Errorf("user not found for api key")
	}
	return toApiKeyDetail(key), &domain.User{
		ID:    key.Edges.User.ID,
		Email: key.Edges.User.Email,
		Name:  key.Edges.User.Name,
		Role:  key.Edges.User.Role,
	}, nil
}

func (r *apiKeyRepo) Revoke(ctx context.Context, userID, keyID uuid.UUID) error {
	return r.client.UserApiKey.UpdateOneID(keyID).
		Where(userapikey.UserIDEQ(userID)).
		SetIsActive(false).
		Exec(ctx)
}

func (r *apiKeyRepo) UpdateLastUsed(ctx context.Context, keyID uuid.UUID) error {
	return r.client.UserApiKey.UpdateOneID(keyID).
		SetLastUsedAt(time.Now()).
		Exec(ctx)
}

func toApiKeyDetail(k *db.UserApiKey) *domain.ApiKeyDetail {
	d := &domain.ApiKeyDetail{
		ID:        k.ID,
		UserID:    k.UserID,
		KeyPrefix: k.KeyPrefix,
		Name:      k.Name,
		IsActive:  k.IsActive,
		CreatedAt: k.CreatedAt,
	}
	if !k.LastUsedAt.IsZero() {
		d.LastUsedAt = &k.LastUsedAt
	}
	if !k.ExpiresAt.IsZero() {
		d.ExpiresAt = &k.ExpiresAt
	}
	return d
}
