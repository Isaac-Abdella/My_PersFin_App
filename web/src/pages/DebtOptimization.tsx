import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { api } from "../api";
import "./DebtOptimization.css";

interface Debt {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
}

interface PayoffPlanData {
  strategy: string;
  totalDebt: number;
  totalInterest: number;
  payoffMonths: number;
  monthlyPayment: number;
  payoffDate: string;
}

interface ComparisonData {
  avalanche: {
    totalInterest: number;
    payoffMonths: number;
    monthlyPayment: number;
  };
  snowball: {
    totalInterest: number;
    payoffMonths: number;
    monthlyPayment: number;
  };
}

interface LumpSumResultData {
  lumpSumAmount: number;
  recommendation: string;
  targetDebt: {
    name: string;
    interestRate: number;
    currentBalance: number;
  } | null;
  annualInterestSavings: {
    ifAppliedToHighestInterest: number;
    ifAppliedToLowestBalance: number;
  };
}

interface MortgageResultData {
  mortgageName: string;
  standardPayoff: {
    monthlyPayment: number;
    payoffMonths: number;
    totalInterest: number;
    payoffDate: string;
  };
  acceleratedPayoff: {
    method: string;
    accelerationAmount: number;
    monthlyPayment: number;
    payoffMonths: number;
    totalInterest: number;
    payoffDate: string;
  };
  savings: {
    interestSavings: number;
    yearsSaved: number;
  };
  recommendation: string;
}

interface ConsolidationResultData {
  currentPlan: {
    strategy: string;
    totalInterest: number;
    monthlyPayment: number;
  };
  consolidatedPlan: {
    strategy: string;
    consolidationRate: number;
    totalInterest: number;
    payoffMonths: number;
    monthlyPayment: number;
  };
  analysis: {
    interestSavings: number;
    timeSavings: number;
    recommendation: string;
  };
}

