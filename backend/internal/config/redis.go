package config

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

var Redis *redis.Client

func ConnectRedis() {
    host := getEnv("REDIS_HOST", "redis")
    port := getEnv("REDIS_PORT", "6379")

    Redis = redis.NewClient(&redis.Options{
        Addr: fmt.Sprintf("%s:%s", host, port),
    })

    if err := Redis.Ping(context.Background()).Err(); err != nil {
        log.Println("Warning: Redis unavailable, caching disabled:", err)
        Redis = nil
    }
}
