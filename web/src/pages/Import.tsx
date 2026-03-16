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
  const [duplicateModalFile, setDuplicateModalFile] = useState<File | null>(null);
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
    } catch {
      alert("Failed to create account");
    }
  };

  const closeDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateHandlingMode("skip");
    setDetectedDuplicates([]);
    setSelectedDuplicatesToKeep(new Set());
    setDuplicateModalFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setDetectedDuplicates([]);
      setShowDuplicateModal(false);
      setSelectedDuplicatesToKeep(new Set());
      setDuplicateModalFile(null);
    }
  };

  const performDryRun = async (uploadFile: File): Promise<{ duplicates: any[]; hasDuplicates: boolean; totalRecords: number; allAlreadyImported: boolean; errors: number; errorDetails: { row: number; error: string }[] }> => {
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("accountId", selectedAccount);
    formData.append("dryRun", "true");

    const res = await fetch("/api/import/upload", {
      method: "POST",
      body: formData,
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();
    const duplicateDetails = data.duplicateDetails || [];
    const dryRunErrors = data.errorDetails || [];
    const totalRecords = data.totalRecords || 0;
    return {
      duplicates: duplicateDetails,
      hasDuplicates: duplicateDetails.length > 0,
      totalRecords,
      allAlreadyImported: totalRecords > 0 && duplicateDetails.length === totalRecords,
      errors: data.errors || 0,
      errorDetails: dryRunErrors
    };
  };

  const performActualImport = async (uploadFile: File, duplicateKeysToImport: string[]) => {
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("accountId", selectedAccount);
      formData.append("dryRun", "false");
      formData.append("skipDuplicateIds", JSON.stringify(duplicateKeysToImport));

      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setResult(data);
      window.dispatchEvent(new Event("transactions-imported"));
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      closeDuplicateModal();
    } catch (err: any) {
      alert("Import error: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
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
      const { allAlreadyImported, errors, errorDetails } = await performDryRun(file);

      if (allAlreadyImported) {
        alert("All transactions in this file are already imported.");
        setImporting(false);
        return;
      }

      if (errors > 0) {
        const preview = errorDetails
          .slice(0, 5)
          .map((detail) => `Row ${detail.row}: ${detail.error}`)
          .join("\n");

        const continueImport = window.confirm(
          `Detected ${errors} CSV row error(s).\n\n${preview}${errorDetails.length > 5 ? "\n..." : ""}\n\nDo you want to continue importing valid rows?\nChoose Cancel to stop import.`
        );

        if (!continueImport) {
          setResult({
            imported: 0,
            duplicatesSkipped: 0,
            duplicatesImported: 0,
            errors,
            errorDetails,
            message: "Import cancelled due to CSV row errors."
          });
          setImporting(false);
          return;
        }
      }

      await performActualImport(file, []);
    } catch (err: any) {
      alert("Error validating/importing CSV: " + (err.message || "Unknown error"));
      setImporting(false);
    }
  };

  const handleDuplicateDecision = async (mode: "skip" | "keep" | "review") => {
    const targetFile = duplicateModalFile || file;
    if (!targetFile) {
      alert("Please select the CSV file again.");
      closeDuplicateModal();
      return;
    }

    if (mode === "skip") {
      await performActualImport(targetFile, []);
    } else if (mode === "keep") {
      await performActualImport(targetFile, detectedDuplicates.map((d) => d.key));
    } else {
      setDuplicateHandlingMode("review");
    }
  };

  const handleToggleDuplicate = (key: string) => {
    const next = new Set(selectedDuplicatesToKeep);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedDuplicatesToKeep(next);
  };

  const handleConfirmReview = async () => {
    const targetFile = duplicateModalFile || file;
    if (!targetFile) {
      alert("Please select the CSV file again.");
      closeDuplicateModal();
      return;
    }

    const duplicateKeysToImport = detectedDuplicates
      .map((d) => d.key)
      .filter((key) => selectedDuplicatesToKeep.has(key));

    await performActualImport(targetFile, duplicateKeysToImport);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/import/template", { credentials: "include" });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transaction_template.csv";
      a.click();
    } catch {
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
            <h3>No Bank Accounts Yet</h3>
            <p>To import transactions, create an account first.</p>

            {!showAccountForm ? (
              <button onClick={() => setShowAccountForm(true)} className="btn">+ Create Bank Account</button>
            ) : (
              <form onSubmit={handleCreateAccount} className="form">
                <h4>Create New Bank Account</h4>
                <label>
                  Account Name:
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Account Type:
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as any })}
                  >
                    <option value="chequing">Chequing</option>
                    <option value="savings">Savings</option>
                    <option value="credit-card">Credit Card</option>
                    <option value="line-of-credit">Line of Credit</option>
                    <option value="tfsa">TFSA</option>
                    <option value="rrsp">RRSP</option>
                    <option value="gic">GIC</option>
                    <option value="student-loan">Student Loan</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="auto-loan">Auto Loan</option>
                    <option value="personal-loan">Personal Loan</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  Current Balance:
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })}
                  />
                </label>

                <div className="form-actions">
                  <button type="submit" className="btn">Create Account</button>
                  <button type="button" onClick={() => setShowAccountForm(false)} className="btn-secondary">Cancel</button>
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
        <p>Import transactions from a CSV file.</p>

        <button onClick={downloadTemplate} className="btn-secondary">Download CSV Template</button>

        <form onSubmit={handleUpload} className="import-form">
          <label>
            Select Account:
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} required>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} - ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Choose CSV File:
            <input id="file-input" type="file" accept=".csv" onChange={handleFileChange} required />
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

        {showDuplicateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}
            onClick={closeDuplicateModal}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "8px",
                maxHeight: "90vh",
                overflowY: "auto",
                maxWidth: "600px",
                width: "90%"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Duplicate Transactions Detected</h3>
              <p>Found <strong>{detectedDuplicates.length}</strong> duplicate transaction(s).</p>

              {duplicateHandlingMode !== "review" ? (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ marginBottom: "1rem" }}>Choose an option:</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <button type="button" onClick={() => handleDuplicateDecision("skip")} className="btn-primary" disabled={importing}>Skip All Duplicates (Recommended)</button>
                    <button type="button" onClick={() => handleDuplicateDecision("keep")} className="btn-secondary" disabled={importing}>Keep All Duplicates</button>
                    <button type="button" onClick={() => handleDuplicateDecision("review")} className="btn-secondary" disabled={importing}>Review & Choose</button>
                    <button type="button" onClick={closeDuplicateModal} className="btn-secondary" disabled={importing}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ marginBottom: "1rem" }}>Select which duplicates to import:</h4>
                  <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "1rem" }}>
                    {detectedDuplicates.map((dup, idx) => (
                      <label key={idx} style={{ display: "flex", alignItems: "center", padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: selectedDuplicatesToKeep.has(dup.key) ? "#e6f9e6" : "#fff9e6", borderRadius: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={selectedDuplicatesToKeep.has(dup.key)} onChange={() => handleToggleDuplicate(dup.key)} style={{ marginRight: "0.75rem" }} />
                        <div>
                          <strong>{new Date(dup.date).toLocaleDateString()}</strong> - ${dup.amount.toFixed(2)} - {dup.description}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" onClick={handleConfirmReview} className="btn-primary" disabled={importing}>Confirm Selection</button>
                    <button type="button" onClick={() => setDuplicateHandlingMode("skip")} className="btn-secondary" disabled={importing}>Back</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`result ${result.errors > 0 ? "warning" : "success"}`}>
            <h4>Import Results</h4>
            {result.message && <p>{result.message}</p>}
            <p>Successfully imported: <strong>{result.imported}</strong> transactions</p>
            {result.duplicatesSkipped > 0 && <p>Duplicates skipped: <strong>{result.duplicatesSkipped}</strong></p>}
            {result.duplicatesImported > 0 && <p>Duplicates imported: <strong>{result.duplicatesImported}</strong></p>}
            {result.errors > 0 && <p>Errors: <strong>{result.errors}</strong></p>}

            {Array.isArray(result.errorDetails) && result.errorDetails.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <h5 style={{ marginBottom: "0.5rem" }}>Error Details</h5>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", maxHeight: "220px", overflowY: "auto" }}>
                  {result.errorDetails.map((detail: { row?: number; error?: string }, idx: number) => (
                    <li key={`${detail.row ?? "unknown"}-${idx}`}>
                      Row {detail.row ?? "?"}: {detail.error || "Unknown error"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}









