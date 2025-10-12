# Spesifikasi Fitur Pinjaman (Kredit Barang)
## MERN Koperasi - LPK SAMIT

### 📋 Goals
1. **Implementasi Fitur Pinjaman Kredit Barang**
   - Memungkinkan member mengajukan pinjaman untuk produk-produk tertentu (iPhone, laptop, dll)
   - Sistem cicilan bulanan berdasarkan tenor yang dipilih
   - Tracking pembayaran cicilan per periode

2. **Integrasi dengan Sistem Existing**
   - Terintegrasi dengan member detail untuk pengajuan pinjaman
   - Halaman `/pinjaman` untuk manajemen pembayaran cicilan (mirip `/simpanan`)
   - Dashboard menampilkan statistik pinjaman

3. **User Experience**
   - Member dapat melihat simulasi cicilan sebelum mengajukan pinjaman
   - Admin dapat mengelola pengajuan dan pembayaran cicilan
   - Tracking status pembayaran per periode

---

### 🚧 Constraints

#### Business Constraints
- Pinjaman berbentuk kredit barang, bukan uang tunai
- Tenor (jangka waktu) sudah ditentukan per produk
- Cicilan per bulan = (Harga - DP) / Tenor
- Tidak ada fitur upgrade produk seperti di simpanan
- Status pembayaran: Pending, Approved, Rejected
- Satu member bisa memiliki multiple pinjaman aktif

#### Technical Constraints
- Mengikuti pattern existing codebase (MERN Stack)
- Menggunakan library yang sudah ada:
  - React Router untuk routing
  - Axios untuk API calls
  - date-fns untuk formatting tanggal
  - Tailwind CSS untuk styling
- Reuse komponen existing seperti Pagination, Modal
- MongoDB untuk database dengan Mongoose ODM
- JWT untuk authentication

#### Data Constraints
- Loan product sudah ada (model & controller)
- Member data sudah terintegrasi dengan auth
- Format currency: IDR (Rupiah Indonesia)
- Format tanggal: dd/MM/yyyy (Indonesia)

---

### 📝 Implementation Steps

#### Phase 1: Backend - Core Loan System

##### 1.1 Create Loan Model
```javascript
// server/src/models/loan.model.js
const loanSchema = new mongoose.Schema({
  uuid: { type: String, unique: true }, // Auto-generated
  memberId: { ref: "Member", required: true },
  loanProductId: { ref: "LoanProduct", required: true },
  
  // Loan details
  loanAmount: Number, // Total amount (price - down payment)
  downPayment: Number, // DP yang dibayar
  tenor: Number, // Periode cicilan (bulan)
  monthlyInstallment: Number, // Cicilan per bulan
  interestRate: Number, // Bunga (%)
  totalPayment: Number, // Total yang harus dibayar
  
  // Status
  status: { 
    enum: ["Pending", "Approved", "Active", "Completed", "Rejected", "Overdue"],
    default: "Pending"
  },
  
  // Dates
  applicationDate: Date,
  approvalDate: Date,
  startDate: Date, // Tanggal mulai cicilan
  endDate: Date, // Tanggal selesai cicilan
  
  // Additional
  description: String,
  rejectionReason: String,
  approvedBy: { ref: "User" },
  
  // Payment tracking
  paidPeriods: Number, // Berapa periode sudah dibayar
  totalPeriods: Number, // Total periode
  lastPaymentDate: Date,
  nextDueDate: Date
}, { timestamps: true });
```

##### 1.2 Create Loan Payment Model
```javascript
// server/src/models/loanPayment.model.js
const loanPaymentSchema = new mongoose.Schema({
  uuid: { type: String, unique: true },
  loanId: { ref: "Loan", required: true },
  memberId: { ref: "Member", required: true },
  
  // Payment details
  period: Number, // Periode ke-berapa
  amount: Number, // Jumlah pembayaran
  paymentDate: Date,
  dueDate: Date, // Tanggal jatuh tempo
  
  // Status
  status: { 
    enum: ["Pending", "Approved", "Rejected", "Partial"],
    default: "Pending"
  },
  paymentType: { 
    enum: ["Full", "Partial", "Late"],
    default: "Full"
  },
  
  // Proof & notes
  proofFile: String, // Bukti pembayaran
  description: String,
  notes: String,
  rejectionReason: String,
  
  // Approval
  approvedBy: { ref: "User" },
  approvedAt: Date
}, { timestamps: true });
```

