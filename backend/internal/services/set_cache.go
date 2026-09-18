package services

import (
    "context"
    "encoding/json"
    "time"

    "github.com/google/uuid"
    "github.com/redis/go-redis/v9"
)

const setCacheTTL = 5 * time.Minute
const listCacheTTL = 60 * time.Second

// SetCache caches public character-set responses so repeat views of the same
// gallery/set-picker page skip the DB. Implementations must be safe to leave
// nil — callers treat a nil SetCache as "caching disabled".
type SetCache interface {
    GetSet(setID uuid.UUID) (*CharacterSetResponse, bool)
    SetSet(setID uuid.UUID, resp CharacterSetResponse)
    InvalidateSet(setID uuid.UUID)
    GetList(key string) (*SetListResult, bool)
    SetList(key string, result SetListResult)
}

// RedisSetCache is the production SetCache backed by Redis. It also tracks
// hit/miss counters (stats:cache:hits / stats:cache:misses) that the admin
// stats endpoint reports as a cache hit rate.
type RedisSetCache struct {
    Client *redis.Client
}

func NewRedisSetCache(client *redis.Client) *RedisSetCache {
    return &RedisSetCache{Client: client}
}

func setCacheKey(setID uuid.UUID) string {
    return "set:" + setID.String()
}

func (c *RedisSetCache) GetSet(setID uuid.UUID) (*CharacterSetResponse, bool) {
    ctx := context.Background()
    val, err := c.Client.Get(ctx, setCacheKey(setID)).Result()
    if err != nil {
        c.Client.Incr(ctx, "stats:cache:misses")
        return nil, false
    }
    var resp CharacterSetResponse
    if err := json.Unmarshal([]byte(val), &resp); err != nil {
        c.Client.Incr(ctx, "stats:cache:misses")
        return nil, false
    }
    c.Client.Incr(ctx, "stats:cache:hits")
    return &resp, true
}

func (c *RedisSetCache) SetSet(setID uuid.UUID, resp CharacterSetResponse) {
    data, err := json.Marshal(resp)
    if err != nil {
        return
    }
    c.Client.Set(context.Background(), setCacheKey(setID), data, setCacheTTL)
}

func (c *RedisSetCache) InvalidateSet(setID uuid.UUID) {
    c.Client.Del(context.Background(), setCacheKey(setID))
}

func (c *RedisSetCache) GetList(key string) (*SetListResult, bool) {
    ctx := context.Background()
    val, err := c.Client.Get(ctx, key).Result()
    if err != nil {
        c.Client.Incr(ctx, "stats:cache:misses")
        return nil, false
    }
    var result SetListResult
    if err := json.Unmarshal([]byte(val), &result); err != nil {
        c.Client.Incr(ctx, "stats:cache:misses")
        return nil, false
    }
    c.Client.Incr(ctx, "stats:cache:hits")
    return &result, true
}

func (c *RedisSetCache) SetList(key string, result SetListResult) {
    data, err := json.Marshal(result)
    if err != nil {
        return
    }
    c.Client.Set(context.Background(), key, data, listCacheTTL)
}

// CacheHitRate reads the scoped hit/miss counters and returns hits, misses,
// and hit rate as a fraction (0 when there's no data yet).
func CacheHitRate(client *redis.Client) (hits, misses int64, rate float64) {
    ctx := context.Background()
    hits, _ = client.Get(ctx, "stats:cache:hits").Int64()
    misses, _ = client.Get(ctx, "stats:cache:misses").Int64()
    if hits+misses == 0 {
        return hits, misses, 0
    }
    return hits, misses, float64(hits) / float64(hits+misses)
}
