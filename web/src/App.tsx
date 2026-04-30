import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import Budgets from "./pages/Budgets";
import Debts from "./pages/Debts";
import Accounts from "./pages/Accounts";
import Import from "./pages/Import";
import { TaxPlanning } from "./pages/TaxPlanning";
import DebtOptimization from "./pages/DebtOptimization";
import InvestmentRecommendations from "./pages/InvestmentRecommendations";
import FinancialPlanning from "./pages/FinancialPlanning";
import Goals from "./pages/Goals";
import Bills from "./pages/Bills";
import NetWorth from "./pages/NetWorth";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Header from "./components/Header";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

function Layout() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Header />
      <div className="app-container">
        <nav className="sidebar">
          <h2>PersFin</h2>
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/accounts">Accounts</Link></li>
            <li><Link to="/transactions">Transactions</Link></li>
            <li><Link to="/budgets">Budgets</Link></li>
            <li><Link to="/debts">Debts</Link></li>
            <li><Link to="/debt-optimization">Debt Optimization</Link></li>
            <li><Link to="/goals">Goals</Link></li>
            <li><Link to="/net-worth">Net Worth</Link></li>
            <li><Link to="/bills">Bills</Link></li>
            <li><Link to="/investment-recommendations">Investments</Link></li>
            <li><Link to="/financial-planning">Financial Planning</Link></li>
            <li><Link to="/tax-planning">Tax Planning</Link></li>
            <li><Link to="/import">Import CSV</Link></li>
          </ul>
        </nav>
        <main className="main-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transactions/:id" element={<TransactionDetail />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/debt-optimization" element={<DebtOptimization setCurrentPage={() => {}} />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/net-worth" element={<NetWorth />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/investment-recommendations" element={<InvestmentRecommendations />} />
              <Route path="/financial-planning" element={<FinancialPlanning />} />
              <Route path="/tax-planning" element={<TaxPlanning />} />
              <Route path="/import" element={<Import />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
