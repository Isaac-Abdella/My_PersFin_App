import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Transaction, Account } from "../types";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 100;

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Transaction[][]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
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
      setCurrentPage(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transactions";
      console.error(message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add transaction";
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete transaction";
      alert(message);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) return;
    try {
      await api("/transactions", { method: "DELETE" });
      loadData();
      alert("All transactions have been deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete all transactions";
      alert(message);
    }
  };

  const handleDeleteSelected = async () => {
    const selectedArray = Array.from(selectedTransactions);
    const isAllSelected = selectedArray.length === transactions.length;
    
    const confirmMessage = isAllSelected 
      ? `Delete all ${selectedArray.length} transactions? This cannot be undone.`
      : `Delete ${selectedArray.length} selected transaction(s)? This cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      await api("/transactions", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedArray })
      });
      loadData();
      setSelectedTransactions(new Set());
      alert(`${selectedArray.length} transaction(s) deleted successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete selected transactions";
      alert(message);
    }
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t._id)));
    }
  };

  const handleFindDuplicates = async () => {
    if (!selectedAccount) {
      alert("Please select an account to find duplicates for");
      return;
    }
    
    try {
      const result = await api(`/import/duplicates/${selectedAccount}`);
      setDuplicateGroups(result.duplicateGroups || []);
      setShowDuplicates(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to find duplicates";
      alert("Failed to find duplicates: " + message);
    }
  };

  const handleDeleteDuplicate = async (id: string) => {
    if (!confirm("Delete this duplicate transaction?")) return;
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      // Refresh duplicates list
      if (selectedAccount) {
        const result = await api(`/import/duplicates/${selectedAccount}`);
        setDuplicateGroups(result.duplicateGroups || []);
      }
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete transaction";
      alert("Failed to delete transaction: " + message);
    }
  };

  const handleDeleteAllDuplicates = async () => {
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
    if (!confirm(`Delete all ${totalDuplicates} duplicate transactions? This cannot be undone.`)) return;
    
    try {
      // Delete all duplicates (keeping the first in each group)
      for (const group of duplicateGroups) {
        for (let i = 1; i < group.length; i++) {
          await api(`/transactions/${group[i]._id}`, { method: "DELETE" });
        }
      }
      setDuplicateGroups([]);
      setShowDuplicates(false);
      loadData();
      alert("All duplicates have been deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete duplicates";
      alert("Failed to delete duplicates: " + message);
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Transaction"}
          </button>
          <button onClick={() => setShowDuplicates(!showDuplicates)} className="btn-secondary">
            🔍 Find Duplicates
          </button>
          {selectedTransactions.size > 0 && (
            <button onClick={handleDeleteSelected} className="btn-danger" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>
              Delete Selected ({selectedTransactions.size})
            </button>
          )}
        </div>
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

            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as "income" | "expense" | "transfer"})}
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

      {showDuplicates && (
        <div className="card">
          <h3>Find & Delete Duplicate Transactions</h3>
          <label style={{ marginBottom: '1rem', display: 'block' }}>
            Select Account to Check for Duplicates:
            <select 
              value={selectedAccount} 
              onChange={e => setSelectedAccount(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            >
              <option value="">-- All Accounts --</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name}</option>
              ))}
            </select>
          </label>
          <button onClick={handleFindDuplicates} className="btn-primary" style={{ marginRight: '0.5rem' }}>
            🔎 Search for Duplicates
          </button>
          <button onClick={() => {
            setShowDuplicates(false);
            setDuplicateGroups([]);
          }} className="btn-secondary">
            Close
          </button>

          {duplicateGroups.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                Found {duplicateGroups.length} group(s) of duplicates ({duplicateGroups.reduce((sum, g) => sum + g.length, 0)} total transactions)
              </p>
              {duplicateGroups.length > 0 && (
                <button onClick={handleDeleteAllDuplicates} className="btn-danger" style={{ marginBottom: '1rem' }}>
                  🗑️ Delete All Duplicates (Keep First)
                </button>
              )}
              
              {duplicateGroups.map((group, groupIdx) => (
                <div key={groupIdx} style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fff9e6'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Duplicate Group {groupIdx + 1} - {group[0].description} (${group[0].amount.toFixed(2)})
                  </p>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Amount</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Category</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((tx: Transaction, idx: number) => (
                        <tr key={tx._id} style={{
                          backgroundColor: idx === 0 ? '#e6f9e6' : '#fff',
                          borderBottom: '1px solid #eee'
                        }}>
                          <td style={{ padding: '0.5rem' }}>
                            {format(new Date(tx.date), 'MMM d, yyyy')}
                            {idx === 0 && <span style={{ marginLeft: '0.5rem', color: 'green', fontWeight: 'bold' }}>(KEPT)</span>}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{tx.description}</td>
                          <td style={{ padding: '0.5rem' }}>${tx.amount.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem' }}>{tx.category || '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                            {idx > 0 && (
                              <button
                                onClick={() => handleDeleteDuplicate(tx._id)}
                                className="btn-danger"
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {duplicateGroups.length === 0 && selectedAccount && (
            <p style={{ marginTop: '1rem', color: '#666' }}>✅ No duplicates found for this account!</p>
          )}
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedTransactions.has(t._id))}
                  onChange={handleSelectAll}
                />
              </th>
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
            {paginatedTransactions.map(txn => {
              const account = accounts.find(a => a._id === txn.accountId);
              const isSelected = selectedTransactions.has(txn._id);
              return (
                <tr key={txn._id} style={{ backgroundColor: isSelected ? '#f0f0f0' : 'transparent' }}>
                  <td style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectTransaction(txn._id)}
                    />
                  </td>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => navigate(`/transactions/${txn._id}`)} className="btn-primary btn-sm">Edit</button>
                      <button onClick={() => handleDelete(txn._id)} className="btn-danger btn-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="empty-state">No transactions yet</p>}
        
        {transactions.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={goToFirstPage} 
                disabled={currentPage === 1}
                className="btn-secondary"
              >
                First Page
              </button>
              <button 
                onClick={goToPreviousPage} 
                disabled={currentPage === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <button 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
                className="btn-secondary"
              >
                Next
              </button>
              <button 
                onClick={goToLastPage} 
                disabled={currentPage === totalPages}
                className="btn-secondary"
              >
                Last Page
              </button>
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
              <div>Page {currentPage} of {totalPages} | Showing {startIndex + 1} - {Math.min(endIndex, transactions.length)} of {transactions.length}</div>
              {selectedTransactions.size > 0 && (
                <div style={{ marginTop: '0.5rem', color: 'var(--primary)', fontWeight: '500' }}>
                  {selectedTransactions.size} transaction(s) selected
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
