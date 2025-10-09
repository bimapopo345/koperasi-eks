# AWS Deployment Guide for MERN Koperasi

## 📋 Overview

This guide will help you deploy your MERN Koperasi application to AWS EC2 with proper configuration for both frontend and backend.

## 🔧 Prerequisites

- AWS EC2 instance (Ubuntu 20.04/22.04)
- Domain name (optional but recommended)
- GitHub repository
- GitHub account for Actions

## 🚀 Step 1: AWS EC2 Setup

### 1.1 Create EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose Ubuntu 22.04 LTS
3. Choose instance type (t2.micro or t3.micro for testing)
4. Configure security groups:
   - Port 22 (SSH) - Your IP
   - Port 80 (HTTP) - 0.0.0.0/0
   - Port 443 (HTTPS) - 0.0.0.0/0
   - Port 5000 (Node.js) - 0.0.0.0/0
5. Create key pair (download .pem file)

### 1.2 Connect to EC2

```bash
chmod 400 your-key-pair.pem
ssh -i your-key-pair.pem ubuntu@your-ec2-public-ip
```

### 1.3 Install Dependencies

```bash
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install MongoDB (if not using MongoDB Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 🔑 Step 2: GitHub Secrets Configuration

### 2.1 Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

#### AWS Secrets

- `EC2_HOST`: Your EC2 public IP or domain
- `EC2_USER`: `ubuntu` (default for Ubuntu)
- `SSH_PRIVATE_KEY`: Your EC2 key pair content (.pem file)

#### Database Secrets

- `MONGO_DB_URL`: MongoDB connection string
  - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/koperasi_db`
  - For local MongoDB: `mongodb://localhost:27017/koperasi_db`

#### Application Secrets

- `PORT`: `5000`
- `CORS_ORIGIN1`: `http://your-domain.com`
- `CORS_ORIGIN2`: `http://localhost:3000`
- `CORS_ORIGIN3`: `http://localhost:5173`
- `JWT_SECRET`: Generate a random secret (32+ characters)
- `STRIPE_SECRET_KEY`: (If using Stripe)

#### Nginx Configuration

- `NGINX_CONF`: Complete Nginx configuration (see below)

## 📝 Step 3: Nginx Configuration

### 3.1 Nginx Configuration Secret

Create a secret named `NGINX_CONF` with this content:

