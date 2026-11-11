package services

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/config"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

type fakeStore struct {
	keys []string
	fail bool
}

func (f *fakeStore) DeleteObject(ctx context.Context, key string) error {
	f.keys = append(f.keys, key)
	if f.fail {
		return errors.New("boom")
	}
	return nil
}

func r2URL(name string) string { return config.R2PublicURL + "/" + name }

func TestCleanup_DeletesUnreferenced(t *testing.T) {
	db := openTestDB(t)
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("abc.png")})
	if !reflect.DeepEqual(fs.keys, []string{"abc.png"}) {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_SkipsReferencedByLiveSet(t *testing.T) {
	db := openTestDB(t)
	set := models.CharacterSet{ID: uuid.New(), UserID: uuid.New(), Name: "s"}
	if err := db.Create(&set).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.Character{Name: "c", Image: r2URL("abc.png"), SetID: set.ID}).Error; err != nil {
		t.Fatal(err)
	}
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("abc.png")})
	if len(fs.keys) != 0 {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_IgnoresOrphanCharacters(t *testing.T) {
	db := openTestDB(t)
	if err := db.Create(&models.Character{Name: "c", Image: r2URL("abc.png"), SetID: uuid.New()}).Error; err != nil {
		t.Fatal(err)
	}
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("abc.png")})
	if !reflect.DeepEqual(fs.keys, []string{"abc.png"}) {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_SkipsReferencedCover(t *testing.T) {
	db := openTestDB(t)
	set := models.CharacterSet{ID: uuid.New(), UserID: uuid.New(), Name: "s", CoverImage: r2URL("cover.png")}
	if err := db.Create(&set).Error; err != nil {
		t.Fatal(err)
	}
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("cover.png")})
	if len(fs.keys) != 0 {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_SkipsNonR2URLs(t *testing.T) {
	db := openTestDB(t)
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{"https://example.com/x.png", ""})
	if len(fs.keys) != 0 {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_DedupesURLs(t *testing.T) {
	db := openTestDB(t)
	fs := &fakeStore{}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("abc.png"), r2URL("abc.png")})
	if len(fs.keys) != 1 {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestCleanup_StoreErrorDoesNotPanic(t *testing.T) {
	db := openTestDB(t)
	fs := &fakeStore{fail: true}
	(&ImageCleaner{DB: db, Store: fs}).Cleanup([]string{r2URL("a.png"), r2URL("b.png")})
	if len(fs.keys) != 2 {
		t.Fatalf("expected both keys attempted, got %v", fs.keys)
	}
}

func TestCleanup_NilSafe(t *testing.T) {
	(*ImageCleaner)(nil).Cleanup([]string{r2URL("a.png")})
	(&ImageCleaner{}).Cleanup([]string{r2URL("a.png")})
}

func TestCleanup_NilDBDeletesNothing(t *testing.T) {
	fs := &fakeStore{}
	(&ImageCleaner{Store: fs}).Cleanup([]string{r2URL("a.png")})
	if len(fs.keys) != 0 {
		t.Fatalf("expected no deletes without DB, got %v", fs.keys)
	}
}
