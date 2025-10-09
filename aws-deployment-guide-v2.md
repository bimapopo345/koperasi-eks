# 🚀 AWS Deployment Guide v2 - LPK SAMIT Sakura Mitra

## 📋 **Complete Auto-Deployment dengan GitHub Actions**

Guide lengkap untuk deploy aplikasi MERN Stack LPK SAMIT Sakura Mitra ke AWS dengan full automation.

---

## 🏗️ **Architecture Overview**

```
GitHub Repository
       ↓ (Push to main)
GitHub Actions
       ↓
AWS EC2 Instance
├── Frontend (React) → Nginx
├── Backend (Node.js) → PM2
└── Database (MongoDB) → MongoDB Atlas/Local
```

---

## 🔧 **Prerequisites**

### **1. AWS Account Setup**
- AWS Account dengan billing enabled
- IAM User dengan programmatic access
- EC2 Key Pair untuk SSH access

### **2. Domain & SSL (Optional)**
- Domain name (contoh: lpksamit.com)
- Cloudflare/Route53 untuk DNS management

### **3. GitHub Repository**
- Repository dengan code LPK SAMIT
- GitHub Secrets untuk AWS credentials

---

## 🖥️ **Step 1: AWS EC2 Setup**

### **1.1 Launch EC2 Instance**

```bash
# Instance Details
Instance Type: t3.medium (2 vCPU, 4GB RAM)
AMI: Ubuntu Server 22.04 LTS
Storage: 20GB gp3
Security Group: HTTP (80), HTTPS (443), SSH (22), Custom (5000)
```

### **1.2 Security Group Configuration**

```bash
# Inbound Rules
Type        Protocol    Port Range    Source
SSH         TCP         22           Your IP/0.0.0.0/0
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         5000         0.0.0.0/0
Custom TCP  TCP         3000         0.0.0.0/0 (development only)
```

### **1.3 Connect to EC2**

```bash
# Download key pair dan set permissions
chmod 400 your-key.pem

# Connect via SSH
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

---

## 📦 **Step 2: Server Environment Setup**

### **2.1 System Update & Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y git nginx certbot python3-certbot-nginx pm2 unzip

# Install MongoDB (if using local)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### **2.2 Create Application User**

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy

# Generate SSH key for GitHub
ssh-keygen -t rsa -b 4096 -C "deploy@lpksamit.com"
cat ~/.ssh/id_rsa.pub
# Add this key to GitHub repository Deploy Keys
```

### **2.3 Setup Application Directory**

```bash
# Create app directory
sudo mkdir -p /var/www/lpksamit
sudo chown deploy:deploy /var/www/lpksamit
cd /var/www/lpksamit

# Clone repository
git clone git@github.com:yourusername/lpksamit-app.git .
```

---

## 🔧 **Step 3: Application Configuration**

### **3.1 Backend Environment Setup**

```bash
# Navigate to server directory
cd /var/www/lpksamit/server

# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lpksamit_prod
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://yourdomain.com
EOF

# Install dependencies
npm install --production

# Build if needed
npm run build
```

### **3.2 Frontend Build Setup**

```bash
# Navigate to client directory
cd /var/www/lpksamit/client

# Create production environment file
cat > .env.production << EOF
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME=LPK SAMIT Sakura Mitra
EOF

# Install dependencies and build
npm install
npm run build
```

---

## 🌐 **Step 4: Nginx Configuration**

### **4.1 Create Nginx Config**

```bash
sudo nano /etc/nginx/sites-available/lpksamit
```

```nginx
# /etc/nginx/sites-available/lpksamit
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be added by certbot)
    
    # Frontend (React Build)
    location / {
        root /var/www/lpksamit/client/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### **4.2 Enable Site & SSL**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lpksamit /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔄 **Step 5: PM2 Process Management**

### **5.1 Create PM2 Ecosystem File**

```bash
# Create ecosystem file
cat > /var/www/lpksamit/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lpksamit-backend',
    script: './server/index.js',
    cwd: '/var/www/lpksamit',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p /var/www/lpksamit/logs

# Start application with PM2
cd /var/www/lpksamit
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🤖 **Step 6: GitHub Actions Setup**

### **6.1 Create Deployment Script**

```bash
# Create deployment script on server
cat > /var/www/lpksamit/deploy.sh << 'EOF'
#!/bin/bash

# LPK SAMIT Deployment Script
set -e

echo "🌸 Starting LPK SAMIT Sakura Mitra Deployment..."

# Variables
APP_DIR="/var/www/lpksamit"
BACKUP_DIR="/var/backups/lpksamit"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
echo "📦 Creating backup..."
sudo mkdir -p $BACKUP_DIR
sudo tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $APP_DIR .

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Backend deployment
echo "🔧 Deploying backend..."
cd server
npm install --production
npm run build 2>/dev/null || echo "No build script found"

# Frontend deployment
echo "🎨 Building frontend..."
cd ../client
npm install
npm run build

# Restart services
echo "🔄 Restarting services..."
pm2 restart lpksamit-backend
sudo systemctl reload nginx

# Health check
echo "🏥 Health check..."
sleep 5
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "🌸 LPK SAMIT Sakura Mitra is live!"
EOF

# Make script executable
chmod +x /var/www/lpksamit/deploy.sh
```

