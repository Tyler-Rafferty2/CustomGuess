package config

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var R2Client *s3.Client

const R2Bucket = "customguess"
const R2PublicURL = "https://pub-a01e9040276b4109961d7afc1ba917a8.r2.dev"

func InitR2() {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")

	endpoint := "https://" + accountID + ".r2.cloudflarestorage.com"

	R2Client = s3.NewFromConfig(aws.Config{
		Region: "auto",
		Credentials: credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		BaseEndpoint: aws.String(endpoint),
	}, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	_ = context.Background() // satisfy import
}
