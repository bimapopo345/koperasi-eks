# 🏦 MERN Koperasi - Advanced Cooperative Management System

A comprehensive cooperative management system built with modern MERN stack, featuring dual API architecture for admin management and external member integration.

## 🌟 Features Overview

### 🎯 **Dual API Architecture**
- **Admin API** (`/api/admin/*`) - Complete management interface
- **Member API** (`/api/member/*`) - External consumption ready

### 💰 **Advanced Savings Management**
- **Intelligent Partial Payments** - Auto-detect Full vs Partial payments
- **Smart Period Detection** - Automatic next period suggestions
- **Approval Workflow** - Complete approve/reject system with reasons
- **File Management** - Proof upload with auto-cleanup

### 🔐 **Security & Authentication**
- **Admin Authentication** - Traditional username/password
- **Member Authentication** - UUID-based with UUID-1234 format
- **Role-based Access** - Strict separation of admin vs member functions

### 📊 **Smart UI Features**
- **Period Intelligence** - Shows incomplete, pending, rejected periods
- **One-click Actions** - Quick period selection and amount suggestions
- **Real-time Alerts** - Pending transaction warnings
- **Transaction History** - Detailed tooltip with status tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mern-koperasi
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env` file in server directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/koperasi
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   
   # Server Configuration
   PORT=5000
   CLIENT_URL=http://localhost:5173
   
   # File Upload
   UPLOAD_DIR=uploads
   ```

4. **Start Development Servers**
   ```bash
   # Start both server and client (recommended)
   npm run dev
   
   # Or start individually:
   # Server only
   cd server && npm run dev
   
   # Client only (in new terminal)
   cd client && npm run dev
   ```

5. **Access the Application**
   - **Frontend**: http://localhost:5173
   - **Backend**: http://localhost:5000
   - **Admin Panel**: http://localhost:5173/login

## 📚 API Documentation

### 🔑 Authentication

#### Admin Authentication
```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Member Authentication
```http
POST /api/member/auth/login
Content-Type: application/json

{
  "uuid": "MEMBER_1234567890_ABCDE",
  "password": "MEMBER_1234567890_ABCDE-1234"
}
```

### 💰 Savings Management

#### Admin Savings Operations

**Create Savings (Auto-detect Payment Type)**
```http
POST /api/admin/savings
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "memberId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "productId": "60f7b3b3b3b3b3b3b3b3b3b4",
  "amount": 1000000,  // < depositAmount = Partial, = depositAmount = Full
  "installmentPeriod": 1,
  "description": "Pembayaran Simpanan Periode - 1",
  "notes": "Pembayaran via transfer bank"
}
```

**Approve Savings**
```http
PATCH /api/admin/savings/{savingId}/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "notes": "Approved - payment verified"
}
```

**Reject Savings**
```http
PATCH /api/admin/savings/{savingId}/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "rejectionReason": "Bukti pembayaran tidak valid",
  "notes": "Mohon upload ulang bukti yang lebih jelas"
}
```

**Smart Period Detection**
```http
GET /api/admin/savings/check-period/{memberId}/{productId}
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "nextPeriod": 3,
    "isPartialPayment": true,
    "remainingAmount": 1500000,
    "incompletePeriods": [
      {
        "period": 2,
        "paidAmount": 1000000,
        "remainingAmount": 1500000
      }
    ],
    "pendingTransactions": [
      {
        "installmentPeriod": 2,
        "amount": 500000,
        "createdAt": "2024-12-09"
      }
    ]
  }
}
```

#### Member Savings Operations

**Create Personal Savings**
```http
POST /api/member/savings
Authorization: Bearer {member_token}
Content-Type: application/json

