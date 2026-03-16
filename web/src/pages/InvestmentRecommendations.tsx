import { useState } from "react";
import type { ReactElement } from "react";
import { api } from "../api";
import "./InvestmentRecommendations.css";

interface ETF {
  symbol: string;
  name: string;
  allocation: number;
  fee: number;
  type: string;
  description: string;
}

interface Projection {
  year: number;
  age: number;
  balance: number;
  contributions: number;
  investmentGains: number;
}

interface AllocationData {
  equities: number;
  fixedIncome: number;
  alternatives: number;
  cash: number;
}

interface Recommendation {
  riskProfile: "conservative" | "moderate" | "aggressive";
  allocation: AllocationData;
  etfs: ETF[];
  monthlyInvestment: number;
  successProbability: number;
  projections: Projection[];
  recommendations: string[];
}

export default function InvestmentRecommendations(): ReactElement {
  const [goalAmount, setGoalAmount] = useState(500000);
  const [goalYear, setGoalYear] = useState(new Date().getFullYear() + 20);
  const [currentNetWorth, setCurrentNetWorth] = useState(50000);
  const [currentAge, setCurrentAge] = useState(35);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [riskProfile, setRiskProfile] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [monthlyInvestment, setMonthlyInvestment] = useState(1000);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [etfs, setEtfs] = useState<ETF[]>([]);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [successProbability, setSuccessProbability] = useState<number | null>(null);

  const analyzeGoal = async () => {
    setLoading(true);
    try {
      const response = await api("/api/investment-recommendations/analyze", {
        method: "POST",
        body: JSON.stringify({
          currentNetWorth,
          goalAmount,
          goalYear,
          currentAge,
          preferLowCost: true,
        }),
      });

      setRecommendation(response.recommendation);
      setRiskProfile(response.recommendation.riskProfile);
      setProjections(response.recommendation.projections);
      setEtfs(response.recommendation.etfs);
      setAllocation(response.recommendation.allocation);
      setMonthlyInvestment(response.recommendation.monthlyInvestment);
      setSuccessProbability(response.recommendation.successProbability);
    } catch (err) {
      console.error(err);
      alert("Error analyzing investment goal");
    } finally {
      setLoading(false);
    }
  };

  const yearsToGoal = goalYear - new Date().getFullYear();

  return (
    <div className="investment-container">
      <div className="investment-header">
        <h1>📈 Investment Recommendations</h1>
        <p>Goal-based portfolio allocation and ETF recommendations</p>
      </div>

      <div className="investment-section">
        <h2>Step 1: Define Your Investment Goal</h2>
        <div className="goal-inputs">
          <div className="input-group">
            <label>Current Net Worth ($)</label>
            <input
              type="number"
              value={currentNetWorth}
              onChange={(e) => setCurrentNetWorth(Number(e.target.value))}
              min="0"
            />
          </div>
          <div className="input-group">
            <label>Investment Goal ($)</label>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
              min="0"
            />
          </div>
          <div className="input-group">
            <label>Target Year</label>
            <input
              type="number"
              value={goalYear}
              onChange={(e) => setGoalYear(Number(e.target.value))}
              min={new Date().getFullYear()}
            />
            <small>{yearsToGoal} years from now</small>
          </div>
          <div className="input-group">
            <label>Current Age</label>
            <input
              type="number"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              min="18"
              max="100"
            />
          </div>
        </div>
        <button onClick={analyzeGoal} disabled={loading} className="btn-primary">
          {loading ? "Analyzing..." : "💡 Generate Recommendation"}
        </button>
      </div>

      {recommendation && (
        <>
          <div className="investment-section results">
            <h2>Your Investment Plan</h2>
            <div className="plan-stats">
              <div className="stat-card">
                <span className="label">Recommended Risk Profile</span>
                <span className="value">{riskProfile.toUpperCase()}</span>
                <span className="sub">Time horizon: {yearsToGoal} years</span>
              </div>
              <div className="stat-card">
                <span className="label">Monthly Investment Needed</span>
                <span className="value">${monthlyInvestment.toFixed(0)}</span>
                <span className="sub">To reach ${goalAmount.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="label">Success Probability</span>
                <span className={`value ${successProbability! >= 75 ? "high" : successProbability! >= 50 ? "medium" : "low"}`}>
                  {successProbability}%
                </span>
                <span className="sub">Monte Carlo simulation</span>
              </div>
            </div>
          </div>

          <div className="investment-section">
            <h2>Recommended Asset Allocation</h2>
            {allocation && (
              <div className="allocation-grid">
                <div className="allocation-item">
                  <div className="allocation-bar equities" style={{ width: `${allocation.equities}%` }}></div>
                  <span className="label">Equities</span>
                  <span className="value">{allocation.equities}%</span>
                  <small>Growth assets for long-term returns</small>
                </div>
                <div className="allocation-item">
                  <div className="allocation-bar fixed-income" style={{ width: `${allocation.fixedIncome}%` }}></div>
                  <span className="label">Fixed Income</span>
                  <span className="value">{allocation.fixedIncome}%</span>
                  <small>Bonds for stability</small>
                </div>
                <div className="allocation-item">
                  <div className="allocation-bar alternatives" style={{ width: `${allocation.alternatives}%` }}></div>
                  <span className="label">Alternatives</span>
                  <span className="value">{allocation.alternatives}%</span>
                  <small>REITs and diversification</small>
                </div>
                <div className="allocation-item">
                  <div className="allocation-bar cash" style={{ width: `${allocation.cash}%` }}></div>
                  <span className="label">Cash</span>
                  <span className="value">{allocation.cash}%</span>
                  <small>Emergency liquidity</small>
                </div>
              </div>
            )}
          </div>

          <div className="investment-section">
            <h2>Recommended Canadian ETFs</h2>
            <div className="etf-recommendations">
              {etfs.map((etf) => (
                <div key={etf.symbol} className="etf-card">
                  <div className="etf-header">
                    <h4>{etf.symbol}</h4>
                    <span className="allocation">{etf.allocation.toFixed(1)}%</span>
                  </div>
                  <p className="etf-name">{etf.name}</p>
                  <div className="etf-details">
                    <span>MER: {etf.fee.toFixed(2)}%</span>
                    <span className="type">{etf.type}</span>
                  </div>
                  <p className="etf-description">{etf.description}</p>
                </div>
              ))}
            </div>
            <p className="etf-note">
              💡 These are low-cost Canadian-listed ETFs. Consider holding in TFSA first ($7,000/year tax-free) or RRSP.
            </p>
          </div>

          <div className="investment-section">
            <h2>Projected Portfolio Growth</h2>
            {projections.length > 0 && (
              <div className="projection-chart">
                <div className="chart-container">
                  <table className="projection-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Age</th>
                        <th>Balance</th>
                        <th>Contributions</th>
                        <th>Investment Gains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projections.slice(0, 10).map((p) => (
                        <tr key={p.year}>
                          <td>{p.year}</td>
                          <td>{p.age}</td>
                          <td>${p.balance.toLocaleString()}</td>
                          <td>${p.contributions.toLocaleString()}</td>
                          <td>${p.investmentGains.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="investment-section">
            <h2>💡 Investment Recommendations</h2>
            <div className="recommendations-list">
              {recommendation.recommendations.map((rec: string, idx: number) => (
                <p key={idx} className="recommendation-item">
                  {rec}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