##### 1.3 Create Loan Controllers
```javascript
// server/src/controllers/admin/loan.controller.js
- createLoanApplication() // Pengajuan pinjaman
- calculateInstallment() // Kalkulasi cicilan
- approveLoan() // Approve pengajuan
- rejectLoan() // Reject pengajuan  
- getAllLoans() // Get semua pinjaman
- getLoansByMember() // Get pinjaman per member
- getLoanDetail() // Detail pinjaman

// server/src/controllers/admin/loanPayment.controller.js
- createPayment() // Bayar cicilan
- approvePayment() // Approve pembayaran
- rejectPayment() // Reject pembayaran
- getPaymentsByLoan() // Get pembayaran per pinjaman
- getPaymentHistory() // History pembayaran
- checkOverdueLoans() // Check keterlambatan
```

##### 1.4 Create API Routes
```javascript
// server/src/routes/loan.routes.js
router.post('/loans/apply', createLoanApplication)
router.post('/loans/calculate', calculateInstallment)
router.post('/loans/:id/approve', approveLoan)
router.post('/loans/:id/reject', rejectLoan)
router.get('/loans', getAllLoans)
router.get('/loans/member/:memberId', getLoansByMember)
router.get('/loans/:id', getLoanDetail)

// server/src/routes/loanPayment.routes.js
router.post('/loan-payments', createPayment)
router.post('/loan-payments/:id/approve', approvePayment)
router.post('/loan-payments/:id/reject', rejectPayment)
router.get('/loan-payments/loan/:loanId', getPaymentsByLoan)
router.get('/loan-payments', getPaymentHistory)
```

---

#### Phase 2: Frontend - Member Detail Integration

##### 2.1 Update MemberDetail Loan Tab
```jsx
// client/src/pages/MemberDetail.jsx
// Di tab "pinjaman":

1. Display active loans list
2. Add "Ajukan Pinjaman" button
3. Show loan application modal with:
   - Product selection dropdown
   - Installment calculation table
   - Terms & conditions
4. Display loan history table:
   - Loan product name
   - Status (Active/Completed/Rejected)
   - Progress (5/12 periode)
   - Next due date
   - Action buttons
```

##### 2.2 Create Loan Application Modal
```jsx
// client/src/components/loans/LoanApplicationModal.jsx
Features:
- Step 1: Select loan product
- Step 2: Show calculation
  - Product price
  - Down payment
  - Loan amount
  - Monthly installment
  - Total payment
  - Payment schedule table
- Step 3: Confirmation & submit
```

##### 2.3 Create Loan Detail Modal
```jsx
// client/src/components/loans/LoanDetailModal.jsx
Display:
- Loan information
- Payment schedule with status per period
- Payment history
- Outstanding balance
- Next payment info
```

---

#### Phase 3: Frontend - Loan Payment Page

##### 3.1 Create Loans Page
```jsx
// client/src/pages/Loans.jsx
Similar to Savings.jsx but for loan payments:
- List all active loans with payment due
- Create payment modal
- Filter by member, status, date
- Pagination
- Summary statistics
```

##### 3.2 Create Loan Payment Components
```jsx
// client/src/components/loans/LoanPaymentModal.jsx
- Select loan (auto-fill from member)
- Show next payment period & amount
- Upload proof of payment
- Notes/description field

// client/src/components/loans/LoanTable.jsx
- Display loans with sorting & filtering
- Status badges
- Action buttons (pay, view, approve/reject)
```

---

#### Phase 4: Dashboard Integration

##### 4.1 Update Dashboard Statistics
```javascript
// server/src/controllers/admin/dashboard.controller.js
Add to getDashboard():
- totalLoanProducts // Jumlah produk pinjaman
- totalActiveLoans // Pinjaman aktif
- totalLoanDisbursed // Total pinjaman disalurkan
- totalLoanCollected // Total cicilan terkumpul
- overdueLoans // Pinjaman telat bayar
```

##### 4.2 Update Dashboard UI
```jsx
// client/src/pages/Dashboard.jsx
Add new stat cards:
- Total Produk Pinjaman
- Total Pinjaman Aktif
- Total Cicilan Terbayar
- Pinjaman Jatuh Tempo
```

---

### 🔥 Error Handling

#### Backend Errors
```javascript
// Validation errors
- Required fields validation
- Amount must be positive
- Tenor must be > 0
- Payment amount validation

// Business logic errors
- Cannot apply if have overdue loan
- Payment exceeds outstanding amount
- Invalid payment period
- Duplicate payment for same period

// System errors
- Database connection errors
- File upload errors
- Authentication errors
```

