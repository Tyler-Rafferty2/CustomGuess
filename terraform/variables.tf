variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro is free-tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

# ── Database (Supabase) ─────────────────────────────────────────

variable "db_host" {
  description = "PostgreSQL host (your Supabase host)"
  type        = string
}

variable "db_user" {
  description = "PostgreSQL username"
  type        = string
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "postgres"
}

variable "db_sslmode" {
  description = "PostgreSQL SSL mode"
  type        = string
  default     = "require"
}

# ── Email ───────────────────────────────────────────────────────

variable "resend_api_key" {
  description = "Resend API key for transactional emails"
  type        = string
  sensitive   = true
}

# ── Cloudflare R2 ───────────────────────────────────────────────

variable "r2_account_id" {
  description = "Cloudflare R2 account ID"
  type        = string
}

variable "r2_access_key_id" {
  description = "Cloudflare R2 access key ID"
  type        = string
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "Cloudflare R2 secret access key"
  type        = string
  sensitive   = true
}

# ── App URLs ────────────────────────────────────────────────────

variable "allowed_origins" {
  description = "Comma-separated CORS origins (your Vercel frontend URL, e.g. https://guesswho.vercel.app)"
  type        = string
}

variable "app_base_url" {
  description = "Public HTTPS URL of this backend (e.g. https://api.yourdomain.duckdns.org)"
  type        = string
}
