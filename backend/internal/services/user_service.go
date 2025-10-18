package services

import (
    "errors"

    "github.com/google/uuid"
    "gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
    "golang.org/x/crypto/bcrypt"
)

type UserService struct {
    DB *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
    return &UserService{DB: db}
}

// SignUp creates a new user
func (s *UserService) SignUp(email, password string) (*models.User, error) {
    // Check if user exists
    var existing models.User
    if err := s.DB.First(&existing, "email = ?", email).Error; err == nil {
        return nil, errors.New("email already registered")
    }

    hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

    user := &models.User{
        Email:        email,
        PasswordHash: string(hashedPassword),
    }

    if err := s.DB.Create(user).Error; err != nil {
        return nil, err
    }

    return user, nil
}

// Authenticate user by email and password
func (s *UserService) Login(email, password string) (*models.User, error) {
    var user models.User
    if err := s.DB.First(&user, "email = ?", email).Error; err != nil {
        return nil, errors.New("invalid credentials")
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        return nil, errors.New("invalid credentials")
    }

    return &user, nil
}

// Get user by ID
func (s *UserService) GetUserByID(id uuid.UUID) (*models.User, error) {
    var user models.User
    if err := s.DB.Preload("Players").First(&user, "id = ?", id).Error; err != nil {
        return nil, err
    }
    return &user, nil
}
