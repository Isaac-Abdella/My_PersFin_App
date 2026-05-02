import { useState, useEffect } from "react";
import { api } from "../api";
import type { Account } from "../types";
import {
  TrendAreaChart,
  DonutChart,
  ComparisonBarChart,
  ProgressGauge,
  GaugeRow,
  MiniSparkline,
  fmtCAD,
  COLORS as C,
} from "../components/charts";

interface FinancialSnapshot {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  savingsRate: number;
  debtRatio: number;
  emergencyFundMonths: number;
  netWorthTrend: number;
  activeGoals: number;
  goalsProgress: number;
}

interface CashFlowMonth { month: string; income: number; expenses: number; net: number; }
interface AllocSlice    { name: string; value: number; color: string; }
interface SpendItem     { category: string; amount: number; }
interface BudgetRow     { category: string; budgeted: number; spent: number; isOverBudget: boolean; percentUsed: number; }

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  chequing: "Chequing", checking: "Checking", savings: "Savings",
  "credit-card": "Credit Card", "line-of-credit": "LOC",
  tfsa: "TFSA", rrsp: "RRSP", gic: "GIC",
  "student-loan": "Student Loan", mortgage: "Mortgage",
  "auto-loan": "Auto Loan", "personal-loan": "Personal Loan",
  investment: "Investment", other: "Other",
};

const LIABILITY_TYPES = new Set([
  "credit-card", "line-of-credit", "student-loan",
  "mortgage", "auto-loan", "personal-loan",
]);

