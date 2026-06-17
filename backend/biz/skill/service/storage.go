package service

import (
	"bytes"
	"context"
	"fmt"
	"path"

	"github.com/nidao003/mclaw/backend/pkg/oss"
)

// SkillStorage S3-compatible Skill file storage.
type SkillStorage struct {
	client      *oss.Client
	skillPrefix string
}

// NewSkillStorage creates a Skill storage instance.
func NewSkillStorage(client *oss.Client, skillPrefix string) *SkillStorage {
	if skillPrefix == "" {
		skillPrefix = "skills"
	}
	return &SkillStorage{client: client, skillPrefix: skillPrefix}
}

// SkillPrefixPath generates the S3 prefix for a skill version.
// Format: skills/<slug>/v<version>
func (s *SkillStorage) SkillPrefixPath(slug, version string) string {
	return fmt.Sprintf("%s/%s/v%s", s.skillPrefix, slug, version)
}

// UploadSkillFiles uploads all Skill files to S3.
// For each entry, the S3 key is composed as: <skillPrefix>/<slug>/v<version>/<entry.Path>
// Since oss.Client.PutFile uses path.Base on filename, we split the entry path
// into directory (as part of prefix) and base name (as filename).
func (s *SkillStorage) UploadSkillFiles(ctx context.Context, slug, version string, entries []ZipEntry) error {
	basePrefix := s.SkillPrefixPath(slug, version)
	for _, entry := range entries {
		dir := path.Dir(entry.Path)
		base := path.Base(entry.Path)

		// Build the effective prefix: basePrefix + sub-directory (if any)
		filePrefix := basePrefix
		if dir != "." && dir != "" {
			filePrefix = path.Join(basePrefix, dir)
		}

		if err := s.client.PutFile(ctx, filePrefix, base, bytes.NewReader(entry.Data)); err != nil {
			return fmt.Errorf("failed to upload file %s: %w", entry.Path, err)
		}
	}
	return nil
}
