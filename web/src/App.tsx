import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
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
import Login from "./pages/Login";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

function Layout() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
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
          <li><Link to="/investment-recommendations">Investments</Link></li>
          <li><Link to="/financial-planning">Financial Planning</Link></li>
          <li><Link to="/tax-planning">Tax Planning</Link></li>
          <li><Link to="/import">Import CSV</Link></li>
        </ul>
        <div className="user-info">
          <p>{user.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
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
            <Route path="/investment-recommendations" element={<InvestmentRecommendations />} />
            <Route path="/financial-planning" element={<FinancialPlanning />} />
            <Route path="/tax-planning" element={<TaxPlanning />} />
            <Route path="/import" element={<Import />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
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
