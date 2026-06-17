package service

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

const (
	MaxFileCount  = 200
	MaxTotalSize  = 10 << 20  // 10MB
	MaxSingleSize = 100 << 20 // 100MB
	MaxPathDepth  = 5
)

// allowedExtensions whitelist for Skill attachment files.
var allowedExtensions = map[string]bool{
	// Docs
	".md": true, ".txt": true, ".rst": true,
	// Python
	".py": true, ".pyw": true, ".toml": true, ".cfg": true, ".ini": true,
	// JavaScript
	".js": true, ".ts": true, ".mjs": true, ".cjs": true,
	// Data
	".json": true, ".yaml": true, ".yml": true, ".csv": true,
	// Shell
	".sh": true, ".bash": true, ".zsh": true,
	// Web
	".html": true, ".css": true,
	// Images
	".png": true, ".jpg": true, ".svg": true, ".gif": true,
	// Archives
	".tar": true, ".gz": true,
}

// bannedExtensions forbidden file types.
var bannedExtensions = map[string]bool{
	".exe": true, ".dll": true, ".so": true, ".dylib": true,
	".com": true, ".bat": true, ".cmd": true, ".msi": true,
}

var slugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$`)

// ZipEntry one file entry in a ZIP package.
type ZipEntry struct {
	Path string
	Data []byte
	Size int64
}

// ZipResult ZIP processing result.
type ZipResult struct {
	Entries   []ZipEntry
	SkillMd   []byte
	FileCount int
	TotalSize int64
}

// ProcessSkillZip validates and extracts a Skill ZIP package.
func ProcessSkillZip(ctx context.Context, zipData []byte) (*ZipResult, error) {
	log := slog.With("module", "skill.zip")

	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return nil, fmt.Errorf("invalid ZIP file: %w", err)
	}

	result := &ZipResult{}
	hasSkillMd := false
	var totalSize int64

	for _, f := range reader.File {
		if f.FileInfo().IsDir() {
			continue
		}

		name := filepath.ToSlash(f.Name)

		// Skip hidden files
		base := path.Base(name)
		if strings.HasPrefix(base, ".") {
			log.Warn("skip hidden file", "name", name)
			continue
		}

		// Check banned extensions
		ext := strings.ToLower(path.Ext(name))
		if bannedExtensions[ext] {
			return nil, fmt.Errorf("banned file type: %s (%s)", name, ext)
		}

		// Check whitelist
		if !allowedExtensions[ext] {
			return nil, fmt.Errorf("unsupported file type: %s (%s)", name, ext)
		}

		// File count limit
		result.FileCount++
		if result.FileCount > MaxFileCount {
			return nil, fmt.Errorf("file count exceeds limit %d", MaxFileCount)
		}

		// Single file size limit
		if f.UncompressedSize64 > MaxSingleSize {
			return nil, fmt.Errorf("file %s size exceeds limit (%.1fMB)", name, float64(f.UncompressedSize64)/(1<<20))
		}

		// Path depth limit
		depth := len(strings.Split(name, "/"))
		if depth > MaxPathDepth {
			return nil, fmt.Errorf("file %s path depth exceeds limit %d", name, MaxPathDepth)
		}

		// Read file content
		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %w", name, err)
		}
		data, err := io.ReadAll(io.LimitReader(rc, MaxSingleSize+1))
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %w", name, err)
		}

		totalSize += int64(len(data))
		if totalSize > MaxTotalSize {
			return nil, fmt.Errorf("total size exceeds limit %dMB", MaxTotalSize/(1<<20))
		}

		entry := ZipEntry{Path: name, Data: data, Size: int64(len(data))}
		result.Entries = append(result.Entries, entry)

		if name == "SKILL.md" {
			result.SkillMd = data
			hasSkillMd = true
		}
	}

	if !hasSkillMd {
		return nil, fmt.Errorf("ZIP must contain SKILL.md in root directory")
	}

	result.TotalSize = totalSize
	return result, nil
}

// ValidateSlug validates skill slug format.
func ValidateSlug(slug string) error {
	if !slugPattern.MatchString(slug) {
		return fmt.Errorf("invalid slug: only lowercase letters, digits, and hyphens allowed; must start and end with letter or digit")
	}
	return nil
}
