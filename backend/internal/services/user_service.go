package services

type UserService struct {}

func (s *UserService) GetUserByID(id string) string {
    // Real business logic would go here
    return "User-" + id
}
