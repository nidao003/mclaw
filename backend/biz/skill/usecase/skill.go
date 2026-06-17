package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

type skillUsecase struct {
	skillRepo   domain.SkillRepo
	versionRepo domain.SkillVersionRepo
	reviewRepo  domain.SkillReviewRepo
	ratingRepo  domain.SkillRatingRepo
	log         *zap.Logger
}

// NewSkillUsecase creates a new SkillUsecase instance.
func NewSkillUsecase(i *do.Injector) (domain.SkillUsecase, error) {
	skillRepo := do.MustInvoke[domain.SkillRepo](i)
	versionRepo := do.MustInvoke[domain.SkillVersionRepo](i)
	reviewRepo := do.MustInvoke[domain.SkillReviewRepo](i)
	ratingRepo := do.MustInvoke[domain.SkillRatingRepo](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &skillUsecase{
		skillRepo:   skillRepo,
		versionRepo: versionRepo,
		reviewRepo:  reviewRepo,
		ratingRepo:  ratingRepo,
		log:         logger,
	}, nil
}

// List returns a paginated list of published skills.
func (uc *skillUsecase) List(ctx context.Context, req *domain.ListSkillReq) (*domain.ListSkillResp, error) {
	skills, count, err := uc.skillRepo.List(ctx, req)
	if err != nil {
		return nil, err
	}

	items := make([]*domain.SkillDetail, 0, len(skills))
	for _, s := range skills {
		detail := &domain.SkillDetail{
			ID:           s.ID,
			AuthorID:     s.AuthorID,
			Name:         s.Name,
			SkillID:      s.SkillID,
			Description:  s.Description,
			Categories:   s.Categories,
			Tags:         s.Tags,
			Icon:         s.Icon,
			Status:       s.Status,
			InstallCount: s.InstallCount,
			RatingAvg:    s.RatingAvg,
			RatingCount:  s.RatingCount,
			CreatedAt:    s.CreatedAt,
			UpdatedAt:    s.UpdatedAt,
		}
		// Load versions if available from edges
		if s.Edges.Versions != nil {
			for _, v := range s.Edges.Versions {
				detail.Versions = append(detail.Versions, &domain.SkillVersionDetail{
					ID:        v.ID,
					Version:   v.Version,
					Changelog: v.Changelog,
					CreatedAt: v.CreatedAt,
				})
			}
		}
		items = append(items, detail)
	}

	resp := &domain.ListSkillResp{Skills: items}
	if len(items) > 0 && count >= req.Limit {
		resp.Page = &domain.CursorPage{
			NextCursor: items[len(items)-1].ID.String(),
			HasMore:    true,
		}
	}
	return resp, nil
}

// Get returns a single skill by ID.
func (uc *skillUsecase) Get(ctx context.Context, id uuid.UUID) (*domain.SkillDetail, error) {
	s, err := uc.skillRepo.Get(ctx, id)
	if err != nil {
		return nil, errcode.ErrSkillNotFound
	}

	detail := &domain.SkillDetail{
		ID:           s.ID,
		AuthorID:     s.AuthorID,
		Name:         s.Name,
		SkillID:      s.SkillID,
		Description:  s.Description,
		Categories:   s.Categories,
		Tags:         s.Tags,
		Icon:         s.Icon,
		Content:      s.Content,
		ArgsSchema:   s.ArgsSchema,
		Status:       s.Status,
		InstallCount: s.InstallCount,
		RatingAvg:    s.RatingAvg,
		RatingCount:  s.RatingCount,
		CreatedAt:    s.CreatedAt,
		UpdatedAt:    s.UpdatedAt,
	}

	// Load versions
	if s.Edges.Versions != nil {
		for _, v := range s.Edges.Versions {
			detail.Versions = append(detail.Versions, &domain.SkillVersionDetail{
				ID:        v.ID,
				Version:   v.Version,
				Content:   v.Content,
				Changelog: v.Changelog,
				CreatedAt: v.CreatedAt,
			})
		}
	}

	return detail, nil
}

// Create creates a new skill draft.
func (uc *skillUsecase) Create(ctx context.Context, authorID uuid.UUID, req *domain.CreateSkillReq) (*domain.SkillDetail, error) {
	s, err := uc.skillRepo.Create(ctx, &db.Skill{
		ID:          uuid.New(),
		AuthorID:    authorID,
		Name:        req.Name,
		SkillID:     req.SkillID,
		Description: req.Description,
		Categories:  req.Categories,
		Tags:        req.Tags,
		Icon:        req.Icon,
		Content:     req.Content,
		ArgsSchema:  req.ArgsSchema,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create skill: %w", err)
	}
	return uc.Get(ctx, s.ID)
}

// Update updates an existing skill.
func (uc *skillUsecase) Update(ctx context.Context, id uuid.UUID, authorID uuid.UUID, req *domain.UpdateSkillReq) (*domain.SkillDetail, error) {
	// Verify ownership
	s, err := uc.skillRepo.Get(ctx, id)
	if err != nil {
		return nil, errcode.ErrSkillNotFound
	}
	if s.AuthorID != authorID {
		return nil, errcode.ErrPermision
	}

	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Icon != nil {
		updates["icon"] = *req.Icon
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}

	if err := uc.skillRepo.Update(ctx, id, updates); err != nil {
		return nil, fmt.Errorf("failed to update skill: %w", err)
	}
	return uc.Get(ctx, id)
}

// Delete soft-deletes a skill.
func (uc *skillUsecase) Delete(ctx context.Context, id uuid.UUID, authorID uuid.UUID) error {
	s, err := uc.skillRepo.Get(ctx, id)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.AuthorID != authorID {
		return errcode.ErrPermision
	}
	return uc.skillRepo.Delete(ctx, id)
}

// PublishVersion publishes a new version of a skill.
func (uc *skillUsecase) PublishVersion(ctx context.Context, skillID uuid.UUID, authorID uuid.UUID, req *domain.PublishVersionReq) error {
	s, err := uc.skillRepo.Get(ctx, skillID)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.AuthorID != authorID {
		return errcode.ErrPermision
	}

	_, err = uc.versionRepo.Create(ctx, &db.SkillVersion{
		ID:        uuid.New(),
		SkillID:   skillID,
		Version:   req.Version,
		Content:   req.Content,
		Changelog: req.Changelog,
	})
	if err != nil {
		return errcode.ErrSkillVersionConflict
	}
	return nil
}

// Install atomically increments the install counter for a skill.
// This is a public endpoint that doesn't require ownership — any user can "install" a published skill.
func (uc *skillUsecase) Install(ctx context.Context, skillID uuid.UUID) error {
	skill, err := uc.skillRepo.Get(ctx, skillID)
	if err != nil {
		return err
	}
	// Only count installs for published skills
	if skill.Status != "published" {
		return errcode.ErrSkillNotFound
	}
	return uc.skillRepo.IncrementInstall(ctx, skillID)
}

// Rate adds a rating for a skill.
func (uc *skillUsecase) Rate(ctx context.Context, skillID uuid.UUID, userID uuid.UUID, req *domain.RateSkillReq) error {
	// Check if already rated
	existing, _ := uc.ratingRepo.GetByUserAndSkill(ctx, userID, skillID)
	if existing != nil {
		return errcode.ErrSkillAlreadyRated
	}

	_, err := uc.ratingRepo.Create(ctx, &db.SkillRating{
		ID:      uuid.New(),
		SkillID: skillID,
		UserID:  userID,
		Score:   req.Score,
		Comment: req.Comment,
	})
	if err != nil {
		return fmt.Errorf("failed to create rating: %w", err)
	}

	// Update skill's average rating
	s, err := uc.skillRepo.Get(ctx, skillID)
	if err != nil {
		return nil
	}
	ratings, _ := uc.ratingRepo.ListBySkill(ctx, skillID, 0, 0)
	if len(ratings) > 0 {
		var sum float64
		for _, r := range ratings {
			sum += float64(r.Score)
		}
		avg := sum / float64(len(ratings))
		uc.skillRepo.Update(ctx, skillID, map[string]any{
			"rating_avg":   avg,
			"rating_count": len(ratings),
		})
	}
	_ = s
	return nil
}

// ListRatings returns ratings for a skill.
func (uc *skillUsecase) ListRatings(ctx context.Context, skillID uuid.UUID, req *domain.ListSkillReq) ([]*domain.SkillRating, error) {
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	ratings, err := uc.ratingRepo.ListBySkill(ctx, skillID, limit, 0)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.SkillRating, 0, len(ratings))
	for _, r := range ratings {
		result = append(result, &domain.SkillRating{
			ID:        r.ID,
			SkillID:   r.SkillID,
			UserID:    r.UserID,
			Score:     r.Score,
			Comment:   r.Comment,
			CreatedAt: r.CreatedAt,
		})
	}
	return result, nil
}
