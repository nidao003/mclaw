package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ExpertUsecase defines the business logic for industry experts.
type ExpertUsecase interface {
	// List returns all published experts ordered by sort_order.
	List(ctx context.Context) (*ListExpertResp, error)
	// GetBySlug returns a single expert by slug.
	GetBySlug(ctx context.Context, slug string) (*ExpertDetail, error)
}

// ExpertRepo defines the data access for experts.
type ExpertRepo interface {
	List(ctx context.Context) ([]*ExpertDetail, error)
	GetBySlug(ctx context.Context, slug string) (*ExpertDetail, error)
}

// --- Domain Models ---

// ExpertDetail represents an expert with full details.
type ExpertDetail struct {
	ID            uuid.UUID `json:"id"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	Subtitle      string    `json:"subtitle"`
	Description   string    `json:"description"`
	Icon          string    `json:"icon"`
	Scenarios     []string  `json:"scenarios"`
	RelatedSkills []string  `json:"related_skills"`
	Status        string    `json:"status"`
	SortOrder     int       `json:"sort_order"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// --- Request/Response Types ---

// ListExpertResp is the expert list response.
type ListExpertResp struct {
	Experts []*ExpertDetail `json:"experts"`
}
