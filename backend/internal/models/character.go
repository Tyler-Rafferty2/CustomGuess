package models

import (
    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type Character struct {
    ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
    Name       string         `gorm:"not null" json:"name"`
    Attributes datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"attributes"`
}

// BeforeCreate generates a UUID before inserting a new Character
func (c *Character) BeforeCreate(tx *gorm.DB) (err error) {
    if c.ID == uuid.Nil {
        c.ID = uuid.New()
    }
    return
}
