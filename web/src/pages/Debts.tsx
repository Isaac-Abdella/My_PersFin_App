import { useState, useEffect } from "react";
import { api } from "../api";
import type { Debt, PayoffStrategy } from "../types";

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategies, setStrategies] = useState<{ avalanche?: PayoffStrategy; snowball?: PayoffStrategy } | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "credit-card" as any,
    principal: "",
    currentBalance: "",
    interestRate: "",
    minimumPayment: "",
    lender: ""
  });

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      const data = await api("/debts");
      setDebts(data);
      
      if (data.length > 0) {
        const totalMin = data.reduce((sum: number, d: Debt) => sum + d.minimumPayment, 0);
        setMonthlyPayment(Math.max(totalMin + 100, 1000).toString());
      }
    } catch (err) {
      console.error("Failed to load debts", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategies = async () => {
    if (debts.length === 0) return;
    try {
      const data = await api(`/debts/payoff/strategies?monthlyPayment=${monthlyPayment}`);
      setStrategies(data);
    } catch (err: any) {
      alert(err.message);
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
          minimumPayment: parseFloat(formData.minimumPayment)
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
        lender: ""
      });
      loadDebts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this debt?")) return;
    try {
      await api(`/debts/${id}`, { method: "DELETE" });
      loadDebts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgInterestRate = debts.length > 0 
    ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length 
    : 0;

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Debt Management</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Debt"}
        </button>
      </div>

      {debts.length > 0 && (
        <div className="card-grid">
          <div className="card">
            <h3>Total Debt</h3>
            <p className="amount negative">${totalDebt.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Min. Monthly Payment</h3>
            <p className="amount">${totalMinPayment.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Avg. Interest Rate</h3>
            <p className="amount">{avgInterestRate.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <h3>New Debt</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Debt Name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />

            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
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
              onChange={e => setFormData({...formData, principal: e.target.value})}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Current Balance"
              value={formData.currentBalance}
              onChange={e => setFormData({...formData, currentBalance: e.target.value})}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Interest Rate (%)"
              value={formData.interestRate}
              onChange={e => setFormData({...formData, interestRate: e.target.value})}
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Minimum Payment"
              value={formData.minimumPayment}
              onChange={e => setFormData({...formData, minimumPayment: e.target.value})}
              required
            />

            <input
              type="text"
              placeholder="Lender (optional)"
              value={formData.lender}
              onChange={e => setFormData({...formData, lender: e.target.value})}
            />

            <button type="submit">Add Debt</button>
          </form>
        </div>
      )}

      {debts.length > 0 && (
        <>
          <div className="card">
            <h3>Your Debts</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Interest Rate</th>
                  <th>Min. Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => (
                  <tr key={debt._id}>
                    <td>{debt.name}</td>
                    <td>{debt.type}</td>
                    <td className="negative">${debt.currentBalance.toFixed(2)}</td>
                    <td>{debt.interestRate}%</td>
                    <td>${debt.minimumPayment.toFixed(2)}</td>
                    <td>
                      <button onClick={() => handleDelete(debt._id)} className="btn-danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>💡 Debt Payoff Calculator</h3>
            <p>Calculate the best strategy to pay off your debts:</p>
            <div className="payoff-calculator">
              <label>
                Monthly Payment Amount:
                <input
                  type="number"
                  step="50"
                  value={monthlyPayment}
                  onChange={e => setMonthlyPayment(e.target.value)}
                />
              </label>
              <button onClick={loadStrategies}>Calculate Strategies</button>
            </div>

            {strategies && (
              <div className="strategies">
                <div className="strategy">
                  <h4>🔥 Avalanche Method (Highest Interest First)</h4>
                  <p>Total Time: <strong>{strategies.avalanche?.totalYears} years</strong></p>
                  <p>Total Interest: <strong>${strategies.avalanche?.totalInterestPaid.toFixed(2)}</strong></p>
                  <p>This method saves you the most money on interest!</p>
                </div>

                <div className="strategy">
                  <h4>⛄ Snowball Method (Lowest Balance First)</h4>
                  <p>Total Time: <strong>{strategies.snowball?.totalYears} years</strong></p>
                  <p>Total Interest: <strong>${strategies.snowball?.totalInterestPaid.toFixed(2)}</strong></p>
                  <p>This method gives you quick wins and motivation!</p>
                </div>

                <div className="comparison">
                  {strategies.avalanche && strategies.snowball && (
                    <p>
                      💰 Using Avalanche saves you <strong>
                        ${(strategies.snowball.totalInterestPaid - strategies.avalanche.totalInterestPaid).toFixed(2)}
                      </strong> in interest!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {debts.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No debts tracked. Add your debts to see payoff strategies!</p>
        </div>
      )}
    </div>
  );
}
