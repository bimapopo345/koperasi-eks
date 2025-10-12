# Dashboard Loan Statistics Update Specification

## 📊 Dashboard Cards to Add

### 1. Total Produk Pinjaman
```javascript
// Backend: dashboard.controller.js
const totalLoanProducts = await LoanProduct.countDocuments({ isActive: true });

// Frontend: Dashboard.jsx
<StatCard
  title="Produk Pinjaman"
  value={stats.totalLoanProducts}
  icon="📦"
  color="bg-blue-100 text-blue-600"
/>
```

### 2. Total Pinjaman Aktif
```javascript
// Backend: dashboard.controller.js
const totalActiveLoans = await Loan.countDocuments({ 
  status: { $in: ["Active", "Approved"] }
});

// Frontend: Dashboard.jsx
<StatCard
  title="Pinjaman Aktif"
  value={stats.totalActiveLoans}
  icon="💳"
  color="bg-green-100 text-green-600"
/>
```

### 3. Total Cicilan Terbayar
```javascript
// Backend: dashboard.controller.js
const approvedPayments = await LoanPayment.aggregate([
  { $match: { status: "Approved" } },
  { $group: { 
    _id: null, 
    total: { $sum: "$amount" }
  }}
]);
const totalLoanCollected = approvedPayments[0]?.total || 0;

// Frontend: Dashboard.jsx
<StatCard
  title="Cicilan Terbayar"
  value={formatCurrency(stats.totalLoanCollected)}
  icon="✅"
  color="bg-emerald-100 text-emerald-600"
/>
```

### 4. Pinjaman Jatuh Tempo
```javascript
// Backend: dashboard.controller.js
const today = new Date();
const overdueLoans = await Loan.countDocuments({
  status: "Active",
  nextDueDate: { $lt: today }
});

// Frontend: Dashboard.jsx
<StatCard
  title="Jatuh Tempo"
  value={stats.overdueLoans}
  icon="⚠️"
  color="bg-red-100 text-red-600"
/>
```

## 📈 Additional Charts/Widgets

### Monthly Loan Statistics Chart
```javascript
// Similar to existing SavingsChart
<LoanChart 
  data={stats.monthlyLoanStats}
  title="Statistik Pinjaman Bulanan"
/>
```

### Recent Loan Activities
```javascript
// In Activity Feed section
{stats.recentLoanActivities.map((activity) => (
  <ActivityItem 
    key={activity.id} 
    activity={activity}
    type="loan"
  />
))}
```

## 🎯 Quick Actions to Add
```jsx
<button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg">
  <div className="flex items-center">
    <span className="text-blue-600 mr-3">💳</span>
    <span className="text-sm font-medium">Proses Cicilan Pinjaman</span>
  </div>
</button>

<button className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
  <div className="flex items-center">
    <span className="text-indigo-600 mr-3">📋</span>
    <span className="text-sm font-medium">Approval Pinjaman</span>
  </div>
</button>
```

## 📊 Summary Section Update
```javascript
// Add loan summary below savings summary
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
  <h4 className="text-sm font-semibold text-gray-700 mb-2">Ringkasan Pinjaman</h4>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <p className="text-xs text-gray-600">Total Disalurkan</p>
      <p className="text-lg font-bold text-blue-700">
        {formatCurrency(stats.totalLoanDisbursed)}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-600">Total Terkumpul</p>
      <p className="text-lg font-bold text-green-700">
        {formatCurrency(stats.totalLoanCollected)}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-600">Outstanding</p>
      <p className="text-lg font-bold text-orange-700">
        {formatCurrency(stats.totalOutstanding)}
      </p>
    </div>
  </div>
</div>
```

## 🔄 Backend Response Structure
```javascript
// Updated dashboard response
{
  success: true,
  data: {
    // Existing stats
    totalMembers: 150,
    totalSavings: 50000000,
    totalProducts: 5,
    activeSavingsCount: 120,
    
    // New loan stats
    totalLoanProducts: 8,
    totalActiveLoans: 45,
    totalLoanDisbursed: 250000000,
    totalLoanCollected: 75000000,
    totalOutstanding: 175000000,
    overdueLoans: 3,
    
    // Loan activities
    recentLoanActivities: [
      {
        id: "1",
        type: "payment",
        member: "John Doe",
        amount: 1000000,
        status: "Approved",
        date: "2024-12-25"
      }
    ],
    
    // Monthly stats for chart
    monthlyLoanStats: [
      { month: "Jan", disbursed: 20000000, collected: 5000000 },
      { month: "Feb", disbursed: 15000000, collected: 7000000 }
    ]
  }
}
```

## 🎨 Color Scheme for Loan Features
- Primary: Blue shades (`blue-500`, `blue-600`)
- Secondary: Indigo shades (`indigo-500`, `indigo-600`)
- Success: Green for approved/paid
- Warning: Orange for pending
- Danger: Red for overdue/rejected

## 📱 Mobile Responsive Considerations
- Stack cards vertically on mobile
- Use smaller font sizes for mobile
- Hide less important columns in tables
- Use bottom sheets for mobile modals

---

*This specification outlines the dashboard updates needed to support the loan feature*
