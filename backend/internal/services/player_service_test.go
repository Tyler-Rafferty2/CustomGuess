package services

import (
    "testing"

    "github.com/google/uuid"
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

// fakeSetCache is an in-memory SetCache used to test PlayerService's cache
// interactions without a real Redis instance.
type fakeSetCache struct {
    data            map[uuid.UUID]CharacterSetResponse
    getCalls        int
    setCalls        int
    invalidateCalls int
    listData        map[string]SetListResult
    getListCalls    int
    setListCalls    int
}

func (f *fakeSetCache) GetSet(setID uuid.UUID) (*CharacterSetResponse, bool) {
    f.getCalls++
    resp, ok := f.data[setID]
    if !ok {
        return nil, false
    }
    return &resp, true
}

func (f *fakeSetCache) SetSet(setID uuid.UUID, resp CharacterSetResponse) {
    f.setCalls++
    if f.data == nil {
        f.data = map[uuid.UUID]CharacterSetResponse{}
    }
    f.data[setID] = resp
}

func (f *fakeSetCache) InvalidateSet(setID uuid.UUID) {
    f.invalidateCalls++
    delete(f.data, setID)
}

func (f *fakeSetCache) GetList(key string) (*SetListResult, bool) {
    f.getListCalls++
    result, ok := f.listData[key]
    if !ok {
        return nil, false
    }
    return &result, true
}

func (f *fakeSetCache) SetList(key string, result SetListResult) {
    f.setListCalls++
    if f.listData == nil {
        f.listData = map[string]SetListResult{}
    }
    f.listData[key] = result
}

// GetPublicSetByID must serve a cache hit without touching the DB — s.DB is
// left nil here, so any query would panic and fail the test.
func TestGetPublicSetByID_CacheHit_SkipsDatabase(t *testing.T) {
    setID := uuid.New()
    cache := &fakeSetCache{data: map[uuid.UUID]CharacterSetResponse{
        setID: {CharacterSet: models.CharacterSet{ID: setID, Name: "Cached Set", Public: true}, LikeCount: 5},
    }}
    svc := &PlayerService{Cache: cache}

    result, err := svc.GetPublicSetByID(nil, setID)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if result.Name != "Cached Set" || result.LikeCount != 5 {
        t.Fatalf("expected cached data to be returned, got %+v", result)
    }
    if cache.getCalls != 1 {
        t.Fatalf("expected exactly one cache lookup, got %d", cache.getCalls)
    }
}

// getCachedPublicSet must not report a hit when no cache is configured, so
// PlayerService falls through to the DB in deployments without Redis.
func TestGetCachedPublicSet_NilCacheIsMiss(t *testing.T) {
    svc := &PlayerService{}
    _, ok := svc.getCachedPublicSet(uuid.New())
    if ok {
        t.Fatal("expected miss when no cache configured")
    }
}

// A stored entry's LikedByMe must never leak from one caller's session into
// another's response, since the cache is shared across all viewers.
func TestGetCachedPublicSet_StripsAnyStoredLikedByMe(t *testing.T) {
    setID := uuid.New()
    cache := &fakeSetCache{data: map[uuid.UUID]CharacterSetResponse{
        setID: {CharacterSet: models.CharacterSet{ID: setID, Public: true}, LikedByMe: true},
    }}
    svc := &PlayerService{Cache: cache}

    resp, ok := svc.getCachedPublicSet(setID)
    if !ok {
        t.Fatal("expected cache hit")
    }
    if resp.LikedByMe {
        t.Fatal("expected LikedByMe to be stripped on read")
    }
}

// A private set fetched via the owner-preview path must never be cached,
// since the cache has no per-viewer access check on hit.
func TestCachePublicSet_SkipsCachingPrivateSets(t *testing.T) {
    setID := uuid.New()
    cache := &fakeSetCache{}
    svc := &PlayerService{Cache: cache}

    svc.cachePublicSet(setID, CharacterSetResponse{CharacterSet: models.CharacterSet{ID: setID, Public: false}})

    if cache.setCalls != 0 {
        t.Fatalf("expected private set not to be cached, got %d SetSet calls", cache.setCalls)
    }
}

func TestCachePublicSet_StripsLikedByMeBeforeCaching(t *testing.T) {
    setID := uuid.New()
    cache := &fakeSetCache{}
    svc := &PlayerService{Cache: cache}

    svc.cachePublicSet(setID, CharacterSetResponse{CharacterSet: models.CharacterSet{ID: setID, Public: true}, LikedByMe: true})

    cached, ok := cache.data[setID]
    if !ok {
        t.Fatal("expected set to be cached")
    }
    if cached.LikedByMe {
        t.Fatal("expected cached entry to not carry a specific caller's like status")
    }
}

// Category order must not affect the cache key, since callers can submit
// categories in any order for the same logical query.
func TestBuildListCacheKey_CategoriesOrderIndependent(t *testing.T) {
    a := buildListCacheKey(SetListParams{Page: 1, PageSize: 12, Sort: "newest", Categories: []string{"anime", "sports"}})
    b := buildListCacheKey(SetListParams{Page: 1, PageSize: 12, Sort: "newest", Categories: []string{"sports", "anime"}})
    if a != b {
        t.Fatalf("expected order-independent keys, got %q and %q", a, b)
    }
}

func TestBuildListCacheKey_DifferentParamsDifferentKeys(t *testing.T) {
    a := buildListCacheKey(SetListParams{Page: 1, PageSize: 12, Sort: "newest"})
    b := buildListCacheKey(SetListParams{Page: 2, PageSize: 12, Sort: "newest"})
    if a == b {
        t.Fatalf("expected different pages to produce different keys, got %q for both", a)
    }
}

// sort=liked returns a caller-specific set of results (only sets that caller
// liked), not a shared public page, so it must never be cached.
func TestIsListCacheable_ExcludesLikedSort(t *testing.T) {
    if isListCacheable(SetListParams{Sort: "liked"}) {
        t.Fatal("expected sort=liked to be uncacheable")
    }
}

// A search term produces near-unique keys that would only ever be read once,
// so caching them just wastes Redis memory.
func TestIsListCacheable_ExcludesSearch(t *testing.T) {
    if isListCacheable(SetListParams{Sort: "most-popular", Search: "dragons"}) {
        t.Fatal("expected a search query to be uncacheable")
    }
}

func TestIsListCacheable_AllowsDefaultListing(t *testing.T) {
    if !isListCacheable(SetListParams{Sort: "most-popular"}) {
        t.Fatal("expected the default listing to be cacheable")
    }
}

// GetPublicSets must serve a cache hit without touching the DB — s.DB is
// left nil here, so any query would panic and fail the test.
func TestGetPublicSets_CacheHit_SkipsDatabase(t *testing.T) {
    params := SetListParams{Page: 1, PageSize: 12, Sort: "most-popular"}
    key := buildListCacheKey(params)
    cache := &fakeSetCache{listData: map[string]SetListResult{
        key: {Sets: []CharacterSetResponse{{CharacterSet: models.CharacterSet{Name: "Cached Set"}}}, Total: 1},
    }}
    svc := &PlayerService{Cache: cache}

    result, err := svc.GetPublicSets(nil, params)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if result.Total != 1 || len(result.Sets) != 1 || result.Sets[0].Name != "Cached Set" {
        t.Fatalf("expected cached data to be returned, got %+v", result)
    }
    if cache.getListCalls != 1 {
        t.Fatalf("expected exactly one cache lookup, got %d", cache.getListCalls)
    }
}

func TestCacheList_SkipsUncacheableParams(t *testing.T) {
    cache := &fakeSetCache{}
    svc := &PlayerService{Cache: cache}

    svc.cacheList(SetListParams{Sort: "liked"}, SetListResult{Total: 1})
    svc.cacheList(SetListParams{Sort: "most-popular", Search: "dragons"}, SetListResult{Total: 1})

    if cache.setListCalls != 0 {
        t.Fatalf("expected uncacheable params to skip caching, got %d SetList calls", cache.setListCalls)
    }
}

func TestCacheList_StripsLikedByMeBeforeCaching(t *testing.T) {
    cache := &fakeSetCache{}
    svc := &PlayerService{Cache: cache}
    params := SetListParams{Sort: "most-popular"}

    svc.cacheList(params, SetListResult{Sets: []CharacterSetResponse{{LikedByMe: true}}, Total: 1})

    cached, ok := cache.listData[buildListCacheKey(params)]
    if !ok {
        t.Fatal("expected list to be cached")
    }
    if cached.Sets[0].LikedByMe {
        t.Fatal("expected cached entries to not carry a specific caller's like status")
    }
}

func TestGetCachedList_StripsAnyStoredLikedByMe(t *testing.T) {
    params := SetListParams{Sort: "most-popular"}
    key := buildListCacheKey(params)
    cache := &fakeSetCache{listData: map[string]SetListResult{
        key: {Sets: []CharacterSetResponse{{LikedByMe: true}}, Total: 1},
    }}
    svc := &PlayerService{Cache: cache}

    result, ok := svc.getCachedList(params)
    if !ok {
        t.Fatal("expected cache hit")
    }
    if result.Sets[0].LikedByMe {
        t.Fatal("expected LikedByMe to be stripped on read")
    }
}
