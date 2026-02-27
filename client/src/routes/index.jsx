import {
  createBrowserRouter,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import MainLayout from "../Layout/MainLayout";
import AuthLayout from "../Layout/AuthLayout";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Members from "../pages/Members.jsx";
import MemberDetail from "../pages/MemberDetail.jsx";
import Products from "../pages/Products.jsx";
import Savings from "../pages/Savings.jsx";
import Loans from "../pages/Loans.jsx";
import LoanProducts from "../pages/LoanProducts.jsx";
import LoanManagement from "../pages/LoanManagement.jsx";
import Settings from "../pages/Settings.jsx";
import Reports from "../pages/Reports.jsx";
import PrivateRoute from "../utils/PrivateRoute.jsx";
import ChartOfAccounts from "../pages/accounting/ChartOfAccounts.jsx";
import Transactions from "../pages/accounting/Transactions.jsx";
import ReconciliationPage from "../pages/accounting/Reconciliation.jsx";
import SalesTaxes from "../pages/accounting/SalesTaxes.jsx";
import ProfitLoss from "../pages/accounting/reports/ProfitLoss.jsx";
import BalanceSheet from "../pages/accounting/reports/BalanceSheet.jsx";
import AccountTransactions from "../pages/accounting/reports/AccountTransactions.jsx";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Auth Layout - untuk halaman login tanpa sidebar/header */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Main Layout - untuk halaman dengan sidebar/header (Protected) */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master/anggota" element={<Members />} />
        <Route path="/master/anggota/:uuid" element={<MemberDetail />} />
        <Route path="/master/produk" element={<Products />} />
        <Route path="/master/loan-products" element={<LoanProducts />} />
        <Route path="/simpanan" element={<Savings />} />
        <Route path="/pinjaman" element={<Loans />} />
        <Route path="/loan-management" element={<LoanManagement />} />
        <Route path="/laporan" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/akuntansi/transaksi" element={<Transactions />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/upload" element={<Transactions />} />
        <Route path="/reports/profit-loss" element={<ProfitLoss />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="/reports/account-transactions" element={<AccountTransactions />} />
        <Route path="/akuntansi/rekonsiliasi" element={<ReconciliationPage />} />
        <Route path="/akuntansi/coa" element={<ChartOfAccounts />} />
        <Route path="/akuntansi/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="/chart-of-accounts/create" element={<ChartOfAccounts />} />
        <Route path="/chart-of-accounts/edit/:id" element={<ChartOfAccounts />} />
        <Route path="/chart-of-accounts/delete/:id" element={<ChartOfAccounts />} />
        <Route path="/chart-of-accounts/:type" element={<ChartOfAccounts />} />
        <Route path="/akuntansi/pajak" element={<SalesTaxes />} />
      </Route>
    </Route>
  )
);

export { router };