#### Frontend Errors
```javascript
// Display user-friendly messages
- Toast notifications for errors
- Modal validation before submit
- Confirmation dialogs for critical actions
- Loading states for async operations
- Empty states for no data
```

#### Error Response Format
```json
{
  "success": false,
  "message": "Error message in Indonesian",
  "errors": {
    "field": "Specific field error"
  }
}
```

---

### 💻 Tech Notes

#### Encoding & Headers
```javascript
// API Headers
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}",
  "Accept-Language": "id-ID"
}

// File Upload Headers (multipart/form-data)
{
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer {token}"
}

// Response encoding: UTF-8
// Database charset: UTF-8
```

#### Currency Formatting
```javascript
// Use existing formatCurrency utility
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};
```

#### Date Formatting
```javascript
// Use date-fns with Indonesian locale
import { format } from "date-fns";
import { id } from "date-fns/locale";

format(date, "dd MMMM yyyy", { locale: id })
// Output: "25 Desember 2024"
```

#### Font & UI Guidelines
```css
/* Following existing design system */
- Font: System fonts (Tailwind default)
- Primary color: Pink/Rose (#EC4899)
- Secondary: Purple (#A855F7)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Border radius: rounded-lg (0.5rem)
- Shadow: shadow-sm
```

#### File Structure
```
mern-koperasi/
├── server/
│   ├── src/
│   │   ├── models/
│   │   │   ├── loan.model.js (NEW)
│   │   │   └── loanPayment.model.js (NEW)
│   │   ├── controllers/
│   │   │   └── admin/
│   │   │       ├── loan.controller.js (NEW)
│   │   │       └── loanPayment.controller.js (NEW)
│   │   ├── routes/
│   │   │   ├── loan.routes.js (NEW)
│   │   │   └── loanPayment.routes.js (NEW)
│   │   └── validations/
│   │       └── loan.validation.js (NEW)
└── client/
    ├── src/
    │   ├── pages/
    │   │   ├── Loans.jsx (NEW)
    │   │   └── MemberDetail.jsx (UPDATE)
    │   ├── components/
    │   │   └── loans/ (NEW)
    │   │       ├── LoanApplicationModal.jsx
    │   │       ├── LoanDetailModal.jsx
    │   │       ├── LoanPaymentModal.jsx
    │   │       └── LoanTable.jsx
    │   └── api/
    │       └── loanApi.jsx (NEW)
```

#### Database Indexes
```javascript
// Optimize queries
loanSchema.index({ memberId: 1, status: 1 });
loanSchema.index({ status: 1, nextDueDate: 1 });
loanPaymentSchema.index({ loanId: 1, period: 1 });
loanPaymentSchema.index({ memberId: 1, status: 1 });
```

#### Security Considerations
- Validate all inputs server-side
- Sanitize file uploads (images only)
- Check user permissions for actions
- Rate limiting for API endpoints
- Audit trail for approvals/rejections
- Encrypt sensitive data in transit

#### Performance Optimization
- Pagination for large datasets
- Lazy loading for modals
- Debounce search inputs
- Cache member/product data
- Batch API calls where possible
- Use virtual scrolling for long lists

---

### 📊 Testing Checklist

#### Unit Tests
- [ ] Model validations
- [ ] Controller functions
- [ ] Calculation accuracy
- [ ] Date calculations

#### Integration Tests
- [ ] API endpoints
- [ ] Database operations
- [ ] File uploads
- [ ] Authentication flow

#### E2E Tests
- [ ] Loan application flow
- [ ] Payment flow
- [ ] Approval/rejection flow
- [ ] Dashboard statistics

#### Manual Tests
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Error scenarios
- [ ] Edge cases (0 amount, negative values)
- [ ] Concurrent user actions

---

### 🚀 Deployment Notes

1. **Database Migration**
   - Run schema migrations
   - Create indexes
   - Seed initial loan products

2. **Environment Variables**
   - No new env vars needed
   - Use existing JWT_SECRET, MONGO_URI

3. **File Storage**
   - Proof files stored in `/uploads/loans/`
   - Ensure directory permissions

4. **Monitoring**
   - Log loan applications
   - Track payment success rate
   - Monitor overdue loans

---

### 📝 Additional Notes

- Loan feature adalah kredit barang, bukan pinjaman uang
- Mirip dengan sistem simpanan tapi tanpa upgrade produk
- Fokus pada kemudahan tracking pembayaran cicilan
- UI/UX konsisten dengan design system existing
- Semua text dalam Bahasa Indonesia
- Timezone: Asia/Jakarta (UTC+7)

---

*Spec created: December 2024*
*Version: 1.0.0*
