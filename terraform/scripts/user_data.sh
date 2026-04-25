#!/bin/bash
set -euo pipefail
exec > /var/log/user_data.log 2>&1

# ── Install packages ───────────────────────────────────────────
dnf update -y
dnf install -y docker nginx

# ── Docker ─────────────────────────────────────────────────────
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# ── App directory & env file ───────────────────────────────────
mkdir -p /opt/backend

# Values are injected by Terraform templatefile() — no shell expansion needed
cat > /opt/backend/.env << 'ENVEOF'
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
DB_SSLMODE=${db_sslmode}
RESEND_API_KEY=${resend_api_key}
APP_BASE_URL=${app_base_url}
R2_ACCOUNT_ID=${r2_account_id}
R2_ACCESS_KEY_ID=${r2_access_key_id}
R2_SECRET_ACCESS_KEY=${r2_secret_access_key}
ALLOWED_ORIGINS=${allowed_origins}
ENVEOF

chmod 600 /opt/backend/.env

# ── Nginx — reverse proxy with WebSocket support ───────────────
# Note: $$ in this template becomes $ after Terraform rendering,
# which nginx then interprets as its own variables.

rm -f /etc/nginx/conf.d/default.conf
mkdir -p /var/www/html

cat > /etc/nginx/conf.d/guesswho.conf << 'NGINXEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ""      close;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 15m;

    # Certbot ACME challenge (used when running: sudo certbot --nginx -d your.domain)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection $connection_upgrade;
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
    }
}
NGINXEOF

systemctl enable nginx
systemctl start nginx

# ── Backend systemd service ────────────────────────────────────
# The service is enabled but NOT started here.
# Start it manually after pushing the Docker image to ECR:
#   sudo systemctl start guesswho-backend

cat > /etc/systemd/system/guesswho-backend.service << SERVICEEOF
[Unit]
Description=GuessWho Backend
After=docker.service network-online.target
Requires=docker.service

[Service]
Restart=always
RestartSec=10
ExecStartPre=/bin/bash -c 'aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${ecr_url}'
ExecStartPre=-/usr/bin/docker rm -f guesswho-backend
ExecStart=/usr/bin/docker run --rm \\
    --name guesswho-backend \\
    --env-file /opt/backend/.env \\
    -p 127.0.0.1:8080:8080 \\
    ${ecr_url}:latest
ExecStop=/usr/bin/docker stop guesswho-backend

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable guesswho-backend
