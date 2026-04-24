package models

import (
	"time"

	"github.com/google/uuid"
)

type ReportReason string

const (
	ReportReasonOffensive ReportReason = "offensive"
	ReportReasonCopyright ReportReason = "copyright"
	ReportReasonImages    ReportReason = "inappropriate_images"
	ReportReasonSpam      ReportReason = "spam"
)

type SetReport struct {
	UserID    uuid.UUID    `gorm:"type:uuid;not null;primaryKey"`
	SetID     uuid.UUID    `gorm:"type:uuid;not null;primaryKey;constraint:OnDelete:CASCADE"`
	Reason    ReportReason `gorm:"type:varchar(32);not null"`
	CreatedAt time.Time    `gorm:"autoCreateTime"`
}
