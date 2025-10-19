package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Character struct {
    ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Name   string    `gorm:"not null" json:"name"`
    Image  string    `json:"image"`
    SetID  uuid.UUID `gorm:"not null" json:"set_id"` // foreign key to CharacterSet
}

// BeforeCreate generates a UUID before inserting a new Character
func (c *Character) BeforeCreate(tx *gorm.DB) (err error) {
    if c.ID == uuid.Nil {
        c.ID = uuid.New()
    }
    return
}
