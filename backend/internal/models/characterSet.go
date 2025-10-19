package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type CharacterSet struct {
    ID         uuid.UUID   `gorm:"type:uuid;primaryKey" json:"id"`
    Name       string      `gorm:"not null" json:"name"`
    Characters []Character `gorm:"foreignKey:SetID" json:"characters"`
}

// BeforeCreate generates a UUID before inserting a new CharacterSet
func (cs *CharacterSet) BeforeCreate(tx *gorm.DB) (err error) {
    if cs.ID == uuid.Nil {
        cs.ID = uuid.New()
    }
    return
}
