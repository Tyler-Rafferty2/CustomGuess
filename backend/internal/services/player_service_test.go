package services

import (
    "testing"

    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

func TestValidateCategories_AllValid(t *testing.T) {
    err := validateCategories([]models.Category{models.CategoryAnime, models.CategorySports})
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
}

func TestValidateCategories_RejectsUnknown(t *testing.T) {
    err := validateCategories([]models.Category{models.Category("bogus")})
    if err == nil {
        t.Fatal("expected error for unknown category")
    }
}

func TestValidateCategories_EmptyIsValid(t *testing.T) {
    if err := validateCategories(nil); err != nil {
        t.Fatalf("expected empty categories to be valid, got %v", err)
    }
}

func TestSetListParams_EmptyCategoriesIsZeroValue(t *testing.T) {
    var p SetListParams
    if len(p.Categories) != 0 {
        t.Fatalf("expected zero-value SetListParams to have no categories, got %v", p.Categories)
    }
}

// GetPublicSets must validate params.Categories before touching the DB, so
// that an unknown category value in a public-listing request produces an
// error (surfaced by the handler as 400) instead of silently matching zero
// rows or reaching a nil DB. Since validation runs first, s.DB can stay nil
// here — a bug that let an invalid category slip past validation would
// panic on the nil DB rather than pass silently.
func TestGetPublicSets_RejectsUnknownCategory(t *testing.T) {
    svc := &PlayerService{}
    _, err := svc.GetPublicSets(nil, SetListParams{Categories: []string{"bogus"}})
    if err == nil {
        t.Fatal("expected error for unknown category in public set listing")
    }
}

// dedupeCategories must strip repeated values while preserving first-seen
// order, since CreateSet/UpdateSet insert one SetCategory row per entry into
// a table keyed on (set_id, category) — a duplicate value would otherwise
// violate that composite primary key mid-insert.
func TestDedupeCategories(t *testing.T) {
    in := []models.Category{models.CategoryAnime, models.CategoryAnime, models.CategorySports}
    got := dedupeCategories(in)
    want := []models.Category{models.CategoryAnime, models.CategorySports}
    if len(got) != len(want) {
        t.Fatalf("expected %v, got %v", want, got)
    }
    for i := range want {
        if got[i] != want[i] {
            t.Fatalf("expected %v, got %v", want, got)
        }
    }
}

func TestDedupeCategories_EmptyAndNil(t *testing.T) {
    if got := dedupeCategories(nil); len(got) != 0 {
        t.Fatalf("expected empty slice for nil input, got %v", got)
    }
    if got := dedupeCategories([]models.Category{}); len(got) != 0 {
        t.Fatalf("expected empty slice for empty input, got %v", got)
    }
}

func TestDedupeCategories_NoDuplicatesUnchanged(t *testing.T) {
    in := []models.Category{models.CategorySports, models.CategoryAnime}
    got := dedupeCategories(in)
    if len(got) != 2 || got[0] != models.CategorySports || got[1] != models.CategoryAnime {
        t.Fatalf("expected order preserved, got %v", got)
    }
}
