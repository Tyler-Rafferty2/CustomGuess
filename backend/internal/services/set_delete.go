package services

import (
	"errors"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

// ErrSetNotFound is returned when a set does not exist.
var ErrSetNotFound = errors.New("set not found")

// deleteSetTx collects the cover and character image URLs for the given sets, then deletes
// their characters, categories, likes, reports and the sets themselves. An empty slice is a no-op.
func deleteSetTx(tx *gorm.DB, setIDs []uuid.UUID) ([]string, error) {
	if len(setIDs) == 0 {
		return nil, nil
	}

	var urls []string
	var covers []string
	if err := tx.Model(&models.CharacterSet{}).Where("id IN ? AND cover_image <> ''", setIDs).Pluck("cover_image", &covers).Error; err != nil {
		return nil, err
	}
	urls = append(urls, covers...)
	var images []string
	if err := tx.Model(&models.Character{}).Where("set_id IN ? AND image <> ''", setIDs).Pluck("image", &images).Error; err != nil {
		return nil, err
	}
	urls = append(urls, images...)

	if err := tx.Where("set_id IN ?", setIDs).Delete(&models.Character{}).Error; err != nil {
		return nil, err
	}
	if err := tx.Where("set_id IN ?", setIDs).Delete(&models.SetCategory{}).Error; err != nil {
		return nil, err
	}
	if err := tx.Where("set_id IN ?", setIDs).Delete(&models.SetLike{}).Error; err != nil {
		return nil, err
	}
	if err := tx.Where("set_id IN ?", setIDs).Delete(&models.SetReport{}).Error; err != nil {
		return nil, err
	}
	if err := tx.Where("id IN ?", setIDs).Delete(&models.CharacterSet{}).Error; err != nil {
		return nil, err
	}
	return urls, nil
}

// AdminDeleteSet deletes a set regardless of owner, including child rows and unused R2 images.
func (s *PlayerService) AdminDeleteSet(setID uuid.UUID) error {
	var urls []string
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.CharacterSet{}).Where("id = ?", setID).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return ErrSetNotFound
		}
		var err error
		urls, err = deleteSetTx(tx, []uuid.UUID{setID})
		return err
	})
	if err != nil {
		return err
	}
	s.Images.Cleanup(urls)
	if s.Cache != nil {
		s.Cache.InvalidateSet(setID)
	}
	return nil
}

// AdminMakePrivate sets a set private and clears its report count and reports.
func (s *PlayerService) AdminMakePrivate(setID uuid.UUID) error {
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&models.CharacterSet{}).Where("id = ?", setID).
			Updates(map[string]interface{}{"public": false, "report_count": 0})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrSetNotFound
		}
		return tx.Where("set_id = ?", setID).Delete(&models.SetReport{}).Error
	})
	if err != nil {
		return err
	}
	if s.Cache != nil {
		s.Cache.InvalidateSet(setID)
	}
	return nil
}

// AdminGetSet returns a set with its characters regardless of visibility.
func (s *PlayerService) AdminGetSet(setID uuid.UUID) (*models.CharacterSet, error) {
	var set models.CharacterSet
	if err := s.DB.Preload("Characters").First(&set, "id = ?", setID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSetNotFound
		}
		return nil, err
	}
	return &set, nil
}