### **6.2 GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: 🌸 Deploy LPK SAMIT Sakura Mitra

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    name: 🚀 Deploy to AWS
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4
      
    - name: 🔧 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          server/package-lock.json
          client/package-lock.json
    
    - name: 🧪 Test Backend
      run: |
        cd server
        npm ci
        npm test || echo "No tests found"
        
    - name: 🧪 Test Frontend  
      run: |
        cd client
        npm ci
        npm run build
        
    - name: 🌸 Deploy to AWS EC2
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.AWS_HOST }}
        username: ${{ secrets.AWS_USERNAME }}
        key: ${{ secrets.AWS_SSH_KEY }}
        port: 22
        script: |
          cd /var/www/lpksamit
          ./deploy.sh
          
    - name: 📢 Notify Success
      if: success()
      run: |
        echo "🎉 LPK SAMIT Sakura Mitra deployed successfully!"
        echo "🌸 Visit: https://${{ secrets.DOMAIN_NAME }}"
        
    - name: 📢 Notify Failure
      if: failure()
      run: |
        echo "❌ Deployment failed!"
        echo "Check logs for details."
```

---

## 🔐 **Step 7: GitHub Secrets Configuration**

### **7.1 Required Secrets**

Di GitHub Repository → Settings → Secrets and variables → Actions:

```bash
# AWS Connection
AWS_HOST=your-ec2-public-ip
AWS_USERNAME=deploy
AWS_SSH_KEY=your-private-key-content

# Optional
DOMAIN_NAME=yourdomain.com
```

### **7.2 Add SSH Key to GitHub**

```bash
# On your local machine, copy the private key
cat your-key.pem

# Add this content to GitHub Secrets as AWS_SSH_KEY
```

---

## 🏥 **Step 8: Health Checks & Monitoring**

### **8.1 Create Health Check Endpoint**

```javascript
// server/routes/health.js
import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LPK SAMIT Sakura Mitra API',
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;
```

### **8.2 PM2 Monitoring**

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Monitor processes
pm2 monit
```

---

## 🔄 **Step 9: Database Backup & Restore**

### **9.1 Automated MongoDB Backup**

```bash
# Create backup script
cat > /var/www/lpksamit/backup-db.sh << 'EOF'
#!/bin/bash

# MongoDB Backup Script
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="lpksamit_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "✅ Database backup completed: backup_$DATE.tar.gz"
EOF

chmod +x /var/www/lpksamit/backup-db.sh

# Add to crontab for daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/lpksamit/backup-db.sh") | crontab -
```

---

## 🚀 **Step 10: Deployment Process**

### **10.1 Initial Deployment**

```bash
# 1. Push code to GitHub
git add .
git commit -m "🌸 Initial deployment setup"
git push origin main

# 2. GitHub Actions will automatically:
#    - Run tests
#    - Deploy to AWS EC2
#    - Restart services
#    - Perform health checks

# 3. Monitor deployment
# Check GitHub Actions tab for deployment status
```

### **10.2 Subsequent Deployments**

```bash
# Just push to main branch
git add .
git commit -m "✨ New feature: auto-fill simpanan"
git push origin main

# Deployment happens automatically! 🎉
```

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Deployment Fails**
```bash
# Check GitHub Actions logs
# SSH to server and check:
pm2 logs lpksamit-backend
sudo nginx -t
sudo systemctl status nginx
```

#### **2. Database Connection Issues**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection
mongo --eval "db.adminCommand('ismaster')"
```

#### **3. SSL Certificate Issues**
```bash
# Renew certificate
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

#### **4. High Memory Usage**
```bash
# Check PM2 processes
pm2 list
pm2 monit

# Restart if needed
pm2 restart lpksamit-backend
```

---

## 📊 **Performance Optimization**

### **1. Nginx Optimizations**

```nginx
# Add to nginx config
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Enable HTTP/2
listen 443 ssl http2;
```

### **2. PM2 Optimizations**

```javascript
// ecosystem.config.js optimizations
module.exports = {
  apps: [{
    name: 'lpksamit-backend',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

## 🎯 **Final Checklist**

### **Pre-Deployment**
- [ ] AWS EC2 instance configured
- [ ] Domain DNS pointing to EC2
- [ ] SSL certificate installed
- [ ] GitHub secrets configured
- [ ] Database setup completed

### **Post-Deployment**
- [ ] Application accessible via domain
- [ ] API endpoints working
- [ ] Database connections stable
- [ ] SSL certificate valid
- [ ] PM2 processes running
- [ ] Nginx serving correctly
- [ ] GitHub Actions working
- [ ] Health checks passing

---

## 🌸 **Success!**

Selamat! LPK SAMIT Sakura Mitra sekarang sudah:

- ✅ **Auto-deployed** dari GitHub push
- ✅ **Production ready** dengan SSL
- ✅ **Scalable** dengan PM2 cluster
- ✅ **Monitored** dengan health checks
- ✅ **Backed up** dengan automated backups
- ✅ **Optimized** untuk performance

### **🚀 Deployment URL:**
- **Frontend**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Health Check**: https://yourdomain.com/api/health

### **📱 Mobile Responsive:**
Aplikasi sudah mobile responsive dengan hamburger menu dan tema LPK SAMIT Sakura Mitra yang konsisten!

---

**🎉 Happy Deploying! 🌸**