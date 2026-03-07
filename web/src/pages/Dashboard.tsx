import { useState, useEffect } from "react";
import { api } from "../api";
import type { FinancialOverview, SpendingByCategory, BudgetComparison } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Dashboard() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, spendingData, budgetData] = await Promise.all([
        api("/analytics/overview"),
        api("/analytics/spending-by-category"),
        api("/analytics/budget-comparison")
      ]);
      setOverview(overviewData);
      setSpending(spendingData.categories.slice(0, 6)); // Top 6 categories
      setBudgetComparison(budgetData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h1>Dashboard</h1>

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
