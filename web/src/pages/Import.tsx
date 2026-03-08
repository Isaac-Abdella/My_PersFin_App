import { useState, useEffect } from "react";
import { api } from "../api";
import type { Account } from "../types";

export default function Import() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [detectedDuplicates, setDetectedDuplicates] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedDuplicatesToKeep, setSelectedDuplicatesToKeep] = useState<Set<string>>(new Set());
  const [duplicateHandlingMode, setDuplicateHandlingMode] = useState<"skip" | "keep" | "review">("skip");
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "chequing" as const,
    balance: 0,
    currency: "CAD"
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await api("/accounts");
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccount(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api("/accounts", {
        method: "POST",
        body: JSON.stringify(newAccount)
      });
      setAccounts([...accounts, created]);
      setSelectedAccount(created._id);
      setShowAccountForm(false);
      setNewAccount({ name: "", type: "chequing", balance: 0, currency: "CAD" });
    } catch (err) {
      alert("Failed to create account");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setDetectedDuplicates([]);
      setShowDuplicateModal(false);
      setSelectedDuplicatesToKeep(new Set());
    }
  };

  const performDryRun = async (uploadFile: File): Promise<{ duplicates: any[]; hasDuplicates: boolean }> => {
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("accountId", selectedAccount);
      formData.append("dryRun", "true");

      const res = await fetch("http://localhost:3000/import/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      return {
        duplicates: data.duplicateDetails || [],
        hasDuplicates: (data.duplicateDetails || []).length > 0
      };
    } catch (err: any) {
      console.error("Dry run error:", err);
      throw err;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedAccount) {
      alert("Please select a file and account");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // First, do a dry run to detect duplicates
      const { duplicates, hasDuplicates } = await performDryRun(file);

      if (hasDuplicates) {
        // Show modal with duplicate options
        setDetectedDuplicates(duplicates);
        setShowDuplicateModal(true);
        setDuplicateHandlingMode("skip");
        setSelectedDuplicatesToKeep(new Set());
        setImporting(false);
        return;
      }

      // No duplicates, proceed with import
      await performActualImport(file, []);
    } catch (err: any) {
      alert("Error detecting duplicates: " + (err.message || "Unknown error"));
      setImporting(false);
    }
  };

  const performActualImport = async (uploadFile: File, skipDuplicateIds: string[]) => {
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("accountId", selectedAccount);
      formData.append("dryRun", "false");
      formData.append("skipDuplicateIds", JSON.stringify(skipDuplicateIds));

      const res = await fetch("http://localhost:3000/import/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setResult(data);
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setShowDuplicateModal(false);
      setDetectedDuplicates([]);
    } catch (err: any) {
      alert("Import error: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  };

  const handleDuplicateDecision = (mode: "skip" | "keep" | "review") => {
    if (mode === "skip") {
      // Skip all duplicates
      performActualImport(file!, detectedDuplicates.map(d => d.key));
    } else if (mode === "keep") {
      // Keep all duplicates
      performActualImport(file!, []);
    } else {
      // Review mode - let user choose
      setDuplicateHandlingMode("review");
    }
  };

  const handleToggleDuplicate = (key: string) => {
    const newSelected = new Set(selectedDuplicatesToKeep);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedDuplicatesToKeep(newSelected);
  };

  const handleConfirmReview = () => {
    // Collect IDs to skip (those NOT selected to keep)
    const skipIds = detectedDuplicates
      .map(d => d.key)
      .filter(key => !selectedDuplicatesToKeep.has(key));
    performActualImport(file!, skipIds);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch("http://localhost:3000/import/template", {
        credentials: "include"
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transaction_template.csv";
      a.click();
    } catch (err: any) {
      alert("Failed to download template");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (accounts.length === 0) {
    return (
      <div className="page">
        <h1>Import CSV</h1>
        <div className="card">
          <div className="empty-state">
            <h3>📊 No Bank Accounts Yet</h3>
            <p>To import transactions, you first need to create a bank account (like your checking or savings account).</p>
            
            {!showAccountForm ? (
              <button onClick={() => setShowAccountForm(true)} className="btn">
                + Create Bank Account
              </button>
            ) : (
              <form onSubmit={handleCreateAccount} className="form">
                <h4>Create New Bank Account</h4>
                <label>
                  Account Name:
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                    placeholder="e.g., My Checking Account"
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
                  Current Balance:
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.balance}
                    onChange={e => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </label>

                <div className="form-actions">
                  <button type="submit" className="btn">Create Account</button>
                  <button type="button" onClick={() => setShowAccountForm(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Import Transactions from CSV</h1>

      <div className="card">
        <h3>Upload CSV File</h3>
        <p>Import your bank transactions from a CSV file. The CSV should have columns: DATE, DESCRIPTION, DEBIT, CREDIT, BALANCE.</p>
        
        <button onClick={downloadTemplate} className="btn-secondary">
          📥 Download CSV Template
        </button>

        <form onSubmit={handleUpload} className="import-form">
          <label>
            Select Account:
            <select 
              value={selectedAccount} 
              onChange={e => setSelectedAccount(e.target.value)}
              required
            >
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} - ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Choose CSV File:
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              required
            />
          </label>

          {file && (
            <div className="file-info">
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}

          <button type="submit" disabled={importing || !file}>
            {importing ? "Importing..." : "Upload and Import"}
          </button>
        </form>

        {/* Duplicate Detection Modal */}
        {showDuplicateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxHeight: '90vh',
              overflowY: 'auto',
              maxWidth: '600px',
              width: '90%'
            }}>
              <h3>🔍 Duplicate Transactions Detected</h3>
              <p>Found <strong>{detectedDuplicates.length}</strong> duplicate transaction(s) in your CSV file.</p>
              <p>These transactions already exist in your account. What would you like to do?</p>

              {duplicateHandlingMode !== "review" ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Choose an option:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDuplicateDecision("skip")}
                      className="btn-primary"
                      style={{ width: '100%', textAlign: 'left', padding: '0.75rem' }}
                    >
                      ⏭️ Skip All Duplicates (Recommended)
                    </button>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                      Only import new transactions, skip these duplicates
                    </p>

                    <button
                      onClick={() => handleDuplicateDecision("keep")}
                      className="btn-secondary"
                      style={{ width: '100%', textAlign: 'left', padding: '0.75rem' }}
                    >
                      ✅ Keep All Duplicates
                    </button>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                      Import everything including these duplicates
                    </p>

                    <button
                      onClick={() => handleDuplicateDecision("review")}
                      className="btn-secondary"
                      style={{ width: '100%', textAlign: 'left', padding: '0.75rem' }}
                    >
                      🔎 Review & Choose
                    </button>
                    <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                      Decide for each duplicate
                    </p>

                    <button
                      onClick={() => setShowDuplicateModal(false)}
                      className="btn-secondary"
                      style={{ width: '100%' }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Preview of duplicates */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
                    <h5>💡 Duplicates Preview:</h5>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {detectedDuplicates.map((dup, idx) => (
                        <div key={idx} style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          backgroundColor: '#fff9e6',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}>
                          <strong>{new Date(dup.date).toLocaleDateString()}</strong> - ${dup.amount.toFixed(2)} - {dup.description}
                          {dup.category && <span style={{ color: '#666' }}> ({dup.category})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Select which duplicates to import:</h4>
                  <p style={{ marginBottom: '1rem', color: '#666' }}>
                    Check the boxes for duplicates you want to import (rows marked "NEW" will always be imported):
                  </p>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {detectedDuplicates.map((dup, idx) => (
                      <label key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: selectedDuplicatesToKeep.has(dup.key) ? '#e6f9e6' : '#fff9e6',
                        borderRadius: '4px',
                        border: selectedDuplicatesToKeep.has(dup.key) ? '1px solid #4CAF50' : '1px solid #fff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedDuplicatesToKeep.has(dup.key)}
                          onChange={() => handleToggleDuplicate(dup.key)}
                          style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                        />
                        <div>
                          <strong>{new Date(dup.date).toLocaleDateString()}</strong> - ${dup.amount.toFixed(2)} - {dup.description}
                          {dup.category && <span style={{ color: '#666' }}> ({dup.category})</span>}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleConfirmReview} className="btn-primary">
                      ✓ Confirm Selection
                    </button>
                    <button
                      onClick={() => setDuplicateHandlingMode("skip")}
                      className="btn-secondary"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`result ${result.errors > 0 ? 'warning' : 'success'}`}>
            <h4>Import Results</h4>
            <p>✅ Successfully imported: <strong>{result.imported}</strong> transactions</p>
            {result.duplicatesSkipped > 0 && (
              <p>⏭️ Duplicates skipped: <strong>{result.duplicatesSkipped}</strong></p>
            )}
            {result.duplicatesImported > 0 && (
              <p>📝 Duplicates imported: <strong>{result.duplicatesImported}</strong></p>
            )}
            {result.errors > 0 && (
              <>
                <p>❌ Errors: <strong>{result.errors}</strong></p>
                {result.errorDetails && result.errorDetails.length > 0 && (
                  <details>
                    <summary>View Errors</summary>
                    <ul>
                      {result.errorDetails.map((err: any, i: number) => (
                        <li key={i}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>CSV Format Requirements</h3>
        <p>Your CSV file should have the following columns:</p>
        <ul>
          <li><strong>DATE</strong> - Transaction date (MM/DD/YYYY format)</li>
          <li><strong>DESCRIPTION</strong> - Transaction description or merchant name</li>
          <li><strong>DEBIT</strong> - Amount debited (expenses/withdrawals) - leave blank if not applicable</li>
          <li><strong>CREDIT</strong> - Amount credited (income/deposits) - leave blank if not applicable</li>
          <li><strong>BALANCE</strong> - Account balance after transaction (optional, not used in import)</li>
        </ul>
        <p>Optional columns:</p>
        <ul>
          <li><strong>CATEGORY</strong> - Transaction category (will auto-categorize if not provided)</li>
        </ul>
        <p className="note">💡 Transactions will be automatically categorized based on merchant names!</p>
        <p className="note">📝 You can export transactions directly from your bank in this format, or download our template.</p>
      </div>
    </div>
  );
}