```nginx
server {
    listen 80;
    server_name __EC2_HOST__ www.__EC2_HOST__;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;

        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

## 🔄 Step 4: GitHub Actions Workflow

### 4.1 Create `.github/workflows/deploy.yml`

```yaml
name: Deploy MERN Koperasi to AWS EC2

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Stop any running PM2 process
            pm2 stop mern-koperasi-backend || true
            pm2 delete mern-koperasi-backend || true

            # Clean up old app directory and create a fresh one
            sudo rm -rf /home/${{ secrets.EC2_USER }}/app
            mkdir -p /home/${{ secrets.EC2_USER }}/app

            # Clone the repository into the app directory
            git clone --branch main --single-branch https://github.com/${{ github.repository }}.git /home/${{ secrets.EC2_USER }}/app

            # === BACKEND SETUP ===
            cd /home/${{ secrets.EC2_USER }}/app/server

            # Create the .env file for the backend from GitHub Secrets
            echo "MONGO_DB_URL=${{ secrets.MONGO_DB_URL }}" > .env
            echo "PORT=${{ secrets.PORT }}" >> .env
            echo "CORS_ORIGIN1=http://${{ secrets.EC2_HOST }}" >> .env
            echo "CORS_ORIGIN2=${{ secrets.CORS_ORIGIN2 }}" >> .env
            echo "CORS_ORIGIN3=${{ secrets.CORS_ORIGIN3 }}" >> .env
            echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
            echo "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" >> .env
            echo "NODE_ENV=production" >> .env

            # Install backend dependencies
            npm ci --production

            # === FRONTEND SETUP ===
            cd /home/${{ secrets.EC2_USER }}/app/client
            # Install and build the frontend with the correct API URL
            export VITE_SERVER_URL="http://${{ secrets.EC2_HOST }}"

            # Create .env file for frontend
            echo "VITE_SERVER_URL=${{ secrets.EC2_HOST }}" > .env
            echo "VITE_API_URL=http://${{ secrets.EC2_HOST }}/api" >> .env

            npm ci
            npm run build

            # === NGINX SETUP ===
            # Create the Nginx configuration file from a GitHub Secret
            echo "${{ secrets.NGINX_CONF }}" | sudo tee /etc/nginx/sites-available/default

            # Replace placeholders in the Nginx config with actual values from secrets
            sudo sed -i "s/__EC2_HOST__/${{ secrets.EC2_HOST }}/g" /etc/nginx/sites-available/default
            sudo sed -i "s/__PORT__/${{ secrets.PORT }}/g" /etc/nginx/sites-available/default

            # Test Nginx configuration
            sudo nginx -t

            # Clean the default Nginx web root
            sudo rm -rf /var/www/html/*

            # Copy the built frontend files to the Nginx web root
            sudo cp -r /home/${{ secrets.EC2_USER }}/app/client/dist/. /var/www/html/

            # Set proper permissions
            sudo chown -R www-data:www-data /var/www/html/
            sudo chmod -R 755 /var/www/html/

            # Restart Nginx to apply the new configuration
            sudo systemctl restart nginx

            # === START SERVICES ===
            # Start the backend with PM2
            cd /home/${{ secrets.EC2_USER }}/app/server
            # PM2 will automatically use the .env file in the server's root directory
            pm2 start index.js --name "mern-koperasi-backend"

            # Save the PM2 process list to run on server reboot
            pm2 save

            # Enable PM2 to start on boot
            pm2 startup
            pm2 save
```

## 🔧 Step 5: Backend Configuration

### 5.1 Update Server Code

Make sure your `server/index.js` has proper CORS configuration:

```javascript
// server/index.js
const cors = require("cors");
require("dotenv").config();

const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN1,
    process.env.CORS_ORIGIN2,
    process.env.CORS_ORIGIN3,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

### 5.2 Update Client API Configuration

Update `client/src/api/config.js`:

```javascript
// client/src/api/config.js
export const API_URL =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}/api`;
```

## 🚀 Step 6: Deployment

### 6.1 Push to GitHub

```bash
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

### 6.2 Monitor Deployment

1. Go to GitHub repository → Actions
2. Check the deployment workflow
3. SSH into EC2 to check logs:

```bash
# Check PM2 logs
pm2 logs mern-koperasi-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check system logs
journalctl -u nginx -f
```

## 🔍 Step 7: Troubleshooting

### 7.1 Common Issues

#### Frontend not loading

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check file permissions
sudo ls -la /var/www/html/
```

#### Backend API not working

```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs mern-koperasi-backend

# Check if backend is running
curl http://localhost:5000/api/auth/me
```

#### Database connection issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh "mongodb://localhost:27017/koperasi_db"
```

### 7.2 Useful Commands

```bash
# Restart services
sudo systemctl restart nginx
pm2 restart mern-koperasi-backend

# Check system resources
htop
df -h
free -h

# Monitor logs
sudo tail -f /var/log/syslog
```

## 🔐 Step 8: Security

### 8.1 Firewall Configuration

```bash
# UFW (Uncomplicated Firewall)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8.2 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Step 9: Monitoring

### 9.1 PM2 Monitoring

```bash
# Check process status
pm2 status

# Monitor logs
pm2 logs

# Monitor memory usage
pm2 monit
```

### 9.2 Application Health Check

Create a health check endpoint in `server/index.js`:

```javascript
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

## 🎯 Conclusion

Your MERN Koperasi application should now be deployed successfully on AWS EC2. Make sure to:

1. Test all functionality
2. Set up monitoring
3. Configure backups
4. Keep dependencies updated
5. Monitor security logs

For any issues, check the troubleshooting section above or monitor the deployment logs.
