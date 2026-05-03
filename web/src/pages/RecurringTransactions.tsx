import { useState, useEffect } from "react";
import EmptyState from "../components/EmptyState";

interface Recurring {
  _id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: string;
  dayOfMonth: number;
  nextDueDate: string;
  accountId?: string;
  isActive: boolean;
}

interface DetectedPattern {
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: string;
  confidence: number;
  occurrences: number;
  lastDate: string;
  nextDueDate: string;
  dayOfMonth: number;
  accountId?: string;
  alreadyTracked: boolean;
}

const FREQUENCIES = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"];
const CATEGORIES = ["Housing", "Utilities", "Subscriptions", "Insurance", "Transportation", "Food", "Health", "Savings", "Income", "Other"];
const CAD = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function confidenceColor(c: number): { bg: string; text: string; label: string } {
  if (c >= 0.8) return { bg: "#d1fae5", text: "#065f46", label: "Strong" };
  if (c >= 0.6) return { bg: "#fef3c7", text: "#92400e", label: "Likely" };
  return { bg: "#fee2e2", text: "#991b1b", label: "Possible" };
}

const blank = (): Omit<Recurring, "_id"> => ({
  name: "", amount: 0, type: "expense", category: "Subscriptions",
  frequency: "monthly", dayOfMonth: 1, nextDueDate: new Date().toISOString().slice(0, 10),
  isActive: true,
});