export default function Dashboard() {
  const [accounts,         setAccounts]         = useState<Account[]>([]);
  const [snapshot,         setSnapshot]         = useState<FinancialSnapshot | null>(null);
  const [cashFlow,         setCashFlow]         = useState<CashFlowMonth[]>([]);
  const [allocation,       setAllocation]       = useState<AllocSlice[]>([]);
  const [spending,         setSpending]         = useState<SpendItem[]>([]);
  const [budgetComparison, setBudgetComparison] = useState<BudgetRow[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showAccountForm,  setShowAccountForm]  = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccount,       setNewAccount]       = useState({
    name: "", type: "chequing" as const, balance: "0", currency: "CAD",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [accountsData, snapshotData, cashFlowData, allocData, spendData, budgetData] =
        await Promise.all([
          api("/accounts"),
          api("/analytics/financial-snapshot").catch(() => null),
          api("/analytics/cash-flow-history?months=12").catch(() => []),
          api("/analytics/investment-allocation").catch(() => []),
          api("/analytics/spending-by-category").catch(() => ({ categories: [] })),
          api("/analytics/budget-comparison").catch(() => []),
        ]);
      setAccounts(accountsData);
      if (snapshotData) setSnapshot(snapshotData);
      setCashFlow(cashFlowData ?? []);
      setAllocation(allocData ?? []);
      setSpending((spendData?.categories ?? []).slice(0, 8));
      setBudgetComparison(budgetData ?? []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) { alert("Account name is required"); return; }
    try {
      if (editingAccountId) {
        await api(`/accounts/${editingAccountId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: newAccount.name, type: newAccount.type,
            balance: parseFloat(newAccount.balance), currency: newAccount.currency,
          }),
        });
      } else {
        await api("/accounts", {
          method: "POST",
          body: JSON.stringify({
            name: newAccount.name, type: newAccount.type,
            balance: parseFloat(newAccount.balance), currency: newAccount.currency,
          }),
        });
      }
      setNewAccount({ name: "", type: "chequing", balance: "0", currency: "CAD" });
      setEditingAccountId(null);
      setShowAccountForm(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save account");
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccountId(account._id);
    setNewAccount({
      name: account.name, type: account.type as any,
      balance: account.balance.toString(), currency: account.currency,
    });
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Delete this account? This cannot be undone.")) return;
    try {
      await api(`/accounts/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete account");
    }
  };

  const cancelEdit = () => {
    setEditingAccountId(null);
    setNewAccount({ name: "", type: "chequing", balance: "0", currency: "CAD" });
    setShowAccountForm(false);
  };

  const getBalanceLabel = (account: Account) =>
    LIABILITY_TYPES.has(account.type)
      ? `Owing: ${fmtCAD(Math.abs(account.balance))}`
      : fmtCAD(account.balance);

  if (loading) return <div className="loading">Loading...</div>;

  const netFlowSpark = cashFlow.map(m => m.net);

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <button onClick={() =>
          showAccountForm && !editingAccountId ? cancelEdit() : setShowAccountForm(!showAccountForm)
        }>
          {showAccountForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {/* ── Account Form ───────────────────────────────────────── */}
      {showAccountForm && (
        <div className="card form-card">
          <h3>{editingAccountId ? "Edit Account" : "Create New Account"}</h3>
          <form onSubmit={handleCreateAccount} className="form">
            <label>
              Account Name:
              <input type="text" placeholder="e.g., My Chequing Account" value={newAccount.name}
                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} required />
            </label>
            <label>
              Account Type:
              <select value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value as any })}>
                <optgroup label="Savings & Chequing">
                  <option value="chequing">Chequing</option>
                  <option value="savings">Savings</option>
                </optgroup>
                <optgroup label="Credit & LOC">
                  <option value="credit-card">Credit Card</option>
                  <option value="line-of-credit">Line of Credit</option>
                </optgroup>
                <optgroup label="Registered Accounts">
                  <option value="tfsa">TFSA (Tax-Free Savings Account)</option>
                  <option value="rrsp">RRSP (Registered Retirement Savings)</option>
                  <option value="gic">GIC (Guaranteed Investment Certificate)</option>
                </optgroup>
                <optgroup label="Loans & Debts">
                  <option value="student-loan">Student Loan</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="auto-loan">Auto Loan</option>
                  <option value="personal-loan">Personal Loan</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </optgroup>
              </select>
            </label>
            <label>
              Initial Balance:
              <input type="number" step="0.01" placeholder="0.00" value={newAccount.balance}
                onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })} />
            </label>
            <label>
              Currency:
              <select value={newAccount.currency} onChange={e => setNewAccount({ ...newAccount, currency: e.target.value })}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit">{editingAccountId ? "Update Account" : "Create Account"}</button>
              {editingAccountId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel Edit</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Accounts Table ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>My Accounts</h3>
        {accounts.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th>Currency</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account._id}>
                    <td style={{ fontWeight: 500 }}>{account.name}</td>
                    <td>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</td>
                    <td style={{ textAlign: "right" }}>{getBalanceLabel(account)}</td>
                    <td>{account.currency}</td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => handleEditAccount(account)}
                        className="btn-primary btn-sm" style={{ marginRight: "0.4rem" }}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteAccount(account._id!)} className="btn-danger btn-sm">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#9CA3AF", margin: "0.5rem 0 0" }}>
            No accounts yet. Create one above!
          </p>
        )}
      </div>

      {/* ── Hero KPI Cards ─────────────────────────────────────── */}
      {snapshot && (
        <div className="card-grid" style={{ marginBottom: "1rem" }}>

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>Net Worth</h3>
            <p className={`amount ${snapshot.netWorth >= 0 ? "positive" : "negative"}`}
               style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.6rem" }}>
              {fmtCAD(snapshot.netWorth)}
            </p>
            <small style={{ color: snapshot.netWorthTrend >= 0 ? "#10B981" : "#EF4444" }}>
              {snapshot.netWorthTrend >= 0 ? "▲" : "▼"} {fmtCAD(Math.abs(snapshot.netWorthTrend))} vs last month
            </small>
          </div>

          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ marginTop: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>Monthly Cash Flow</h3>
              <p className={`amount ${snapshot.monthlyCashFlow >= 0 ? "positive" : "negative"}`}
                 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.6rem" }}>
                {fmtCAD(snapshot.monthlyCashFlow)}
              </p>
              <small style={{ color: "#6B7280" }}>
                {fmtCAD(snapshot.monthlyIncome)} in · {fmtCAD(snapshot.monthlyExpenses)} out
              </small>
            </div>
            {netFlowSpark.length >= 2 && (
              <MiniSparkline
                data={netFlowSpark}
                color={snapshot.monthlyCashFlow >= 0 ? C.income : C.expense}
                width={80}
                height={40}
              />
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>Savings Rate</h3>
            <p className="amount" style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.6rem" }}>
              {snapshot.savingsRate.toFixed(1)}%
            </p>
            <small style={{
              color: snapshot.savingsRate >= 20 ? "#10B981"
                   : snapshot.savingsRate >= 10 ? "#F59E0B"
                   : "#EF4444",
            }}>
              {snapshot.savingsRate >= 20 ? "On track" : snapshot.savingsRate >= 10 ? "Below target" : "Needs attention"} · target 20%+
            </small>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>Total Debt</h3>
            <p className="amount negative" style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.6rem" }}>
              {fmtCAD(snapshot.totalDebt)}
            </p>
            <small style={{
              color: snapshot.debtRatio <= 30 ? "#10B981"
                   : snapshot.debtRatio <= 50 ? "#F59E0B"
                   : "#EF4444",
            }}>
              Debt-to-assets: {snapshot.debtRatio.toFixed(1)}%
            </small>
          </div>
        </div>
      )}

      {/* ── 12-Month Cash Flow ─────────────────────────────────── */}
      {cashFlow.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>12-Month Cash Flow</h3>
          <TrendAreaChart
            data={cashFlow}
            xKey="month"
            series={[
              { key: "income",   label: "Income",   color: C.income  },
              { key: "expenses", label: "Expenses",  color: C.expense },
              { key: "net",      label: "Net",       color: C.net, dashed: true },
            ]}
            height={240}
          />
        </div>
      )}

      {/* ── Spending + Allocation ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Spending by Category</h3>
          <DonutChart
            data={spending.map(s => ({ name: s.category, value: s.amount }))}
            height={280}
            showLabels
          />
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Investment Allocation</h3>
          <DonutChart
            data={allocation}
            height={280}
            centerLabel="Invested"
          />
        </div>
      </div>

      {/* ── Budget vs Actual ───────────────────────────────────── */}
      {budgetComparison.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Budget vs Actual</h3>
          <ComparisonBarChart
            data={budgetComparison}
            xKey="category"
            bars={[
              { key: "budgeted", label: "Budget", color: C.net     },
              { key: "spent",    label: "Spent",  color: C.expense },
            ]}
            layout="vertical"
            height={Math.max(200, budgetComparison.length * 38)}
            showLegend
          />
        </div>
      )}

      {/* ── Financial Health Gauges ────────────────────────────── */}
      {snapshot && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Financial Health</h3>
          <GaugeRow>
            <ProgressGauge
              value={Math.min(snapshot.savingsRate, 100)}
              label="Savings Rate"
              sublabel="Target: 20%+"
              warnAt={10}
              dangerAt={20}
            />
            <ProgressGauge
              value={Math.min(snapshot.debtRatio, 100)}
              label="Debt Ratio"
              sublabel="Lower is better"
              warnAt={30}
              dangerAt={50}
              invertScale
            />
            <ProgressGauge
              value={Math.min((snapshot.emergencyFundMonths / 6) * 100, 100)}
              label="Emergency Fund"
              sublabel={`${snapshot.emergencyFundMonths.toFixed(1)} / 6 months`}
              warnAt={50}
              dangerAt={80}
            />
            <ProgressGauge
              value={Math.min(snapshot.goalsProgress, 100)}
              label="Goals Progress"
              sublabel={`${snapshot.activeGoals} active goal${snapshot.activeGoals !== 1 ? "s" : ""}`}
              warnAt={30}
              dangerAt={60}
            />
          </GaugeRow>
        </div>
      )}

      {/* ── Budget Alerts ──────────────────────────────────────── */}
      {budgetComparison.some(b => b.isOverBudget) && (
        <div className="alert-card">
          <h3>⚠️ Budget Alerts</h3>
          {budgetComparison.filter(b => b.isOverBudget).map(budget => (
            <div key={budget.category} className="alert-item">
              <strong>{budget.category}</strong>: Over budget by {fmtCAD(budget.spent - budget.budgeted)} ({budget.percentUsed}%)
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
