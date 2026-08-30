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
