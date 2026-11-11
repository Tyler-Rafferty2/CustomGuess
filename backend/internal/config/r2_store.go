package config

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Store deletes objects from the R2 bucket via the shared R2Client.
type R2Store struct{}

func (R2Store) DeleteObject(ctx context.Context, key string) error {
	_, err := R2Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(R2Bucket),
		Key:    aws.String(key),
	})
	return err
}