export default function RecurringTransactions() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blank());
  const [posting, setPosting] = useState<string | null>(null);

  // Detection state
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedPattern[] | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/recurring", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((d) => { setItems(d); setLoading(false); })
      .catch((err) => { setLoadError(err.message || "Failed to load"); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(blank()); setEditId(null); setShowForm(true); };
  const openEdit = (r: Recurring) => {
    setForm({ ...r, nextDueDate: r.nextDueDate.slice(0, 10) });
    setEditId(r._id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/recurring/${editId}` : "/api/recurring";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error ${res.status}`);
      }
      closeForm();
      load();
    } catch (err: any) {
      alert(err.message || "Failed to save");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this recurring transaction?")) return;
    try {
      await fetch(`/api/recurring/${id}`, { method: "DELETE", credentials: "include" });
      load();
    } catch {
      alert("Failed to delete");
    }
  };

  const postNow = async (id: string) => {
    setPosting(id);
    try {
      const res = await fetch(`/api/recurring/${id}/post`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setPosting(null);
      if (data.ok) load();
      else alert(data.message || "Failed to post");
    } catch {
      setPosting(null);
      alert("Failed to post transaction");
    }
  };

  // ── Detection ──────────────────────────────────────────────────────────────

  const detect = async () => {
    setDetecting(true);
    setDetectError(null);
    setDetected(null);
    setDismissed(new Set());
    try {
      const res = await fetch("/api/recurring/detect", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error ${res.status}`);
      }
      const data: DetectedPattern[] = await res.json();
      setDetected(data);
    } catch (err: any) {
      setDetectError(err.message || "Detection failed");
    } finally {
      setDetecting(false);
    }
  };

  const addDetected = async (p: DetectedPattern) => {
    try {
      const res = await fetch("/api/recurring", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          amount: p.amount,
          type: p.type,
          category: p.category,
          frequency: p.frequency,
          dayOfMonth: p.dayOfMonth,
          nextDueDate: p.nextDueDate,
          accountId: p.accountId,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add");
      }
      // Mark as tracked in local detected list
      setDetected((prev) =>
        prev ? prev.map((d) => d.name === p.name ? { ...d, alreadyTracked: true } : d) : prev
      );
      load();
    } catch (err: any) {
      alert(err.message || "Failed to add recurring transaction");
    }
  };

  const addAllDetected = async () => {
    if (!detected) return;
    const toAdd = detected.filter((p) => !p.alreadyTracked && !dismissed.has(p.name));
    if (toAdd.length === 0) return;
    setAddingAll(true);
    for (const p of toAdd) {
      await addDetected(p);
    }
    setAddingAll(false);
  };

  const dismissDetected = (name: string) => {
    setDismissed((prev) => new Set([...prev, name]));
  };

  const visibleDetected = detected
    ? detected.filter((p) => !dismissed.has(p.name))
    : [];
  const newCount = visibleDetected.filter((p) => !p.alreadyTracked).length;

  // ── Summary ────────────────────────────────────────────────────────────────

  const totalMonthly = items
    .filter((r) => r.isActive)
    .reduce((sum, r) => {
      const factor: Record<string, number> = { daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
      const sign = r.type === "income" ? 1 : -1;
      return sum + r.amount * (factor[r.frequency] ?? 1) * sign;
    }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Recurring Transactions</h1>
          <p style={{ color: "var(--text-light)", fontSize: 14, margin: "4px 0 0" }}>
            Monthly net: <strong style={{ color: totalMonthly >= 0 ? "#059669" : "#dc2626" }}>{CAD(totalMonthly)}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={detect}
            disabled={detecting}
            style={{ padding: "9px 18px", borderRadius: 8, background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)", fontSize: 14, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
          >
            {detecting ? "Detecting…" : "🔍 Detect Recurring"}
          </button>
          <button onClick={openNew} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--primary)", color: "white", border: "none", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
            + Add Recurring
          </button>
        </div>
      </div>

      {/* Detection panel */}
      {(detected !== null || detecting || detectError) && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                {detecting ? "Scanning transaction history…" : detectError ? "Detection failed" : `Detected Patterns`}
              </h3>
              {!detecting && !detectError && detected !== null && (
                <p style={{ fontSize: 13, color: "var(--text-light)", margin: "3px 0 0" }}>
                  {visibleDetected.length === 0
                    ? "No untracked patterns found — you're all caught up."
                    : `${newCount} new pattern${newCount !== 1 ? "s" : ""} found from your transaction history`}
                </p>
              )}
              {detectError && (
                <p style={{ fontSize: 13, color: "#dc2626", margin: "3px 0 0" }}>{detectError}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!detecting && !detectError && newCount > 0 && (
                <button
                  onClick={addAllDetected}
                  disabled={addingAll}
                  style={{ padding: "6px 14px", borderRadius: 7, background: "var(--primary)", color: "white", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                >
                  {addingAll ? "Adding…" : `Add All ${newCount} New`}
                </button>
              )}
              <button
                onClick={() => { setDetected(null); setDetectError(null); }}
                style={{ padding: "6px 12px", borderRadius: 7, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", fontSize: 13, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>

          {detecting && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-light)", fontSize: 14 }}>
              Analyzing transactions for recurring patterns…
            </div>
          )}

          {!detecting && visibleDetected.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleDetected.map((p) => {
                const conf = confidenceColor(p.confidence);
                return (
                  <div
                    key={p.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto auto auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: p.alreadyTracked ? "var(--bg)" : "var(--bg)",
                      border: "1px solid var(--border)",
                      opacity: p.alreadyTracked ? 0.6 : 1,
                    }}
                  >
                    {/* Name + meta */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                        {p.category} · {p.occurrences} occurrences · last {formatDate(p.lastDate)}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontWeight: 700, fontSize: 14, color: p.type === "income" ? "#059669" : "#dc2626", whiteSpace: "nowrap" }}>
                      {p.type === "income" ? "+" : "-"}{CAD(p.amount)}
                    </div>

                    {/* Frequency */}
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#eff6ff", color: "#2563eb", fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                      {p.frequency}
                    </span>

                    {/* Confidence */}
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: conf.bg, color: conf.text, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {conf.label} {Math.round(p.confidence * 100)}%
                    </span>

                    {/* Add / Already tracked */}
                    {p.alreadyTracked ? (
                      <span style={{ fontSize: 12, color: "#059669", fontWeight: 500, whiteSpace: "nowrap" }}>✓ Tracked</span>
                    ) : (
                      <button
                        onClick={() => addDetected(p)}
                        style={{ padding: "4px 12px", borderRadius: 6, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: 12, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
                      >
                        + Add
                      </button>
                    )}

                    {/* Dismiss */}
                    <button
                      onClick={() => dismissDetected(p.name)}
                      title="Dismiss"
                      style={{ padding: "4px 8px", borderRadius: 6, background: "var(--bg)", color: "var(--text-light)", border: "1px solid var(--border)", fontSize: 13, cursor: "pointer", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{editId ? "Edit" : "New"} Recurring Transaction</h3>
          <form onSubmit={save}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Amount</label>
                <input type="number" min={0} step={0.01} required value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Frequency</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-light)", display: "block", marginBottom: 4 }}>Next Due Date</label>
                <input type="date" required value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 14, margin: 0 }} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="submit" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--primary)", color: "white", border: "none", fontSize: 14, cursor: "pointer" }}>Save</button>
              <button type="button" onClick={closeForm} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Recurring list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-light)" }}>Loading…</div>
      ) : loadError ? (
        <div style={{ textAlign: "center", padding: 48, color: "#dc2626" }}>
          {loadError} — <button onClick={load} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="🔁" title="No recurring transactions" description="Add bills, subscriptions, and income that repeat regularly, or use Detect Recurring to find them automatically." action={{ label: "+ Add Recurring", onClick: openNew }} />
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg)" }}>
              <tr>
                {["Name", "Amount", "Type", "Category", "Frequency", "Next Due", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "var(--text-light)", fontWeight: 600, borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const dateStr = r.nextDueDate.slice(0, 10);
                const today = new Date().toISOString().slice(0, 10);
                const daysUntil = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
                const overdue = daysUntil < 0;
                const soon = daysUntil >= 0 && daysUntil <= 3;
                return (
                  <tr key={r._id} style={{ borderBottom: "1px solid var(--border)", opacity: r.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500, fontSize: 14 }}>{r.name}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: r.type === "income" ? "#059669" : "#dc2626" }}>
                      {r.type === "income" ? "+" : "-"}{CAD(r.amount)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: r.type === "income" ? "#d1fae5" : "#fee2e2", color: r.type === "income" ? "#065f46" : "#991b1b" }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-light)" }}>{r.category}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, textTransform: "capitalize" }}>{r.frequency}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: overdue ? "#dc2626" : soon ? "#d97706" : "var(--text)" }}>
                      {formatDate(r.nextDueDate)}
                      {overdue && <span style={{ fontSize: 10, marginLeft: 4, color: "#dc2626" }}>OVERDUE</span>}
                      {soon && !overdue && <span style={{ fontSize: 10, marginLeft: 4, color: "#d97706" }}>SOON</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: r.isActive ? "#d1fae5" : "#f3f4f6", color: r.isActive ? "#065f46" : "#6b7280" }}>
                        {r.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => postNow(r._id)} disabled={posting === r._id} title="Post now as a transaction"
                          style={{ padding: "4px 10px", borderRadius: 6, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: 12, cursor: "pointer" }}>
                          {posting === r._id ? "…" : "Post"}
                        </button>
                        <button onClick={() => openEdit(r)}
                          style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", fontSize: 12, cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => remove(r._id)}
                          style={{ padding: "4px 10px", borderRadius: 6, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: 12, cursor: "pointer" }}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
