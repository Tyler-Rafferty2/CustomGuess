output "backend_public_ip" {
  description = "Elastic IP of the backend EC2 instance"
  value       = aws_eip.backend.public_ip
}

output "ecr_repository_url" {
  description = "ECR repository URL — use this to push Docker images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.backend.public_ip}"
}

output "next_steps" {
  description = "Steps to complete deployment after terraform apply"
  value       = <<-EOT

    ── Step 1: Push the backend Docker image ──────────────────────────────
    aws ecr get-login-password --region ${var.aws_region} | \
      docker login --username AWS --password-stdin ${aws_ecr_repository.backend.repository_url}

    docker build -t guesswho-backend ./backend
    docker tag guesswho-backend:latest ${aws_ecr_repository.backend.repository_url}:latest
    docker push ${aws_ecr_repository.backend.repository_url}:latest

    ── Step 2: Get a free domain & point it to your IP ───────────────────
    Go to https://www.duckdns.org → create a subdomain → set IP to:
      ${aws_eip.backend.public_ip}

    ── Step 3: Get a free SSL certificate (SSH into EC2) ─────────────────
    ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.backend.public_ip}
    sudo dnf install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d your-subdomain.duckdns.org

    ── Step 4: Start the backend service ─────────────────────────────────
    sudo systemctl start guesswho-backend
    sudo systemctl status guesswho-backend

    ── Step 5: Deploy frontend to Vercel ─────────────────────────────────
    Set environment variable in Vercel:
      NEXT_PUBLIC_API_URL = https://your-subdomain.duckdns.org
  EOT
}
