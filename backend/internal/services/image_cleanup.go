package services

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/tyler-rafferty2/GuessWho/internal/config"
	"gorm.io/gorm"
)

// ObjectDeleter deletes a single object from object storage by key.
type ObjectDeleter interface {
	DeleteObject(ctx context.Context, key string) error
}

// ImageCleaner removes R2 images that are no longer referenced by any set or character.
type ImageCleaner struct {
	DB    *gorm.DB
	Store ObjectDeleter
	Async bool
}

// Cleanup deletes the given image URLs from R2 unless a live set or character still uses them.
// Failures are logged and never returned.
func (c *ImageCleaner) Cleanup(urls []string) {
	if c == nil || c.Store == nil {
		return
	}
	if c.Async {
		go c.cleanup(urls)
		return
	}
	c.cleanup(urls)
}

func (c *ImageCleaner) cleanup(urls []string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("image cleanup panic: %v", r)
		}
	}()

	prefix := config.R2PublicURL + "/"
	seen := map[string]bool{}
	var candidates []string
	for _, u := range urls {
		if !strings.HasPrefix(u, prefix) || len(u) == len(prefix) || seen[u] {
			continue
		}
		seen[u] = true
		candidates = append(candidates, u)
	}
	if len(candidates) == 0 {
		return
	}

	inUse := map[string]bool{}
	if c.DB != nil {
		var covers []string
		if err := c.DB.Table("character_sets").Where("cover_image IN ?", candidates).Pluck("cover_image", &covers).Error; err != nil {
			log.Printf("image cleanup: cover lookup failed, skipping cleanup: %v", err)
			return
		}
		for _, u := range covers {
			inUse[u] = true
		}
		var images []string
		if err := c.DB.Table("characters").
			Joins("JOIN character_sets ON character_sets.id = characters.set_id").
			Where("characters.image IN ?", candidates).
			Pluck("characters.image", &images).Error; err != nil {
			log.Printf("image cleanup: character lookup failed, skipping cleanup: %v", err)
			return
		}
		for _, u := range images {
			inUse[u] = true
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	for _, u := range candidates {
		if inUse[u] {
			continue
		}
		key := strings.TrimPrefix(u, prefix)
		if err := c.Store.DeleteObject(ctx, key); err != nil {
			log.Printf("image cleanup: failed to delete %s: %v", key, err)
		}
	}
}
