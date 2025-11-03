package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type CharacterSet struct {
    ID         uuid.UUID   `gorm:"type:uuid;primaryKey" json:"id"`
    UserID   uuid.UUID  `gorm:"type:uuid;not null" json:"userId"`
    Name       string      `gorm:"not null" json:"name"`
    Description string      `json:"description"`
    CoverImage string      `json:"coverImageName"`
    // CoverImageName string      `json:"coverImageName"`
    // CoverImagePath string      `json:"coverImagePath"`
    Public    bool        `gorm:"default:false" json:"public"`
    Characters  []Character `gorm:"foreignKey:SetID;constraint:OnDelete:CASCADE;" json:"characters"`
}

// BeforeCreate generates a UUID before inserting a new CharacterSet
func (cs *CharacterSet) BeforeCreate(tx *gorm.DB) (err error) {
    if cs.ID == uuid.Nil {
        cs.ID = uuid.New()
    }
    return
}
