package services

import (
    "errors"
    "fmt"
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
    "golang.org/x/crypto/bcrypt"
)

type UserService struct {
    DB           *gorm.DB
    EmailService *EmailService
    AppBaseURL   string // e.g. "http://localhost:3080"
}

func NewUserService(db *gorm.DB, emailSvc *EmailService, appBaseURL string) *UserService {
    return &UserService{DB: db, EmailService: emailSvc, AppBaseURL: appBaseURL}
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

// ForgotPassword generates a reset token and emails a reset link
func (s *UserService) ForgotPassword(email string) error {
    var user models.User
    if err := s.DB.First(&user, "email = ?", email).Error; err != nil {
        // Don't reveal whether the email exists
        return nil
    }

    token := uuid.New().String()
    expires := time.Now().Add(1 * time.Hour)
    user.ResetToken = token
    user.ResetTokenExpiresAt = &expires

    if err := s.DB.Save(&user).Error; err != nil {
        return err
    }

    resetLink := fmt.Sprintf("%s/password_reset?token=%s", s.AppBaseURL, token)
    return s.EmailService.SendPasswordReset(user.Email, resetLink)
}

// ResetPassword validates the token and updates the password
func (s *UserService) ResetPassword(token, newPassword string) error {
    var user models.User
    if err := s.DB.First(&user, "reset_token = ?", token).Error; err != nil {
        return errors.New("invalid or expired token")
    }

    if user.ResetTokenExpiresAt == nil || time.Now().After(*user.ResetTokenExpiresAt) {
        return errors.New("invalid or expired token")
    }

    hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    user.PasswordHash = string(hashed)
    user.ResetToken = ""
    user.ResetTokenExpiresAt = nil

    return s.DB.Save(&user).Error
}
