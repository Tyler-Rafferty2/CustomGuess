# --------- Build Stage ---------
FROM golang:1.25-alpine AS builder

# Install git for module fetching
RUN apk add --no-cache git

# Set working directory
WORKDIR /backend

# Copy go.mod and go.sum first for caching dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the project
COPY . .

# Build the Go binary
RUN go build -o backend ./server

# --------- Run Stage ---------
FROM alpine:latest

# Create a directory for the app
WORKDIR /backend

# Copy the binary from the builder stage
COPY --from=builder /backend .

# Expose port 8080
EXPOSE 8080

# Run the binary
CMD ["./backend"]