export default function DebtOptimization(): ReactElement {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [strategyType, setStrategyType] = useState<"avalanche" | "snowball" | "hybrid">(
    "hybrid"
  );
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [weighting, setWeighting] = useState(50);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PayoffPlanData | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonData | null>(null);
  const [lumpSumAmount, setLumpSumAmount] = useState(0);
  const [lumpSumResult, setLumpSumResult] = useState<LumpSumResultData | null>(null);
  const [accelerationMethod, setAccelerationMethod] = useState<"biweekly" | "lump-sum" | "increased-payment">(
    "increased-payment"
  );
  const [accelerationAmount, setAccelerationAmount] = useState(0);
  const [mortgageResults, setMortgageResults] = useState<MortgageResultData | null>(null);
  const [consolidationRate, setConsolidationRate] = useState(8);
  const [consolidationResults, setConsolidationResults] = useState<ConsolidationResultData | null>(null);

  useEffect(() => {
    fetch();
  }, []);

  const fetch = async () => {
    try {
      const debtRes = await api("/api/debts");
      if (debtRes.debts) {
        setDebts(debtRes.debts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDebtSelect = (debtId: string) => {
    setSelectedDebts((prev) =>
      prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]
    );
  };

  const analyzeStrategy = async () => {
    if (selectedDebts.length === 0) {
      alert("Please select at least one debt");
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/debt-strategies/analyze", {
        method: "POST",
        body: JSON.stringify({
          debtIds: selectedDebts,
          strategyType,
          monthlyBudget,
          weighting,
        }),
      });

      setPlan(response.plan);
      setComparisons(response.comparisons);
    } catch (err) {
      console.error(err);
      alert("Error analyzing strategy");
    } finally {
      setLoading(false);
    }
  };

  const optimizeLumpSum = async () => {
    if (selectedDebts.length === 0) {
      alert("Please select at least one debt");
      return;
    }

    if (lumpSumAmount <= 0) {
      alert("Please enter a lump sum amount");
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/debt-strategies/lump-sum-optimization", {
        method: "POST",
        body: JSON.stringify({
          debtIds: selectedDebts,
          lumpSumAmount,
        }),
      });

      setLumpSumResult(response);
    } catch (err) {
      console.error(err);
      alert("Error optimizing lump sum");
    } finally {
      setLoading(false);
    }
  };

  const analyzeMortgageAcceleration = async () => {
    const mortgageDebt = selectedDebts[0];
    if (!mortgageDebt) {
      alert("Please select a debt");
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/debt-strategies/mortgage-acceleration", {
        method: "POST",
        body: JSON.stringify({
          debtId: mortgageDebt,
          accelerationMethod,
          accelerationAmount,
        }),
      });

      setMortgageResults(response);
    } catch (err) {
      console.error(err);
      alert("Error analyzing mortgage acceleration");
    } finally {
      setLoading(false);
    }
  };

  const analyzeConsolidation = async () => {
    if (selectedDebts.length === 0) {
      alert("Please select at least one debt");
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/debt-strategies/consolidation-analysis", {
        method: "POST",
        body: JSON.stringify({
          debtIds: selectedDebts,
          consolidationRate,
          monthlyBudget,
        }),
      });

      setConsolidationResults(response);
    } catch (err) {
      console.error(err);
      alert("Error analyzing consolidation");
    } finally {
      setLoading(false);
    }
  };

  const totalMinimumPayment = debts
    .filter((d) => selectedDebts.includes(d._id))
    .reduce((sum, d) => sum + d.minimumPayment, 0);

  return (
    <div className="debt-optimization-container">
      <div className="debt-header">
        <h1>🎯 Debt Optimization</h1>
        <p>Find the best path to become debt-free</p>
      </div>

      <div className="debt-section">
        <h2>Step 1: Select Your Debts</h2>
        <div className="debt-selector">
          {debts.length === 0 ? (
            <p className="no-debts">No debts found. Add debts to get started.</p>
          ) : (
            <div className="debt-grid">
              {debts.map((debt) => (
                <div key={debt._id} className="debt-card">
                  <input
                    type="checkbox"
                    id={`debt-${debt._id}`}
                    checked={selectedDebts.includes(debt._id)}
                    onChange={() => handleDebtSelect(debt._id)}
                  />
                  <label htmlFor={`debt-${debt._id}`}>
                    <div className="debt-info">
                      <strong>{debt.name}</strong>
                      <span className="debt-type">{debt.type}</span>
                    </div>
                    <div className="debt-details">
                      <span className="balance">${debt.currentBalance.toFixed(2)}</span>
                      <span className="rate">{debt.interestRate.toFixed(2)}%</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDebts.length > 0 && (
        <>
          <div className="debt-section">
            <h2>Step 2: Choose Strategy</h2>
            <div className="strategy-selector">
              <div className="strategy-option">
                <label>
                  <input
                    type="radio"
                    name="strategy"
                    value="avalanche"
                    checked={strategyType === "avalanche"}
                    onChange={(e) => setStrategyType(e.target.value as "avalanche" | "snowball" | "hybrid")}
                  />
                  <strong>Avalanche</strong>
                  <br />
                  <small>Pay highest interest first (saves most money)</small>
                </label>
              </div>
              <div className="strategy-option">
                <label>
                  <input
                    type="radio"
                    name="strategy"
                    value="snowball"
                    checked={strategyType === "snowball"}
                    onChange={(e) => setStrategyType(e.target.value as "avalanche" | "snowball" | "hybrid")}
                  />
                  <strong>Snowball</strong>
                  <br />
                  <small>Pay lowest balance first (psychological wins)</small>
                </label>
              </div>
              <div className="strategy-option">
                <label>
                  <input
                    type="radio"
                    name="strategy"
                    value="hybrid"
                    checked={strategyType === "hybrid"}
                    onChange={(e) => setStrategyType(e.target.value as "avalanche" | "snowball" | "hybrid")}
                  />
                  <strong>Hybrid</strong>
                  <br />
                  <small>Balance between both approaches</small>
                </label>
              </div>
            </div>

            {strategyType === "hybrid" && (
              <div className="hybrid-weighting">
                <label>Snowball ← Weighting → Avalanche</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weighting}
                  onChange={(e) => setWeighting(Number(e.target.value))}
                />
                <span>{weighting}% Avalanche</span>
              </div>
            )}
          </div>

          <div className="debt-section">
            <h2>Step 3: Set Monthly Budget</h2>
            <div className="budget-input">
              <label>Total Monthly Payment (including minimum payments)</label>
              <div className="input-group">
                <span>$</span>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  min={totalMinimumPayment}
                />
              </div>
              <small>
                Minimum required: ${totalMinimumPayment.toFixed(2)}/month (total of all minimum
                payments)
              </small>
              {monthlyBudget > 0 && monthlyBudget >= totalMinimumPayment && (
                <small className="extra-payment">
                  💪 Extra payment per month: ${(monthlyBudget - totalMinimumPayment).toFixed(2)}
                </small>
              )}
            </div>
          </div>

          <div className="debt-section">
            <div className="button-group">
              <button onClick={analyzeStrategy} disabled={loading} className="btn-primary">
                {loading ? "Analyzing..." : "✨ Analyze Strategy"}
              </button>
            </div>
          </div>

          {plan && (
            <div className="debt-section results">
              <h2>Your Payoff Plan</h2>
              <div className="plan-summary">
                <div className="plan-stat">
                  <span className="label">Strategy</span>
                  <span className="value">{strategyType.toUpperCase()}</span>
                </div>
                <div className="plan-stat">
                  <span className="label">Payoff Time</span>
                  <span className="value">
                    {Math.floor(plan.payoffMonths / 12)} years {plan.payoffMonths % 12} months
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="label">Total Interest</span>
                  <span className="value">${plan.totalInterest.toFixed(2)}</span>
                </div>
                <div className="plan-stat">
                  <span className="label">Monthly Payment</span>
                  <span className="value">${plan.monthlyPayment.toFixed(2)}</span>
                </div>
              </div>

              {comparisons && (
                <div className="comparisons">
                  <h3>How This Compares</h3>
                  <div className="comparison-grid">
                    <div className="comparison-card">
                      <h4>Avalanche</h4>
                      <p className="stat">
                        Interest: <strong>${comparisons.avalanche.totalInterest.toFixed(2)}</strong>
                      </p>
                      <p className="stat">
                        Months: <strong>{comparisons.avalanche.payoffMonths}</strong>
                      </p>
                      {strategyType !== "avalanche" && (
                        <p className="savings">
                          💡 You could save $
                          {Math.abs(plan.totalInterest - comparisons.avalanche.totalInterest).toFixed(2)}
                          {plan.totalInterest > comparisons.avalanche.totalInterest
                            ? " by using Avalanche"
                            : " with your strategy"}
                        </p>
                      )}
                    </div>
                    <div className="comparison-card">
                      <h4>Snowball</h4>
                      <p className="stat">
                        Interest: <strong>${comparisons.snowball.totalInterest.toFixed(2)}</strong>
                      </p>
                      <p className="stat">
                        Months: <strong>{comparisons.snowball.payoffMonths}</strong>
                      </p>
                      {strategyType !== "snowball" && (
                        <p className="savings">
                          ✅ Psychological wins with snowball
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="debt-section">
            <h2>🔧 Advanced Tools</h2>

            <div className="tool-subsection">
              <h3>💰 Lump Sum Optimizer</h3>
              <p>Have a tax refund or bonus? Find the best debt to apply it to.</p>
              <div className="input-group">
                <label>Lump Sum Amount</label>
                <span>$</span>
                <input
                  type="number"
                  value={lumpSumAmount}
                  onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                  min="0"
                />
                <button onClick={optimizeLumpSum} disabled={loading} className="btn-secondary">
                  Calculate Savings
                </button>
              </div>
              {lumpSumResult && (
                <div className="tool-result">
                  <p className="recommendation">{lumpSumResult.recommendation}</p>
                  {lumpSumResult.targetDebt && (
                    <div className="result-details">
                      <p>
                        <strong>Best Applied To:</strong> {lumpSumResult.targetDebt.name} (
                        {lumpSumResult.targetDebt.interestRate.toFixed(2)}%)
                      </p>
                      <p>
                        <strong>Annual Interest Savings:</strong>{" "}
                        ${lumpSumResult.annualInterestSavings.ifAppliedToHighestInterest.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="tool-subsection">
              <h3>🏠 Mortgage Acceleration</h3>
              <p>Speed up your mortgage payoff with strategic payments.</p>
              {selectedDebts.length > 0 && (
                <>
                  <div className="form-row">
                    <div>
                      <label>Acceleration Method</label>
                      <select
                        value={accelerationMethod}
                        onChange={(e) =>
                          setAccelerationMethod(e.target.value as "biweekly" | "lump-sum" | "increased-payment")
                        }
                      >
                        <option value="biweekly">Biweekly Payments</option>
                        <option value="increased-payment">Increased Payment</option>
                        <option value="lump-sum">Lump Sum Payment</option>
                      </select>
                    </div>
                    <div>
                      <label>Amount ($)</label>
                      <input
                        type="number"
                        value={accelerationAmount}
                        onChange={(e) => setAccelerationAmount(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <button
                      onClick={analyzeMortgageAcceleration}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Analyze
                    </button>
                  </div>
                  {mortgageResults && (
                    <div className="tool-result">
                      <div className="comparison-grid">
                        <div className="comparison-card">
                          <h4>Standard Payoff</h4>
                          <p className="stat">
                            Payoff: <strong>{mortgageResults.standardPayoff.payoffMonths}</strong> months
                          </p>
                          <p className="stat">
                            Interest: <strong>${mortgageResults.standardPayoff.totalInterest.toFixed(2)}</strong>
                          </p>
                        </div>
                        <div className="comparison-card">
                          <h4>Accelerated Payoff</h4>
                          <p className="stat">
                            Payoff: <strong>{mortgageResults.acceleratedPayoff.payoffMonths}</strong> months
                          </p>
                          <p className="stat">
                            Interest: <strong>${mortgageResults.acceleratedPayoff.totalInterest.toFixed(2)}</strong>
                          </p>
                        </div>
                      </div>
                      <p className="recommendation">{mortgageResults.recommendation}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="tool-subsection">
              <h3>🔗 Consolidation Analysis</h3>
              <p>Should you consolidate your debts? Compare the impact.</p>
              <div className="form-row">
                <div>
                  <label>Consolidation Interest Rate (%)</label>
                  <input
                    type="number"
                    value={consolidationRate}
                    onChange={(e) => setConsolidationRate(Number(e.target.value))}
                    min="0"
                    step="0.1"
                  />
                </div>
                <button
                  onClick={analyzeConsolidation}
                  disabled={loading || selectedDebts.length === 0}
                  className="btn-secondary"
                >
                  Analyze
                </button>
              </div>
              {consolidationResults && (
                <div className="tool-result">
                  <div className="comparison-grid">
                    <div className="comparison-card">
                      <h4>Keep Individual Debts</h4>
                      <p className="stat">
                        Interest: <strong>${consolidationResults.currentPlan.totalInterest.toFixed(2)}</strong>
                      </p>
                      <p className="stat">
                        Payoff: <strong>{consolidationResults.currentPlan.monthlyPayment}</strong> months
                      </p>
                    </div>
                    <div className="comparison-card">
                      <h4>Consolidate</h4>
                      <p className="stat">
                        Interest: <strong>${consolidationResults.consolidatedPlan.totalInterest.toFixed(2)}</strong>
                      </p>
                      <p className="stat">Rate: <strong>{consolidationResults.consolidatedPlan.consolidationRate}%</strong></p>
                    </div>
                  </div>
                  <p className="recommendation">{consolidationResults.analysis.recommendation}</p>
                  {consolidationResults.analysis.interestSavings > 0 && (
                    <p className="savings">
                      💰 Potential savings: ${consolidationResults.analysis.interestSavings.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
