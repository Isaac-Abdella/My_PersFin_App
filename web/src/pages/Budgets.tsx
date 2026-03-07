import { useState, useEffect } from "react";
import { api } from "../api";
import type { Budget } from "../types";

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    period: "monthly" as "weekly" | "monthly" | "yearly",
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const data = await api("/budgets");
      setBudgets(data);
    } catch (err) {
      console.error("Failed to load budgets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/budgets", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      setShowForm(false);
      setFormData({
        category: "",
        amount: "",
        period: "monthly",
        startDate: new Date().toISOString().split('T')[0]
      });
      loadBudgets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    try {
      await api(`/budgets/${id}`, { method: "DELETE" });
      loadBudgets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Budgets</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Budget"}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>New Budget</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Category (e.g., Groceries)"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
            />

            <select
              value={formData.period}
              onChange={e => setFormData({...formData, period: e.target.value as any})}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            <input
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
            />

            <button type="submit">Add Budget</button>
          </form>
        </div>
      )}

      <div className="card-grid">
        {budgets.map(budget => (
          <div key={budget._id} className="card">
            <div className="card-header">
              <h3>{budget.category}</h3>
              <button onClick={() => handleDelete(budget._id)} className="btn-danger">×</button>
            </div>
            <p className="amount">${budget.amount.toFixed(2)}</p>
            <p className="period">{budget.period}</p>
            <small>Started: {new Date(budget.startDate).toLocaleDateString()}</small>
          </div>
        ))}
      </div>

      {budgets.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No budgets yet. Create one to track your spending!</p>
        </div>
      )}
    </div>
  );
}
