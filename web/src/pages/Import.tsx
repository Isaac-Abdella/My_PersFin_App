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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", selectedAccount);

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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
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
        <div className="empty-state">
          <p>You need to create an account first before importing transactions.</p>
          <p>Go to the Dashboard or Transactions page to add an account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Import Transactions from CSV</h1>

      <div className="card">
        <h3>Upload CSV File</h3>
        <p>Import your bank transactions from a CSV file. The CSV should have columns for date, description, and amount.</p>
        
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

        {result && (
          <div className={`result ${result.errors > 0 ? 'warning' : 'success'}`}>
            <h4>Import Results</h4>
            <p>✅ Successfully imported: <strong>{result.imported}</strong> transactions</p>
            {result.errors > 0 && (
              <>
                <p>⚠️ Errors: <strong>{result.errors}</strong></p>
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
          <li><strong>date</strong> - Transaction date (MM/DD/YYYY or YYYY-MM-DD)</li>
          <li><strong>description</strong> - Transaction description or merchant name</li>
          <li><strong>amount</strong> - Transaction amount (negative for expenses, positive for income)</li>
        </ul>
        <p>OR separate debit/credit columns:</p>
        <ul>
          <li><strong>debit</strong> - Amount debited (expenses)</li>
          <li><strong>credit</strong> - Amount credited (income)</li>
        </ul>
        <p>Optional columns:</p>
        <ul>
          <li><strong>category</strong> - Transaction category (will auto-categorize if not provided)</li>
        </ul>
        <p className="note">💡 Transactions will be automatically categorized based on merchant names!</p>
      </div>
    </div>
  );
}
