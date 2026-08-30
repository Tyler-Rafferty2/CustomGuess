// backend/internal/models/setCategory.go
package models

import "github.com/google/uuid"

type Category string

const (
	CategoryAnime               Category = "anime"
	CategoryMoviesTV            Category = "movies_tv"
	CategoryCartoons            Category = "cartoons"
	CategoryVideoGames          Category = "video_games"
	CategorySports              Category = "sports"
	CategoryMusic               Category = "music"
	CategoryCelebrities         Category = "celebrities"
	CategoryFictionalCharacters Category = "fictional_characters"
	CategoryOther               Category = "other"
)

var AllCategories = []Category{
	CategoryAnime,
	CategoryMoviesTV,
	CategoryCartoons,
	CategoryVideoGames,
	CategorySports,
	CategoryMusic,
	CategoryCelebrities,
	CategoryFictionalCharacters,
	CategoryOther,
}

func IsValidCategory(c Category) bool {
	for _, v := range AllCategories {
		if v == c {
			return true
		}
	}
	return false
}

type SetCategory struct {
	SetID    uuid.UUID `gorm:"type:uuid;not null;primaryKey;constraint:OnDelete:CASCADE"`
	Category Category  `gorm:"type:varchar(32);not null;primaryKey"`
}
