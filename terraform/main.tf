# ── Networking: use default VPC for simplicity ─────────────────

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Latest Amazon Linux 2023 AMI ───────────────────────────────

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Security Group ─────────────────────────────────────────────

resource "aws_security_group" "backend" {
  name        = "guesswho-backend"
  description = "GuessWho backend security group"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (nginx / certbot challenge)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "guesswho-backend"
  }
}

# ── ECR Repository ─────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "guesswho-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = {
    Name = "guesswho-backend"
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 3 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ── IAM: allow EC2 to pull from ECR ───────────────────────────

resource "aws_iam_role" "ec2" {
  name = "guesswho-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecr_pull" {
  name = "guesswho-ecr-pull"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "guesswho-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── EC2 Instance ───────────────────────────────────────────────

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data = templatefile("${path.module}/scripts/user_data.sh", {
    aws_region           = var.aws_region
    ecr_url              = aws_ecr_repository.backend.repository_url
    db_host              = var.db_host
    db_user              = var.db_user
    db_password          = var.db_password
    db_name              = var.db_name
    db_sslmode           = var.db_sslmode
    resend_api_key       = var.resend_api_key
    r2_account_id        = var.r2_account_id
    r2_access_key_id     = var.r2_access_key_id
    r2_secret_access_key = var.r2_secret_access_key
    allowed_origins      = var.allowed_origins
    app_base_url         = var.app_base_url
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "guesswho-backend"
  }
}

# ── Elastic IP ─────────────────────────────────────────────────

resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "guesswho-backend"
  }
}
