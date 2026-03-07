import { useState, useEffect } from "react";
import { api } from "../api";
import type { Transaction, Account } from "../types";
import { format } from "date-fns";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    accountId: "",
    type: "expense" as "income" | "expense" | "transfer",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txns, accts] = await Promise.all([
        api("/transactions"),
        api("/accounts")
      ]);
      setTransactions(txns);
      setAccounts(accts);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      setShowForm(false);
      setFormData({
        accountId: "",
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Transaction"}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>New Transaction</h3>
          <form onSubmit={handleSubmit}>
            <select
              value={formData.accountId}
              onChange={e => setFormData({...formData, accountId: e.target.value})}
              required
            >
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name}</option>
              ))}
            </select>

            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
            />

            <input
              type="text"
              placeholder="Category"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            />

            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />

            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />

            <button type="submit">Add Transaction</button>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Account</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(txn => {
              const account = accounts.find(a => a._id === txn.accountId);
              return (
                <tr key={txn._id}>
                  <td>{format(new Date(txn.date), 'MMM d, yyyy')}</td>
                  <td>{txn.description || '-'}</td>
                  <td>{txn.category || 'Uncategorized'}</td>
                  <td>{account?.name || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${txn.type}`}>{txn.type}</span>
                  </td>
                  <td className={txn.type === 'expense' ? 'negative' : 'positive'}>
                    {txn.type === 'expense' ? '-' : '+'}${txn.amount.toFixed(2)}
                  </td>
                  <td>
                    <button onClick={() => handleDelete(txn._id)} className="btn-danger">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="empty-state">No transactions yet</p>}
      </div>
    </div>
  );
}
