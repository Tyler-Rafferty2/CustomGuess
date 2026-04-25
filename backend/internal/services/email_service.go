package services

import "github.com/resend/resend-go/v2"

type EmailService struct {
	client *resend.Client
	from   string
}

func NewEmailService(apiKey string) *EmailService {
	return &EmailService{
		client: resend.NewClient(apiKey),
		from:   "onboarding@resend.dev",
	}
}

func (s *EmailService) SendContactEmail(fromName, fromEmail, subject, message string) error {
	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{"tjraff5@gmail.com"},
		ReplyTo: fromEmail,
		Subject: "[Contact] " + subject,
		Html: `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F7F3EE; border-radius: 6px;">
			<h1 style="font-family: Fraunces, serif; color: #1A1510; font-size: 24px; margin-bottom: 8px;">New Contact Message</h1>
			<p style="color: #5C5047; margin-bottom: 4px;"><strong>From:</strong> ` + fromName + ` &lt;` + fromEmail + `&gt;</p>
			<p style="color: #5C5047; margin-bottom: 16px;"><strong>Subject:</strong> ` + subject + `</p>
			<div style="background: #fff; border: 1px solid #DDD5CA; border-radius: 6px; padding: 16px; color: #1A1510; line-height: 1.6; white-space: pre-wrap;">` + message + `</div>
		</div>`,
	})
	return err
}

func (s *EmailService) SendPasswordReset(to, resetLink string) error {
	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: "Reset your GuessWho password",
		Html: `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F7F3EE; border-radius: 6px;">
			<h1 style="font-family: Fraunces, serif; color: #1A1612; font-size: 28px; margin-bottom: 8px;">Password Reset</h1>
			<p style="color: #5C4F43; margin-bottom: 24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
			<a href="` + resetLink + `" style="display: inline-block; background: #D9572B; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
			<p style="color: #9E8E82; font-size: 13px; margin-top: 24px;">If you didn't request this, you can ignore this email.</p>
		</div>`,
	})
	return err
}