{
  "amount": 1000000,
  "description": "Pembayaran bulanan via mobile app",
  "installmentPeriod": 1,
  "notes": "Transfer via BCA"
}
```

**Get Personal Savings**
```http
GET /api/member/savings
Authorization: Bearer {member_token}
```

**Get Personal Summary**
```http
GET /api/member/savings/summary
Authorization: Bearer {member_token}
```

### 👥 Member Management

#### Admin Member Operations

**Create Member**
```http
POST /api/admin/members
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "John Doe",
  "gender": "L",
  "phone": "08123456789",
  "city": "Jakarta",
  "completeAddress": "Jl. Contoh No. 123"
}
```

**Get Member by UUID**
```http
GET /api/admin/members/{memberUuid}
Authorization: Bearer {admin_token}
```

## 🎨 Frontend Features

### 🖥️ Admin Dashboard

#### Enhanced Savings Creation Modal
- **Smart Period Detection** - Automatically suggests next period based on member history
- **Payment Type Auto-detection** - Distinguishes between Full and Partial payments
- **Alert System** - Shows incomplete, pending, and rejected periods
- **Quick Actions** - One-click buttons for common scenarios
- **Transaction History Tooltip** - Detailed view of all member transactions

#### Key UI Components
```javascript
// Period Information Panel
{
  "statusOverview": "Shows last approved period and suggestion",
  "alertBadges": "Compact inline alerts for incomplete/pending/rejected",
  "quickActions": "One-click period selection buttons",
  "transactionHistory": "Hover tooltip with complete history"
}
```

#### Table Features
- **Proof File Viewing** - "Lihat Bukti" button opens files in new tab
- **Status Indicators** - Color-coded badges with partial sequence numbers
- **Rejection Reasons** - Hover tooltip and inline text for rejected items
- **Action Buttons** - Approve (✓), Reject (✗), Edit (✎), Delete (🗑)

## 🏗️ Architecture

### 📁 Project Structure
```
mern-koperasi/
├── server/                 # Backend Express.js
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── admin/      # Admin-only controllers
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── member.controller.js
│   │   │   │   ├── savings.controller.js
│   │   │   │   └── savingsApproval.controller.js
│   │   │   └── member/     # Member API controllers
│   │   │       ├── auth.controller.js
│   │   │       └── savings.controller.js
│   │   ├── models/         # MongoDB Schemas
│   │   ├── routes/         # API Routes
│   │   ├── middlewares/    # Auth & Validation
│   │   └── validations/    # Joi Schemas
│   └── uploads/            # File Storage
│       └── simpanan/       # Savings proof files
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Reusable Components
│   │   ├── pages/          # Page Components
│   │   ├── api/           # API Service Functions
│   │   └── utils/         # Helper Functions
└── checkpoint/            # Documentation & Changelogs
```

### 🔄 Data Flow

#### Admin Workflow
1. **Login** → Token stored in localStorage
2. **Create/Manage Members** → UUID auto-generated
3. **Smart Savings Creation** → Period detection + auto-fill
4. **Approval Workflow** → Approve/Reject with reasons
5. **File Management** → Upload, view, auto-cleanup

#### Member API Workflow
1. **External System** → Authenticate with UUID
2. **Create Savings** → Auto-detect payment type
3. **View Personal Data** → Only own savings accessible
4. **Status Tracking** → Real-time approval status

## 🛡️ Security Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication** - Secure token management
- **Role-based Access Control** - Admin vs Member separation
- **API Endpoint Protection** - All routes properly secured
- **Input Validation** - Joi schema validation on all inputs

### 🔒 Data Security
- **Member Isolation** - Members can only access own data
- **File Security** - Organized storage with access control
- **UUID-based Identification** - Secure member identification
- **Password Security** - Hashed storage for admin accounts

## 🧪 Testing

### 📋 Postman Collection

Import the provided collection: `MERN-Koperasi-Postman-Collection.json`

#### Pre-configured Variables
```json
{
  "base_url": "http://localhost:5000",
  "auth_token": "", // Auto-saved from login
  "created_member_id": "", // Auto-saved from member creation
  "created_member_uuid": "", // Auto-saved from member creation
  "product_id": "", // Auto-saved from product listing
  "saving_id": "" // Auto-saved from savings creation
}
```

#### Testing Scenarios

**1. Complete Admin Workflow**
1. Admin Login → Token auto-saved
2. Get All Products → Product ID auto-saved
3. Create Member → Member IDs auto-saved
4. Create Saving (Partial) → Auto-detect "Partial"
5. Approve Saving → Uses saved IDs
6. Check Period Summary → Verify completion

**2. Member API Integration**
1. Member Login → UUID-1234 format
2. Create Personal Saving → Auto-detect payment type
3. Get Personal Savings → Own data only
4. Check Approval Status → Real-time updates

**3. Intelligent Period Management**
1. Create partial payment → Status: "Partial"
2. Create modal → Shows incomplete period alert
3. Quick action → Auto-fill remaining amount
4. Complete payment → Period marked complete

## 🚀 Deployment

### 📦 Production Build

```bash
# Build client for production
cd client
npm run build

