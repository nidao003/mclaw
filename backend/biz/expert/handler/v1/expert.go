package v1

import (
	"log/slog"

	"github.com/GoYoko/web"
	"github.com/samber/do"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

// ExpertHandler handles expert API endpoints.
type ExpertHandler struct {
	expertUsecase domain.ExpertUsecase
	logger        *slog.Logger
}

// NewExpertHandler creates and registers expert route handlers.
func NewExpertHandler(i *do.Injector) (*ExpertHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	expertUC := do.MustInvoke[domain.ExpertUsecase](i)

	h := &ExpertHandler{
		expertUsecase: expertUC,
		logger:        logger.With("module", "expert.handler"),
	}

	// Public expert browsing
	w.GET("/api/v1/experts", web.BaseHandler(h.ListExperts))
	w.GET("/api/v1/experts/:slug", web.BaseHandler(h.GetExpertBySlug))

	return h, nil
}

// ListExperts returns all published experts.
func (h *ExpertHandler) ListExperts(c *web.Context) error {
	resp, err := h.expertUsecase.List(c.Request().Context())
	if err != nil {
		return errcode.ErrInternalServer
	}
	return c.Success(resp)
}

// GetExpertBySlug returns a single expert by slug.
func (h *ExpertHandler) GetExpertBySlug(c *web.Context) error {
	slug := c.Param("slug")
	if slug == "" {
		return errcode.ErrBadRequest
	}

	expert, err := h.expertUsecase.GetBySlug(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrExpertNotFound
	}
	return c.Success(expert)
}
