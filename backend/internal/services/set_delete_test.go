package services

import (
	"errors"
	"fmt"
	"sort"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

func seedSetWithChars(t *testing.T, db *gorm.DB, ownerID uuid.UUID, nChars int) (models.CharacterSet, []models.Character) {
	t.Helper()
	set := models.CharacterSet{ID: uuid.New(), UserID: ownerID, Name: "s", CoverImage: r2URL("cover.png")}
	if err := db.Create(&set).Error; err != nil {
		t.Fatal(err)
	}
	chars := make([]models.Character, nChars)
	for i := range chars {
		chars[i] = models.Character{Name: fmt.Sprintf("c%d", i), Image: r2URL(fmt.Sprintf("char%d.png", i)), SetID: set.ID}
		if err := db.Create(&chars[i]).Error; err != nil {
			t.Fatal(err)
		}
	}
	return set, chars
}

func countRows(t *testing.T, db *gorm.DB, table, col string, id uuid.UUID) int64 {
	t.Helper()
	var n int64
	if err := db.Table(table).Where(col+" = ?", id).Count(&n).Error; err != nil {
		t.Fatal(err)
	}
	return n
}

func TestDeleteSetTx_RemovesChildren(t *testing.T) {
	db := openTestDB(t)
	set, _ := seedSetWithChars(t, db, uuid.New(), 6)
	db.Create(&models.SetCategory{SetID: set.ID, Category: models.CategoryMoviesTV})
	db.Create(&models.SetCategory{SetID: set.ID, Category: models.Category("animals")})
	db.Create(&models.SetLike{UserID: uuid.New(), SetID: set.ID})
	db.Create(&models.SetReport{UserID: uuid.New(), SetID: set.ID, Reason: models.ReportReasonOffensive})

	var urls []string
	err := db.Transaction(func(tx *gorm.DB) error {
		var err error
		urls, err = deleteSetTx(tx, []uuid.UUID{set.ID})
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, tbl := range []string{"characters", "set_categories", "set_likes", "set_reports"} {
		if n := countRows(t, db, tbl, "set_id", set.ID); n != 0 {
			t.Errorf("%s has %d rows", tbl, n)
		}
	}
	if n := countRows(t, db, "character_sets", "id", set.ID); n != 0 {
		t.Errorf("character_sets has %d rows", n)
	}
	if len(urls) != 7 {
		t.Fatalf("urls = %v", urls)
	}
}

func TestDeleteSetTx_Empty(t *testing.T) {
	urls, err := deleteSetTx(nil, nil)
	if err != nil || urls != nil {
		t.Fatalf("urls=%v err=%v", urls, err)
	}
}

func TestDeleteSet_CleansImages(t *testing.T) {
	db := openTestDB(t)
	owner := &models.User{ID: uuid.New()}
	set, _ := seedSetWithChars(t, db, owner.ID, 6)
	fs := &fakeStore{}
	svc := &PlayerService{DB: db, Images: &ImageCleaner{DB: db, Store: fs}}
	if err := svc.DeleteSet(owner, set.ID); err != nil {
		t.Fatal(err)
	}
	if len(fs.keys) != 7 {
		t.Fatalf("keys = %v", fs.keys)
	}
	found := false
	for _, k := range fs.keys {
		if k == "cover.png" {
			found = true
		}
	}
	if !found {
		t.Fatalf("cover not deleted: %v", fs.keys)
	}
}

func TestDeleteSet_NotOwner(t *testing.T) {
	db := openTestDB(t)
	set, _ := seedSetWithChars(t, db, uuid.New(), 6)
	fs := &fakeStore{}
	svc := &PlayerService{DB: db, Images: &ImageCleaner{DB: db, Store: fs}}
	if err := svc.DeleteSet(&models.User{ID: uuid.New()}, set.ID); err == nil {
		t.Fatal("expected error")
	}
	if n := countRows(t, db, "character_sets", "id", set.ID); n != 1 {
		t.Fatalf("set rows = %d", n)
	}
	if n := countRows(t, db, "characters", "set_id", set.ID); n != 6 {
		t.Fatalf("character rows = %d", n)
	}
	if len(fs.keys) != 0 {
		t.Fatalf("keys = %v", fs.keys)
	}
}

func TestAdminDeleteSet_Unknown(t *testing.T) {
	db := openTestDB(t)
	svc := &PlayerService{DB: db}
	if err := svc.AdminDeleteSet(uuid.New()); !errors.Is(err, ErrSetNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestUpdateSetImages_ReplacedCoverAndRemovedChar(t *testing.T) {
	db := openTestDB(t)
	owner := &models.User{ID: uuid.New()}
	set, chars := seedSetWithChars(t, db, owner.ID, 7)
	fs := &fakeStore{}
	svc := &PlayerService{DB: db, Images: &ImageCleaner{DB: db, Store: fs}}

	keep := make([]uuid.UUID, 0, 6)
	for _, c := range chars[:6] {
		keep = append(keep, c.ID)
	}
	_, err := svc.UpdateSet(owner, set.ID, "s", "", false, r2URL("newcover.png"), keep, nil, nil, 6, nil)
	if err != nil {
		t.Fatal(err)
	}
	sort.Strings(fs.keys)
	want := []string{"char6.png", "cover.png"}
	if fmt.Sprint(fs.keys) != fmt.Sprint(want) {
		t.Fatalf("keys = %v, want %v", fs.keys, want)
	}
}

func TestUpdateSetImages_AllReplaced(t *testing.T) {
	db := openTestDB(t)
	owner := &models.User{ID: uuid.New()}
	set, _ := seedSetWithChars(t, db, owner.ID, 6)
	fs := &fakeStore{}
	svc := &PlayerService{DB: db, Images: &ImageCleaner{DB: db, Store: fs}}

	newChars := make([]models.Character, 6)
	for i := range newChars {
		newChars[i] = models.Character{Name: fmt.Sprintf("n%d", i), Image: r2URL(fmt.Sprintf("new%d.png", i))}
	}
	_, err := svc.UpdateSet(owner, set.ID, "s", "", false, "", nil, newChars, nil, 6, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(fs.keys) != 6 {
		t.Fatalf("keys = %v", fs.keys)
	}
	for _, k := range fs.keys {
		if k == "cover.png" {
			t.Fatalf("cover should be kept: %v", fs.keys)
		}
	}
}

func TestMakePrivate_PrivatesAndClearsReports(t *testing.T) {
	db := openTestDB(t)
	set, _ := seedSetWithChars(t, db, uuid.New(), 6)
	if err := db.Model(&models.CharacterSet{}).Where("id = ?", set.ID).
		Updates(map[string]interface{}{"public": true, "report_count": 5}).Error; err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		if err := db.Create(&models.SetReport{UserID: uuid.New(), SetID: set.ID, Reason: models.ReportReasonOffensive}).Error; err != nil {
			t.Fatal(err)
		}
	}
	svc := &PlayerService{DB: db}
	if err := svc.AdminMakePrivate(set.ID); err != nil {
		t.Fatal(err)
	}
	var got models.CharacterSet
	if err := db.First(&got, "id = ?", set.ID).Error; err != nil {
		t.Fatal(err)
	}
	if got.Public || got.ReportCount != 0 {
		t.Fatalf("public=%v reportCount=%d", got.Public, got.ReportCount)
	}
	if n := countRows(t, db, "set_reports", "set_id", set.ID); n != 0 {
		t.Fatalf("reports = %d", n)
	}
	if n := countRows(t, db, "characters", "set_id", set.ID); n != 6 {
		t.Fatalf("characters = %d", n)
	}
}

func TestMakePrivate_NoReports(t *testing.T) {
	db := openTestDB(t)
	set, _ := seedSetWithChars(t, db, uuid.New(), 6)
	if err := db.Model(&models.CharacterSet{}).Where("id = ?", set.ID).Update("public", true).Error; err != nil {
		t.Fatal(err)
	}
	svc := &PlayerService{DB: db}
	if err := svc.AdminMakePrivate(set.ID); err != nil {
		t.Fatal(err)
	}
	var got models.CharacterSet
	if err := db.First(&got, "id = ?", set.ID).Error; err != nil {
		t.Fatal(err)
	}
	if got.Public {
		t.Fatal("expected private")
	}
}

func TestMakePrivate_UnknownSet(t *testing.T) {
	db := openTestDB(t)
	svc := &PlayerService{DB: db}
	if err := svc.AdminMakePrivate(uuid.New()); !errors.Is(err, ErrSetNotFound) {
		t.Fatalf("err = %v", err)
	}
}
