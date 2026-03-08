import { useState, useEffect } from "react";
import { api } from "../api";
import type { FinancialOverview, SpendingByCategory, BudgetComparison, Account } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Dashboard() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "chequing" as const,
    balance: "0",
    currency: "CAD"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Recalculate credit card balances first
      try {
        await api("/accounts/recalculate-credit-card-balances", {
          method: "POST"
        });
      } catch (err) {
        console.log("Note: Credit card balance recalculation not needed or already up to date");
      }

      const [overviewData, spendingData, budgetData, accountsData] = await Promise.all([
        api("/analytics/overview"),
        api("/analytics/spending-by-category"),
        api("/analytics/budget-comparison"),
        api("/accounts")
      ]);
      setOverview(overviewData);
      setSpending(spendingData.categories.slice(0, 6)); // Top 6 categories
      setBudgetComparison(budgetData);
      setAccounts(accountsData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) {
      alert("Account name is required");
      return;
    }

    try {
      if (editingAccountId) {
        // Update existing account
        await api(`/accounts/${editingAccountId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            currency: newAccount.currency
          })
        });
        alert("Account updated successfully");
      } else {
        // Create new account
        await api("/accounts", {
          method: "POST",
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            currency: newAccount.currency
          })
        });
        alert("Account created successfully");
      }
      setNewAccount({ name: "", type: "chequing", balance: "0", currency: "CAD" });
      setEditingAccountId(null);
      setShowAccountForm(false);
      loadData(); // Reload dashboard to update overview
    } catch (err: any) {
      alert(err.message || "Failed to save account");
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccountId(account._id);
    setNewAccount({
      name: account.name,
      type: account.type as any,
      balance: account.balance.toString(),
      currency: account.currency
    });
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Delete this account? This cannot be undone.")) return;
    try {
      await api(`/accounts/${id}`, { method: "DELETE" });
      alert("Account deleted successfully");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete account");
    }
  };

  const getBalanceLabel = (account: Account): string => {
    if (account.type === "credit-card") {
      return `Amount Owing: $${account.balance.toFixed(2)}`;
    }
    return `$${account.balance.toFixed(2)}`;
  };

  const cancelEdit = () => {
    setEditingAccountId(null);
    setNewAccount({ name: "", type: "chequing", balance: "0", currency: "CAD" });
    setShowAccountForm(false);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button onClick={() => {
          if (showAccountForm && !editingAccountId) {
            cancelEdit();
          } else {
            setShowAccountForm(!showAccountForm);
          }
        }}>
          {showAccountForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {showAccountForm && (
        <div className="card form-card">
          <h3>{editingAccountId ? "Edit Account" : "Create New Account"}</h3>
          <form onSubmit={handleCreateAccount} className="form">
            <label>
              Account Name:
              <input
                type="text"
                placeholder="e.g., My Chequing Account"
                value={newAccount.name}
                onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                required
              />
            </label>

            <label>
              Account Type:
              <select
                value={newAccount.type}
                onChange={e => setNewAccount({...newAccount, type: e.target.value as any})}
              >
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
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccount.balance}
                onChange={e => setNewAccount({...newAccount, balance: e.target.value})}
              />
            </label>

            <label>
              Currency:
              <select
                value={newAccount.currency}
                onChange={e => setNewAccount({...newAccount, currency: e.target.value})}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <div className="form-actions">
              <button type="submit">{editingAccountId ? "Update Account" : "Create Account"}</button>
              {editingAccountId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="card-grid" style={{ gridColumn: "1 / -1" }}>
        <div className="card">
          <h3>My Accounts</h3>
          {accounts.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem"
              }}>
                <thead>
                  <tr style={{
                    borderBottom: "2px solid #e0e0e0",
                    textAlign: "left"
                  }}>
                    <th style={{ padding: "0.75rem", fontWeight: "600" }}>Account Name</th>
                    <th style={{ padding: "0.75rem", fontWeight: "600" }}>Type</th>
                    <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "right" }}>Balance</th>
                    <th style={{ padding: "0.75rem", fontWeight: "600" }}>Currency</th>
                    <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account._id} style={{
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      <td style={{ padding: "0.75rem" }}>{account.name}</td>
                      <td style={{ padding: "0.75rem" }}>
                        {(() => {
                          const typeLabels: {[key: string]: string} = {
                            "chequing": "Chequing",
                            "checking": "Checking",
                            "savings": "Savings",
                            "credit-card": "Credit Card",
                            "tfsa": "TFSA",
                            "rrsp": "RRSP",
                            "gic": "GIC",
                            "line-of-credit": "LOC",
                            "student-loan": "Student Loan",
                            "mortgage": "Mortgage",
                            "auto-loan": "Auto Loan",
                            "personal-loan": "Personal Loan",
                            "investment": "Investment",
                            "other": "Other"
                          };
                          return typeLabels[account.type] || account.type;
                        })()}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "500" }}>
                        {getBalanceLabel(account)}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{account.currency}</td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="btn-primary"
                          style={{ marginRight: "0.5rem" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account._id!)}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#999", marginTop: "1rem" }}>No accounts yet. Create one above!</p>
          )}
        </div>
      </div>

      {overview && (
        <div className="card-grid">
          <div className="card">
            <h3>Net Worth</h3>
            <p className="amount">${overview.netWorth.toFixed(2)}</p>
            <small>Assets - Debts</small>
          </div>
          <div className="card">
            <h3>Total Balance</h3>
            <p className="amount">${overview.totalBalance.toFixed(2)}</p>
            <small>{overview.accountsCount} accounts</small>
          </div>
          <div className="card">
            <h3>Total Debt</h3>
            <p className="amount negative">${overview.totalDebt.toFixed(2)}</p>
            <small>{overview.debtsCount} debts</small>
          </div>
          <div className="card">
            <h3>Monthly Savings</h3>
            <p className="amount">${overview.monthlySavings.toFixed(2)}</p>
            <small>{overview.savingsRate}% savings rate</small>
          </div>
        </div>
      )}

      <div className="dashboard-row">
        <div className="card chart-card">
          <h3>Spending by Category</h3>
          {spending.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spending}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.category}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {spending.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No spending data available</p>
          )}
        </div>

        <div className="card chart-card">
          <h3>Budget vs Actual</h3>
          {budgetComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetComparison}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="budgeted" fill="#8884d8" name="Budget" />
                <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No budget data available</p>
          )}
        </div>
      </div>

      {budgetComparison.some(b => b.isOverBudget) && (
        <div className="alert-card">
          <h3>⚠️ Budget Alerts</h3>
          {budgetComparison.filter(b => b.isOverBudget).map(budget => (
            <div key={budget.category} className="alert-item">
              <strong>{budget.category}</strong>: Over budget by ${(budget.spent - budget.budgeted).toFixed(2)} ({budget.percentUsed}%)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
