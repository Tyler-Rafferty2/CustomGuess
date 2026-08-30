// backend/internal/models/setCategory_test.go
package models

import "testing"

func TestIsValidCategory(t *testing.T) {
	if !IsValidCategory(CategoryAnime) {
		t.Fatal("expected anime to be valid")
	}
	if IsValidCategory(Category("not-a-real-category")) {
		t.Fatal("expected unknown category to be invalid")
	}
}
