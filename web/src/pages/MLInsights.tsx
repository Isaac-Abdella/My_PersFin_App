import { useState } from "react";
import { api } from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

const CAD = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

// ── Types ────────────────────────────────────────────────────────────────────

interface HistPoint { month: string; amount: number; }
interface ForecastData {
  historical: HistPoint[];
  forecast: HistPoint[];
  trend: "up" | "down" | "stable";
}
interface ForecastResult {
  forecasts: Record<string, ForecastData>;
  months_forecast: number;
}
interface AnomalyTxn {
  id: string; amount: number; category: string; date: string;
  description: string; anomalyScore: number; zScore: number; reason: string;
}
interface AnomalyResult {
  anomalies: AnomalyTxn[];
  totalScanned: number;
  anomalyCount: number;
  message?: string;
}
interface BudgetSuggestion {
  category: string; suggestedBudget: number; historicalMean: number;
  historicalMedian: number; historicalStd: number; p75: number;
  trend: "increasing" | "decreasing" | "stable";
  monthsAnalyzed: number; confidence: "high" | "medium" | "low";
}
interface BudgetResult { suggestions: BudgetSuggestion[]; monthsAnalyzed: number; }

// ── Component ────────────────────────────────────────────────────────────────

export default function MLInsights() {
  const [forecastMonths, setForecastMonths] = useState(3);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [forecastCat, setForecastCat] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);

  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  const [mlError, setMlError] = useState<string | null>(null);

  const clearError = () => setMlError(null);

  const runForecast = async () => {
    clearError();
    setForecastLoading(true);
    try {
      const data: ForecastResult = await api("/ml/forecast", {
        method: "POST",
        body: JSON.stringify({ months: forecastMonths }),
      });
      setForecastResult(data);
      const cats = Object.keys(data.forecasts);
      if (cats.length) setForecastCat(cats[0]);
    } catch (err: any) {
      setMlError(err.message?.includes("502") || err.message?.includes("ML service")
        ? "Python ML service is not running. Start it with: cd python-ml && uvicorn main:app --port 8000"
        : err.message || "Forecast failed");
    } finally {
      setForecastLoading(false);
    }
  };

  const runAnomalies = async () => {
    clearError();
    setAnomalyLoading(true);
    try {
      const data: AnomalyResult = await api("/ml/anomalies", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setAnomalyResult(data);
    } catch (err: any) {
      setMlError(err.message || "Anomaly scan failed");
    } finally {
      setAnomalyLoading(false);
    }
  };

  const runBudget = async () => {
    clearError();
    setBudgetLoading(true);
    try {
      const data: BudgetResult = await api("/ml/suggest-budgets", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setBudgetResult(data);
    } catch (err: any) {
      setMlError(err.message || "Budget suggestion failed");
    } finally {
      setBudgetLoading(false);
    }
  };

  const buildChartData = (cat: string) => {
    if (!forecastResult?.forecasts[cat]) return [];
    const { historical, forecast } = forecastResult.forecasts[cat];
    const hist = historical.map(p => ({ month: p.month, actual: p.amount, forecast: null as number | null }));
    const fc = forecast.map(p => ({ month: p.month, actual: null as number | null, forecast: p.amount }));
    // Bridge: share last historical point with first forecast so lines connect
    if (hist.length && fc.length) {
      fc[0] = { ...fc[0], actual: hist[hist.length - 1].actual };
    }
    return [...hist, ...fc];
  };

  const categories = forecastResult ? Object.keys(forecastResult.forecasts) : [];

  const cardStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  };

  const btnBase: React.CSSProperties = {
    fontSize: "0.75rem", padding: "5px 16px", borderRadius: 6,
    color: "#fff", border: "none", cursor: "pointer", fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>ML Insights</h1>
        <p style={{ color: "var(--text-light)", fontSize: "0.72rem", margin: "4px 0 0" }}>
          Spending forecasts · Anomaly detection · Data-driven budget suggestions
          &nbsp;—&nbsp;powered by scikit-learn &amp; statsmodels.
        </p>
      </div>

      {mlError && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "10px 14px", marginBottom: 12, fontSize: "0.78rem", color: "#dc2626",
        }}>
          ⚠ {mlError}
        </div>
      )}

      {/* ── Section 1: Spending Forecast ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>Spending Forecast</h2>
            <p style={{ fontSize: "0.7rem", color: "var(--text-light)", margin: "2px 0 0" }}>
              Holt exponential smoothing on 12 months of expense history
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={forecastMonths}
              onChange={e => setForecastMonths(Number(e.target.value))}
              style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)" }}
            >
              <option value={1}>1 month ahead</option>
              <option value={3}>3 months ahead</option>
              <option value={6}>6 months ahead</option>
            </select>
            <button onClick={runForecast} disabled={forecastLoading} style={{ ...btnBase, background: "#4f46e5", opacity: forecastLoading ? 0.7 : 1 }}>
              {forecastLoading ? "Forecasting…" : "Run Forecast"}
            </button>
          </div>
        </div>

        {forecastResult && categories.length > 0 && (
          <>
            {/* Category pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {categories.map(cat => {
                const d = forecastResult.forecasts[cat];
                const trendColor = d.trend === "up" ? "#dc2626" : d.trend === "down" ? "#059669" : "#d97706";
                const icon = d.trend === "up" ? "↑" : d.trend === "down" ? "↓" : "→";
                const active = forecastCat === cat;
                return (
                  <button key={cat} onClick={() => setForecastCat(cat)} style={{
                    fontSize: "0.7rem", padding: "3px 10px", borderRadius: 999, cursor: "pointer",
                    background: active ? "#4f46e5" : "var(--bg)",
                    color: active ? "#fff" : "var(--text)",
                    border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                    fontWeight: active ? 600 : 400,
                  }}>
                    {cat}&nbsp;<span style={{ color: active ? "#fff" : trendColor }}>{icon}</span>
                  </button>
                );
              })}
            </div>

            {forecastCat && (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={buildChartData(forecastCat)} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: unknown, name: string) => [
                        v !== null ? CAD(Number(v)) : "—",
                        name === "actual" ? "Actual" : "Forecast",
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} name="Actual" connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} name="Forecast" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 6, fontSize: "0.7rem", color: "var(--text-light)" }}>
                  Dashed = forecasted months.&nbsp;
                  Trend:&nbsp;
                  <strong style={{ color: forecastResult.forecasts[forecastCat].trend === "up" ? "#dc2626" : forecastResult.forecasts[forecastCat].trend === "down" ? "#059669" : "#d97706" }}>
                    {forecastResult.forecasts[forecastCat].trend === "up" ? "↑ Increasing" : forecastResult.forecasts[forecastCat].trend === "down" ? "↓ Decreasing" : "→ Stable"}
                  </strong>
                </div>
              </>
            )}
          </>
        )}

        {forecastResult && categories.length === 0 && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-light)", margin: 0 }}>
            No categories with sufficient history for forecasting (need ≥ 2 months per category).
          </p>
        )}
      </div>

      {/* ── Section 2: Anomaly Detection ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>Anomaly Detection</h2>
            <p style={{ fontSize: "0.7rem", color: "var(--text-light)", margin: "2px 0 0" }}>
              Isolation Forest on last 3 months of transactions — flags unusual amounts &amp; patterns
            </p>
          </div>
          <button onClick={runAnomalies} disabled={anomalyLoading} style={{ ...btnBase, background: "#dc2626", opacity: anomalyLoading ? 0.7 : 1 }}>
            {anomalyLoading ? "Scanning…" : "Scan Transactions"}
          </button>
        </div>

        {anomalyResult && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { label: "Scanned", value: anomalyResult.totalScanned, color: "var(--text)" },
                { label: "Flagged", value: anomalyResult.anomalyCount, color: anomalyResult.anomalyCount > 0 ? "#dc2626" : "#059669" },
                { label: "Flag Rate", value: `${anomalyResult.totalScanned > 0 ? ((anomalyResult.anomalyCount / anomalyResult.totalScanned) * 100).toFixed(1) : 0}%`, color: "var(--text)" },
              ].map(c => (
                <div key={c.label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            {anomalyResult.anomalies.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Category", "Amount", "Description", "Score", "Why Flagged"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-light)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyResult.anomalies.map(txn => (
                      <tr key={txn.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{txn.date}</td>
                        <td style={{ padding: "6px 8px" }}>{txn.category}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap", color: "#dc2626", fontWeight: 600 }}>{CAD(txn.amount)}</td>
                        <td style={{ padding: "6px 8px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {txn.description || "—"}
                        </td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                          <span style={{
                            background: txn.anomalyScore >= 70 ? "#fef2f2" : "#fefce8",
                            color: txn.anomalyScore >= 70 ? "#dc2626" : "#854d0e",
                            borderRadius: 4, padding: "2px 6px", fontWeight: 600, fontSize: "0.7rem",
                          }}>
                            {txn.anomalyScore.toFixed(0)}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px", color: "var(--text-light)", fontSize: "0.7rem" }}>{txn.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: "0.75rem", color: "#059669", margin: 0 }}>
                ✓ No anomalous transactions detected.
              </p>
            )}
            {anomalyResult.message && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-light)", marginTop: 6, marginBottom: 0 }}>
                {anomalyResult.message}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Section 3: Budget Suggestions ────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>Smart Budget Suggestions</h2>
            <p style={{ fontSize: "0.7rem", color: "var(--text-light)", margin: "2px 0 0" }}>
              75th-percentile + trend analysis on 6 months of spending history
            </p>
          </div>
          <button onClick={runBudget} disabled={budgetLoading} style={{ ...btnBase, background: "#059669", opacity: budgetLoading ? 0.7 : 1 }}>
            {budgetLoading ? "Analyzing…" : "Generate Suggestions"}
          </button>
        </div>

        {budgetResult && (
          <>
            <p style={{ fontSize: "0.7rem", color: "var(--text-light)", margin: "0 0 10px" }}>
              {budgetResult.monthsAnalyzed} months analyzed.
              Suggested = P75 × 1.05× buffer (1.10× for rising categories).
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Category", "Avg Spend", "Median", "P75", "Suggested Budget", "Trend", "Confidence", "Months"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-light)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budgetResult.suggestions.map(s => (
                    <tr key={s.category} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{s.category}</td>
                      <td style={{ padding: "6px 8px" }}>{CAD(s.historicalMean)}</td>
                      <td style={{ padding: "6px 8px" }}>{CAD(s.historicalMedian)}</td>
                      <td style={{ padding: "6px 8px" }}>{CAD(s.p75)}</td>
                      <td style={{ padding: "6px 8px", fontWeight: 700, color: "#4f46e5" }}>{CAD(s.suggestedBudget)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{
                          color: s.trend === "increasing" ? "#dc2626" : s.trend === "decreasing" ? "#059669" : "#d97706",
                          fontWeight: 600,
                        }}>
                          {s.trend === "increasing" ? "↑" : s.trend === "decreasing" ? "↓" : "→"} {s.trend}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{
                          background: s.confidence === "high" ? "#f0fdf4" : s.confidence === "medium" ? "#fefce8" : "#fef2f2",
                          color: s.confidence === "high" ? "#059669" : s.confidence === "medium" ? "#854d0e" : "#dc2626",
                          borderRadius: 4, padding: "2px 6px", fontSize: "0.68rem", fontWeight: 600,
                        }}>
                          {s.confidence}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", color: "var(--text-light)" }}>{s.monthsAnalyzed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
