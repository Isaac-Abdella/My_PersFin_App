import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Debt, PayoffStrategy } from "../types";

type Cadence = "monthly" | "biweekly";

type DebtDashboard = {
  totals: {
    totalDebt: number;
    totalMinimumPayment: number;
    weightedInterestRate: number;
    monthlyInterestEstimate: number;
    annualInterestEstimate: number;
  };
  upcomingDue: Debt[];
  count: number;
};

type OptimizerResponse = {
  cadence: Cadence;
  paymentPerCadence: number;
  totalMinimumPerCadence: number;
  extraPerCadence: number;
  allocations: Array<{
    debtId: string;
    debtName: string;
    interestRate: number;
    recommendedPerCadence: number;
    minimumPerCadence: number;
    focusDebt: boolean;
  }>;
};

type WhatIfResponse = {
  baseline: PayoffStrategy & { error?: string; minimumRequiredMonthly?: number };
  scenario: PayoffStrategy & { error?: string; minimumRequiredMonthly?: number };
  comparison: {
    monthsSaved: number;
    interestSaved: number;
  } | null;
};

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [dashboard, setDashboard] = useState<DebtDashboard | null>(null);
  const [strategies, setStrategies] = useState<{ avalanche?: PayoffStrategy; snowball?: PayoffStrategy } | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerResponse | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cadence, setCadence] = useState<Cadence>("biweekly");
  const [paymentAmount, setPaymentAmount] = useState("700");
  const [extraPayment, setExtraPayment] = useState("100");

  const [formData, setFormData] = useState({
    name: "",
    type: "credit-card" as Debt["type"],
    principal: "",
    currentBalance: "",
    interestRate: "",
    minimumPayment: "",
    lender: "",
    dueDate: "",
    dueScheduleType: "monthly" as "specific" | "monthly" | "biweekly"
  });

  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [debtData, dashboardData] = await Promise.all([api("/debts"), api("/debts/dashboard")]);
      setDebts(debtData);
      setDashboard(dashboardData);

      if (debtData.length > 0) {
        const totalMin = debtData.reduce((sum: number, d: Debt) => sum + d.minimumPayment, 0);
        setPaymentAmount(Math.max(totalMin * 12 / 26 + 50, 300).toFixed(2));
      }
    } catch (err) {
      console.error("Failed to load debts", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanner = async () => {
    if (debts.length === 0) return;
    try {
      const amount = Number(paymentAmount);
      const extra = Number(extraPayment) || 0;

      const [strategyData, optimizerData, whatIfData] = await Promise.all([
        api(`/debts/payoff/strategies?paymentAmount=${amount}&cadence=${cadence}&extraPayment=0`),
        api(`/debts/payoff/optimizer?paymentAmount=${amount}&cadence=${cadence}`),
        api(`/debts/payoff/what-if?paymentAmount=${amount}&cadence=${cadence}&extraPayment=${extra}`)
      ]);

      setStrategies(strategyData);
      setOptimizer(optimizerData);
      setWhatIf(whatIfData);
    } catch (err: any) {
      alert(err.message || "Failed to load debt planner");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/debts", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          principal: parseFloat(formData.principal),
          currentBalance: parseFloat(formData.currentBalance),
          interestRate: parseFloat(formData.interestRate),
          minimumPayment: parseFloat(formData.minimumPayment),
          dueDate: formData.dueDate || undefined,
          dueScheduleType: formData.dueScheduleType
        })
      });
      setShowForm(false);
      setFormData({
        name: "",
        type: "credit-card",
        principal: "",
        currentBalance: "",
        interestRate: "",
        minimumPayment: "",
        lender: "",
        dueDate: "",
        dueScheduleType: "monthly"
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add debt");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this debt?")) return;
    try {
      await api(`/debts/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete debt");
    }
  };

  const handleMakePayment = async (debtId: string) => {
    const amount = Number(paymentInputs[debtId] || 0);
    if (!isFinite(amount) || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    try {
      await api(`/debts/${debtId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount })
      });
      setPaymentInputs((prev) => ({ ...prev, [debtId]: "" }));
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    }
  };

  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.currentBalance, 0), [debts]);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Debt Planner</h1>
        <button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Debt"}</button>
      </div>

      {dashboard && (
        <div className="card-grid" style={{ marginBottom: "1rem" }}>
          <div className="card">
            <h3>Total Debt</h3>
            <p className="amount negative">${dashboard.totals.totalDebt.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Minimums (Monthly)</h3>
            <p className="amount">${dashboard.totals.totalMinimumPayment.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Weighted APR</h3>
            <p className="amount">{dashboard.totals.weightedInterestRate.toFixed(2)}%</p>
          </div>
          <div className="card">
            <h3>Interest Forecast</h3>
            <p className="amount negative">${dashboard.totals.annualInterestEstimate.toFixed(2)}</p>
            <small>${dashboard.totals.monthlyInterestEstimate.toFixed(2)} this month</small>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <h3>Track New Debt</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Debt Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Debt["type"] })}>
              <option value="credit-card">Credit Card</option>
              <option value="student-loan">Student Loan</option>
              <option value="mortgage">Mortgage</option>
              <option value="auto-loan">Auto Loan</option>
              <option value="personal-loan">Personal Loan</option>
              <option value="other">Other</option>
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Original Principal"
              value={formData.principal}
              onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Current Balance"
              value={formData.currentBalance}
              onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Interest Rate (%)"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Minimum Payment (Monthly)"
              value={formData.minimumPayment}
              onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
              required
            />

            <input
              type="text"
              placeholder="Lender (optional)"
              value={formData.lender}
              onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
            />

            <label>
              Due Date Mode
              <select
                value={formData.dueScheduleType}
                onChange={(e) => setFormData({ ...formData, dueScheduleType: e.target.value as "specific" | "monthly" | "biweekly" })}
              >
                <option value="specific">Specific Date (one-time)</option>
                <option value="monthly">Specific Day Each Month</option>
                <option value="biweekly">Biweekly Cycle (every 14 days)</option>
              </select>
            </label>

            <label>
              {formData.dueScheduleType === "specific"
                ? "Specific Due Date"
                : formData.dueScheduleType === "monthly"
                  ? "Monthly Anchor Date"
                  : "Biweekly Anchor Date"}
              <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </label>

            <button type="submit">Save Debt</button>
          </form>
        </div>
      )}

      {debts.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Debt Accounts</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Balance</th>
                <th>APR</th>
                <th>Min Payment</th>
                <th>Due</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => (
                <tr key={debt._id}>
                  <td>{debt.name}</td>
                  <td>{debt.type}</td>
                  <td className="negative">${debt.currentBalance.toFixed(2)}</td>
                  <td>{debt.interestRate.toFixed(2)}%</td>
                  <td>${debt.minimumPayment.toFixed(2)}</td>
                  <td>
                    {debt.nextDueDate ? new Date(debt.nextDueDate).toLocaleDateString() : debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : "-"}
                    <div style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>{debt.dueScheduleType || "specific"}</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={paymentInputs[debt._id] || ""}
                        onChange={(e) => setPaymentInputs((prev) => ({ ...prev, [debt._id]: e.target.value }))}
                        style={{ width: "110px" }}
                      />
                      <button className="btn-secondary btn-sm" onClick={() => handleMakePayment(debt._id)}>
                        Apply
                      </button>
                    </div>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(debt._id)} className="btn-danger btn-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {debts.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Payoff Planner (Avalanche vs Snowball)</h3>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }}>
            <label>
              Cadence
              <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>
              Payment per {cadence === "biweekly" ? "Paycheck" : "Month"}
              <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </label>
            <label>
              What-if Extra
              <input type="number" step="0.01" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} />
            </label>
            <button onClick={loadPlanner}>Run Planner</button>
          </div>

          {strategies && (
            <div className="card-grid" style={{ marginTop: "1rem" }}>
              <div className="card">
                <h4>Avalanche</h4>
                <p>Payoff Time: <strong>{strategies.avalanche?.totalYears} years</strong></p>
                <p>Interest Cost: <strong>${(strategies.avalanche?.totalInterestPaid ?? 0).toFixed(2)}</strong></p>
              </div>
              <div className="card">
                <h4>Snowball</h4>
                <p>Payoff Time: <strong>{strategies.snowball?.totalYears} years</strong></p>
                <p>Interest Cost: <strong>${(strategies.snowball?.totalInterestPaid ?? 0).toFixed(2)}</strong></p>
              </div>
              <div className="card">
                <h4>Best Interest Saver</h4>
                <p>
                  Avalanche interest savings vs Snowball: <strong>
                    ${((strategies.snowball?.totalInterestPaid ?? 0) - (strategies.avalanche?.totalInterestPaid ?? 0)).toFixed(2)}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {optimizer && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Biweekly/Monthly Payment Optimizer</h4>
              <p>
                Minimum total: ${optimizer.totalMinimumPerCadence.toFixed(2)} | Extra available: ${optimizer.extraPerCadence.toFixed(2)}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Debt</th>
                    <th>APR</th>
                    <th>Minimum</th>
                    <th>Recommended</th>
                    <th>Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizer.allocations.map((a) => (
                    <tr key={a.debtId}>
                      <td>{a.debtName}</td>
                      <td>{a.interestRate.toFixed(2)}%</td>
                      <td>${a.minimumPerCadence.toFixed(2)}</td>
                      <td>${a.recommendedPerCadence.toFixed(2)}</td>
                      <td>{a.focusDebt ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {whatIf && whatIf.comparison && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
              <h4>What-if Simulation</h4>
              <p>
                Adding ${Number(extraPayment).toFixed(2)} per {cadence === "biweekly" ? "paycheck" : "month"} saves
                <strong> {whatIf.comparison.monthsSaved} month(s)</strong> and about
                <strong> ${whatIf.comparison.interestSaved.toFixed(2)}</strong> in interest.
              </p>
            </div>
          )}
        </div>
      )}

      {dashboard && dashboard.upcomingDue.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Upcoming Due Dates (30 Days)</h3>
          <table>
            <thead>
              <tr>
                <th>Debt</th>
                <th>Due Date</th>
                <th>Minimum Payment</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.upcomingDue.map((debt) => (
                <tr key={debt._id}>
                  <td>{debt.name}</td>
                  <td>
                    {debt.nextDueDate ? new Date(debt.nextDueDate).toLocaleDateString() : debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : "-"}
                    <div style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>{debt.dueScheduleType || "specific"}</div>
                  </td>
                  <td>${debt.minimumPayment.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {debts.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No debts yet. Add debts to unlock payoff planning and what-if simulations.</p>
          <p>Total debt tracked: ${totalDebt.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}










