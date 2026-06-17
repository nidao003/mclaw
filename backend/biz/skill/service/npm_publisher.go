package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
)

// NpmPublishConfig npm publish configuration.
type NpmPublishConfig struct {
	Token    string // npm access token
	Registry string // npm registry URL (default https://registry.npmjs.org)
	TempDir  string // temporary build directory
}

// NpmPublisher publishes reviewed Skills to npm.
type NpmPublisher struct {
	config NpmPublishConfig
	logger *slog.Logger
}

// NewNpmPublisher creates an npm publisher.
func NewNpmPublisher(cfg NpmPublishConfig, logger *slog.Logger) *NpmPublisher {
	if cfg.Registry == "" {
		cfg.Registry = "https://registry.npmjs.org"
	}
	if cfg.TempDir == "" {
		cfg.TempDir = os.TempDir()
	}
	return &NpmPublisher{config: cfg, logger: logger.With("module", "npm.publisher")}
}

// PackageJSON npm package.json template data.
type PackageJSON struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description"`
	Main        string            `json:"main"`
	Files       []string          `json:"files"`
	Keywords    []string          `json:"keywords"`
	License     string            `json:"license"`
	Mclaw       map[string]string `json:"mclaw"`
}

// Publish publishes a Skill to npm.
// scope: "@mclaw-skill" (official) or "@mclaw-community" (third_party)
func (p *NpmPublisher) Publish(ctx context.Context, skillName, slug, version, summary, scope string, tags []string) error {
	p.logger.Info("starting npm publish", "slug", slug, "version", version)

	// 1. Build temp directory
	buildDir := filepath.Join(p.config.TempDir, fmt.Sprintf("npm-%s-%s", slug, version))
	if err := os.MkdirAll(buildDir, 0755); err != nil {
		return fmt.Errorf("failed to create build directory: %w", err)
	}
	defer os.RemoveAll(buildDir)

	// 2. Generate package.json
	pkgName := fmt.Sprintf("%s/%s", scope, slug)
	pkg := PackageJSON{
		Name:        pkgName,
		Version:     version,
		Description: summary,
		Main:        "SKILL.md",
		Files:       []string{"SKILL.md", "files/**"},
		Keywords:    append([]string{"mclaw-skill"}, tags...),
		License:     "MIT",
		Mclaw: map[string]string{
			"slug":        slug,
			"source_type": scopeToSourceType(scope),
		},
	}

	pkgData, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal package.json: %w", err)
	}
	if err := os.WriteFile(filepath.Join(buildDir, "package.json"), pkgData, 0644); err != nil {
		return fmt.Errorf("failed to write package.json: %w", err)
	}

	// 3. Write .npmrc with token
	npmrcContent := fmt.Sprintf("//registry.npmjs.org/:_authToken=%s\n", p.config.Token)
	os.WriteFile(filepath.Join(buildDir, ".npmrc"), []byte(npmrcContent), 0600)

	// 4. Execute npm publish
	cmd := exec.CommandContext(ctx, "npm", "publish", "--access", "public")
	cmd.Dir = buildDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		p.logger.Error("npm publish failed",
			"slug", slug,
			"version", version,
			"output", string(output),
			"error", err,
		)
		return fmt.Errorf("npm publish failed: %w\n%s", err, string(output))
	}

	p.logger.Info("npm publish succeeded", "slug", slug, "version", version)
	return nil
}

func scopeToSourceType(scope string) string {
	if scope == "@mclaw-community" {
		return "third_party"
	}
	return "official"
}
