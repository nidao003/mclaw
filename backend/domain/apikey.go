package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ApiKeyUsecase defines the business logic for API key management.
type ApiKeyUsecase interface {
	// Create generates a new API key and returns it (plaintext only shown once).
	Create(ctx context.Context, userID uuid.UUID, req *CreateApiKeyReq) (*CreateApiKeyResp, error)
	// List returns all active API keys for a user.
	List(ctx context.Context, userID uuid.UUID) ([]*ApiKeyDetail, error)
	// Revoke deactivates an API key.
	Revoke(ctx context.Context, userID, keyID uuid.UUID) error
	// Validate checks an API key and returns the associated user.
	Validate(ctx context.Context, keyHash string) (*User, error)
}

// ApiKeyRepo defines the data access for API keys.
type ApiKeyRepo interface {
	Create(ctx context.Context, key *CreateApiKeyParams) (*ApiKeyDetail, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*ApiKeyDetail, error)
	GetByHash(ctx context.Context, hash string) (*ApiKeyDetail, *User, error)
	Revoke(ctx context.Context, userID, keyID uuid.UUID) error
	UpdateLastUsed(ctx context.Context, keyID uuid.UUID) error
}

// CreateApiKeyParams is the internal params for creating a key.
type CreateApiKeyParams struct {
	UserID    uuid.UUID
	KeyHash   string
	KeyPrefix string
	Name      string
	ExpiresAt *time.Time
}

// ApiKeyDetail represents an API key (hash only, never the plaintext).
type ApiKeyDetail struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	KeyPrefix  string     `json:"key_prefix"`
	Name       string     `json:"name"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	IsActive   bool       `json:"is_active"`
	CreatedAt  time.Time  `json:"created_at"`
}

// CreateApiKeyReq is the request to create a new API key.
type CreateApiKeyReq struct {
	Name      string     `json:"name" validate:"required"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// CreateApiKeyResp returns the newly created key detail + plaintext key.
type CreateApiKeyResp struct {
	Key    string        `json:"key"` // plaintext — only returned once
	Detail *ApiKeyDetail `json:"detail"`
}

// ListApiKeyResp wraps a list of API keys.
type ListApiKeyResp struct {
	Keys []*ApiKeyDetail `json:"keys"`
}