# Start production server
cd ../server
npm start
```

### 🌐 Environment Variables (Production)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/koperasi
JWT_SECRET=super-secure-production-secret
CLIENT_URL=https://your-domain.com
PORT=5000
```

### 🐳 Docker Deployment (Optional)
```dockerfile
# Dockerfile for server
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

### 📝 Development Guidelines

1. **Code Style** - Follow existing patterns
2. **API Consistency** - Maintain response formats
3. **Security First** - Validate all inputs
4. **Documentation** - Update README for new features

### 🔄 Adding New Features

1. **Backend Changes**
   ```bash
   # Add controller in appropriate folder
   src/controllers/admin/newFeature.controller.js
   src/controllers/member/newFeature.controller.js
   
   # Add route
   src/routes/admin.routes.js
   src/routes/member.routes.js
   
   # Add validation
   src/validations/newFeature.validation.js
   ```

2. **Frontend Changes**
   ```bash
   # Add API service
   src/api/newFeatureApi.jsx
   
   # Add component
   src/components/NewFeature/
   
   # Add page
   src/pages/NewFeature.jsx
   ```

3. **Update Postman Collection**
   - Add new endpoints
   - Configure auto-variables
   - Add test scenarios

## 📊 Performance & Monitoring

### 🔍 Key Metrics to Monitor
- **API Response Times** - Target: <200ms for most endpoints
- **Database Query Performance** - Index optimization
- **File Storage Usage** - Auto-cleanup prevents bloat
- **Authentication Success Rate** - Monitor failed logins

### 📈 Optimization Features
- **Smart Queries** - Optimized aggregation for period detection
- **File Management** - Auto-cleanup on deletion
- **Caching Strategy** - localStorage for user sessions
- **Responsive Design** - Mobile-optimized UI

## 🆘 Troubleshooting

### Common Issues

**1. Login Problems**
```bash
# Check if admin user exists
# Default: username="admin", password="admin123"

# For member login, ensure UUID format:
# UUID: "MEMBER_1234567890_ABCDE"
# Password: "MEMBER_1234567890_ABCDE-1234"
```

**2. File Upload Issues**
```bash
# Ensure uploads directory exists
mkdir -p server/uploads/simpanan

# Check file permissions
chmod 755 server/uploads/simpanan
```

**3. Database Connection**
```bash
# Verify MongoDB connection
# Check MONGODB_URI in .env file
# Ensure MongoDB service is running
```

**4. CORS Issues**
```javascript
// Update cors configuration in server/src/app.js
app.use(cors({
  origin: "http://localhost:5173", // Client URL
  credentials: true
}));
```

### 📞 Support

For issues and questions:
1. Check existing documentation
2. Review Postman collection examples
3. Check console logs for detailed errors
4. Verify environment configuration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **MERN Stack** - MongoDB, Express.js, React, Node.js
- **UI Framework** - Tailwind CSS for styling
- **Authentication** - JWT for secure authentication
- **File Handling** - Multer for file uploads
- **Validation** - Joi for schema validation

---

## 🔗 Quick Links

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Admin Panel**: http://localhost:5173/login
- **API Documentation**: This README + Postman Collection
- **Changelog**: `/checkpoint/SAVINGS_ENHANCEMENT_CHANGELOG.md`

## 📈 Version History

- **v2.0.0** - Enhanced Savings Module with Partial Payments
- **v1.5.0** - Dual API Architecture (Admin + Member)
- **v1.0.0** - Initial MERN Koperasi Implementation

**Built with ❤️ for Cooperative Management**