import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Transaction, Account } from "../types";
import { format } from "date-fns";

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    accountId: "",
    type: "expense" as "income" | "expense" | "transfer",
    amount: "",
    category: "",
    description: "",
    date: ""
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [txn, accts] = await Promise.all([
        api(`/transactions/${id}`),
        api("/accounts")
      ]);
      setTransaction(txn);
      setAccounts(accts);
      setFormData({
        accountId: txn.accountId,
        type: txn.type,
        amount: txn.amount.toString(),
        category: txn.category || "",
        description: txn.description || "",
        date: txn.date.split('T')[0]
      });
    } catch (err) {
      console.error("Failed to load transaction", err);
      alert("Failed to load transaction");
      navigate("/transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !transaction) return;

    try {
      await api(`/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      alert("Transaction updated successfully");
      navigate("/transactions");
    } catch (err: any) {
      alert(err.message || "Failed to update transaction");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!transaction) return <div className="loading">Transaction not found</div>;

  const account = accounts.find(a => a._id === transaction.accountId);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Edit Transaction</h1>
      </div>

      <div className="card">
        <div className="transaction-info">
          <p><strong>Account:</strong> {account?.name}</p>
          <p><strong>Original Amount:</strong> ${transaction.amount.toFixed(2)}</p>
          <p><strong>Created:</strong> {format(new Date(transaction.date), 'PPP')}</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Account:
            <select
              value={formData.accountId}
              onChange={e => setFormData({...formData, accountId: e.target.value})}
              required
            >
              <option value="">Select Account</option>
              {accounts.map(acc => {
                const typeLabels: {[key: string]: string} = {
                  "chequing": "Chequing",
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
                const typeLabel = typeLabels[acc.type] || acc.type;
                return (
                  <option key={acc._id} value={acc._id}>{acc.name} ({typeLabel})</option>
                );
              })}
            </select>
          </label>

          <label>
            Type:
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>

          <label>
            Amount:
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
            />
          </label>

          <label>
            Category:
            <input
              type="text"
              placeholder="Category"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            />
          </label>

          <label>
            Description:
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </label>

          <label>
            Date:
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </label>

          <div className="form-buttons">
            <button type="submit" className="btn">Update Transaction</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/transactions")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
