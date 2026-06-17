package domain

import (
	"context"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
)

// BillingUsecase defines the interface for LLM billing operations.
// This interface decouples the LLM proxy from the wallet/subscription modules.
type BillingUsecase interface {
	// CheckModelAccess verifies if a user can access a model with the given access level.
	CheckModelAccess(ctx context.Context, userID uuid.UUID, accessLevel consts.ModelAccessLevel, isFree bool) bool
	// RecordUsageAndDeduct records token usage and deducts from the user's quota/wallet.
	// Returns the remaining balance after deduction, or an error if insufficient.
	RecordUsageAndDeduct(ctx context.Context, userID uuid.UUID, modelName string, inputTokens, outputTokens uint64) error
}
