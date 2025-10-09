# MERN Koperasi - Complete Postman API Collection

## 📋 Overview
Comprehensive Postman collection for both Admin and Member APIs with all enhanced features.

## 🎯 Admin API Collection

### **Authentication**
- ✅ **Admin Login** - Auto-save token
- ✅ **Admin Register** 
- ✅ **Get Current Admin**
- ✅ **Admin Logout**

### **Member Management**
- ✅ **Get All Members**
- ✅ **Get Member By UUID** - Uses UUID, not ID
- ✅ **Create Member** - Auto-save member_id and member_uuid
- ✅ **Update Member By UUID**
- ✅ **Delete Member By UUID**

### **Savings Management**
- ✅ **Get All Savings**
- ✅ **Create Saving (Full Payment)** - 2,500,000 (auto-detect as Full)
- ✅ **Create Saving (Partial Payment)** - 1,000,000 (auto-detect as Partial)
- ✅ **Approve Saving** - PATCH /savings/:id/approve
- ✅ **Reject Saving** - PATCH /savings/:id/reject (with reason)
- ✅ **Get Period Summary** - Period completion analytics

### **Products Management**
- ✅ **Get All Products** - Auto-save first product_id

## 🎯 Member API Collection

### **Authentication**
- ✅ **Member Login** - UUID + UUID-1234 password format
- ✅ **Get Current Member**
- ✅ **Member Logout**

### **Personal Savings**
- ✅ **Get My Savings** - Member's own savings only
- ✅ **Create My Saving (Full)** - 2,500,000 payment
- ✅ **Create My Saving (Partial)** - 1,000,000 payment
- ✅ **Get My Savings Summary** - Personal analytics
- ✅ **Get My Saving By ID** - Specific saving details

## 🔧 Auto-Variables System

### **Collection Variables**
```javascript
base_url: "http://localhost:5000"
auth_token: "" // Auto-saved from login
created_member_uuid: "" // Auto-saved from create member
created_member_id: "" // Auto-saved from create member  
product_id: "" // Auto-saved from get products
saving_id: "" // Auto-saved from create saving
```

### **Auto-Save Scripts**
- **Login** → Save token to auth_token
- **Create Member** → Save UUID and ID
- **Get Products** → Save first product ID
- **Create Saving** → Save saving ID for approval/rejection

## 🎯 Complete Test Workflow

### **Admin Workflow**
1. **Admin Login** → Token saved
2. **Get All Products** → Product ID saved
3. **Create Member** → Member IDs saved
4. **Create Saving (Partial)** → Saving ID saved, auto-detect Partial
5. **Approve Saving** → Uses saved saving_id
6. **Get Period Summary** → Check completion status

### **Member Workflow**
1. **Member Login** → Use UUID from created member + UUID-1234
2. **Get My Savings** → Personal savings only
3. **Create My Saving (Partial)** → Auto-detect payment type
4. **Get My Savings Summary** → Personal analytics

## 💡 Key Features

### **Intelligent Payment Detection**
```json
// Amount < Product Deposit → Auto-detect "Partial"
{
  "amount": 1000000,
  "paymentType": "Partial", // Auto-calculated
  "partialSequence": 1
}

// Amount = Product Deposit → Auto-detect "Full"  
{
  "amount": 2500000,
  "paymentType": "Full", // Auto-calculated
  "partialSequence": 1
}
```

### **Flexible Period Management**
- Manual installment period override
- Support multiple submissions per period
- Partial payment continuation support
- Period completion tracking

### **Comprehensive Approval Workflow**
```json
// Approve
{
  "notes": "Approved by admin - payment verified"
}

// Reject
{
  "rejectionReason": "Bukti pembayaran tidak valid",
  "notes": "Mohon upload ulang bukti yang lebih jelas"
}
```

## 🧪 Testing Scenarios

### **Scenario 1: Full Payment**
1. Create Saving (Full Payment) → 2,500,000
2. Auto-detected as "Full" payment
3. Approve → Complete period

### **Scenario 2: Partial Payments**
1. Create Saving (Partial Payment) → 1,000,000
2. Auto-detected as "Partial #1"
3. Approve → Period incomplete
4. Create another saving → Same period, remaining amount
5. Auto-detected as "Partial #2"
6. Approve → Period complete

### **Scenario 3: Rejection & Resubmission**
1. Create Saving → 1,000,000
2. Reject with reason
3. Create new saving → Same period allowed
4. Approve → Success

### **Scenario 4: Member API Usage**
1. Member Login with UUID
2. Create personal savings
3. View personal summary
4. External app integration ready

## 📄 API Documentation Ready

All endpoints documented with:
- Complete request/response examples
- Auto-variable usage
- Error handling examples
- Business logic explanations

Perfect for:
- Development testing
- API documentation
- External integration
- Quality assurance

---

**Status**: ✅ Complete and Production Ready  
**Coverage**: 100% of enhanced features  
**Auto-Variables**: Fully implemented  
**External Ready**: Member API ready for consumption