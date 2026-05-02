import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from "recharts";

const CAD = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

function projectRetirement(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  expectedReturn: number,
  inflationRate: number,
  desiredAnnualIncome: number,
  cppMonthly: number,
  oasMonthly: number
) {
  const realReturn = (1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1;
  const monthlyReal = realReturn / 12;
  const yearsToRetirement = retirementAge - currentAge;
  const monthsToRetirement = yearsToRetirement * 12;

  // Accumulation phase (FV of existing savings + FV of contributions)
  const fvSavings = currentSavings * Math.pow(1 + monthlyReal, monthsToRetirement);
  const fvContributions =
    monthlyReal > 0
      ? monthlyContribution * ((Math.pow(1 + monthlyReal, monthsToRetirement) - 1) / monthlyReal)
      : monthlyContribution * monthsToRetirement;
  const totalAtRetirement = fvSavings + fvContributions;

  // Decumulation: how long will savings last?
  const annualCPP = cppMonthly * 12;
  const annualOAS = oasMonthly * 12;
  const annualGap = Math.max(0, desiredAnnualIncome - annualCPP - annualOAS);
  const monthlyGap = annualGap / 12;

  let balance = totalAtRetirement;
  let yearsLast = 0;
  while (balance > 0 && yearsLast < 60) {
    balance = balance * (1 + monthlyReal) * 12 - monthlyGap * 12;
    yearsLast++;
  }

  // Year-by-year projection for chart
  const points: { age: number; balance: number; phase: string }[] = [];
  let bal = currentSavings;
  for (let y = 0; y <= Math.min(yearsToRetirement + Math.min(yearsLast, 40), 60); y++) {
    const age = currentAge + y;
    if (y <= yearsToRetirement) {
      points.push({ age, balance: Math.round(bal), phase: "accumulation" });
      bal = bal * Math.pow(1 + monthlyReal, 12) + monthlyContribution * 12;
    } else {
      points.push({ age, balance: Math.round(Math.max(0, bal)), phase: "retirement" });
      bal = bal * Math.pow(1 + monthlyReal, 12) - monthlyGap * 12;
    }
  }

  const safeWithdrawalRate = totalAtRetirement > 0 ? (monthlyGap * 12) / totalAtRetirement : 0;
  const replacementRate = desiredAnnualIncome > 0 ? (annualCPP + annualOAS) / desiredAnnualIncome : 0;

  return {
    totalAtRetirement,
    yearsLast,
    ageRunsOut: retirementAge + yearsLast,
    annualGap,
    safeWithdrawalRate,
    replacementRate,
    points,
  };
}

function randNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface MCPoint { age: number; p10: number; p50: number; p90: number; base: number; band: number; }
interface MCResult { successRate: number; comfortRate: number; medianFinal: number; points: MCPoint[]; }

function runMonteCarlo(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  monthlyGap: number,
  sims = 3000
): MCResult {
  const endAge = 95;
  const totalYears = endAge - currentAge;
  const retireYear = retirementAge - currentAge;
  const MEAN_RETURN = 0.06 / 12;
  const STD_RETURN = 0.12 / Math.sqrt(12);

  let successes = 0;
  let comforts = 0;
  const yearlyBalances: number[][] = Array.from({ length: totalYears + 1 }, () => []);

  for (let s = 0; s < sims; s++) {
    let bal = currentSavings;
    yearlyBalances[0].push(bal);
    for (let y = 1; y <= totalYears; y++) {
      for (let m = 0; m < 12; m++) {
        const r = randNormal(MEAN_RETURN, STD_RETURN);
        bal = bal * (1 + r) + (y <= retireYear ? monthlyContribution : -monthlyGap);
        if (bal < 0) bal = 0;
      }
      yearlyBalances[y].push(bal);
    }
    if (yearlyBalances[totalYears][s] > 0) successes++;
    if (yearlyBalances[totalYears][s] > monthlyGap * 12 * 2) comforts++;
  }

  const pct = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.min(Math.floor(p * sorted.length), sorted.length - 1)];
  };

  const points: MCPoint[] = yearlyBalances.map((vals, i) => {
    const p10 = pct(vals, 0.1);
    const p90 = pct(vals, 0.9);
    return { age: currentAge + i, p10, p50: pct(vals, 0.5), p90, base: p10, band: p90 - p10 };
  });

  return {
    successRate: (successes / sims) * 100,
    comfortRate: (comforts / sims) * 100,
    medianFinal: pct(yearlyBalances[totalYears], 0.5),
    points,
  };
}

export default function RetirementProjector() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [monthlyContribution, setMonthlyContribution] = useState(1000);
  const [expectedReturn, setExpectedReturn] = useState(6);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [desiredIncome, setDesiredIncome] = useState(60000);
  const [cppMonthly, setCppMonthly] = useState(800);
  const [oasMonthly, setOasMonthly] = useState(698);

  const result = useMemo(
    () =>
      projectRetirement(
        currentAge, retirementAge, currentSavings,
        monthlyContribution, expectedReturn, inflationRate,
        desiredIncome, cppMonthly, oasMonthly
      ),
    [currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn, inflationRate, desiredIncome, cppMonthly, oasMonthly]
  );

  const swr = result.safeWithdrawalRate * 100;
  const swrOk = swr <= 4;

  const [mcResult, setMcResult] = useState<MCResult | null>(null);
  const [runningMC, setRunningMC] = useState(false);

  const runMC = () => {
    setRunningMC(true);
    setTimeout(() => {
      setMcResult(runMonteCarlo(currentAge, retirementAge, currentSavings, monthlyContribution, result.annualGap / 12));
      setRunningMC(false);
    }, 0);
  };

  const inputRow = (label: string, value: number, setter: (v: number) => void, opts: { min?: number; max?: number; step?: number; prefix?: string; suffix?: string }) => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: "0.7rem", color: "var(--text-light)", display: "block", marginBottom: 3 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {opts.prefix && <span style={{ fontSize: "0.72rem", color: "var(--text-light)" }}>{opts.prefix}</span>}
        <input
          type="number"
          value={value}
          min={opts.min}
          max={opts.max}
          step={opts.step ?? 1}
          onChange={(e) => setter(Number(e.target.value))}
          style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", color: "var(--text)", fontSize: "0.8rem", margin: 0 }}
        />
        {opts.suffix && <span style={{ fontSize: "0.72rem", color: "var(--text-light)" }}>{opts.suffix}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "10px 16px" }}>
      <h1 style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: 4 }}>Retirement Projector</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 12, fontSize: "0.72rem" }}>All values in today's dollars (inflation-adjusted). CPP max 2024: $1,364/mo; OAS: $698/mo at 65.</p>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Inputs */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
          <h3 style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: 8 }}>Your Numbers</h3>
          {inputRow("Current Age", currentAge, setCurrentAge, { min: 18, max: 80 })}
          {inputRow("Target Retirement Age", retirementAge, setRetirementAge, { min: currentAge + 1, max: 85 })}
          {inputRow("Current Savings (RRSP + TFSA + other)", currentSavings, setCurrentSavings, { min: 0, step: 5000, prefix: "$" })}
          {inputRow("Monthly Contribution", monthlyContribution, setMonthlyContribution, { min: 0, step: 100, prefix: "$" })}
          {inputRow("Expected Annual Return", expectedReturn, setExpectedReturn, { min: 0, max: 15, step: 0.5, suffix: "%" })}
          {inputRow("Inflation Rate", inflationRate, setInflationRate, { min: 0, max: 10, step: 0.25, suffix: "%" })}
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
          <h3 style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: 8 }}>Retirement Income</h3>
          {inputRow("Desired Annual Income (today's $)", desiredIncome, setDesiredIncome, { min: 0, step: 5000, prefix: "$" })}
          {inputRow("Expected CPP/QPP (monthly)", cppMonthly, setCppMonthly, { min: 0, max: 1400, step: 50, prefix: "$" })}
          {inputRow("Expected OAS (monthly)", oasMonthly, setOasMonthly, { min: 0, max: 800, step: 50, prefix: "$" })}
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            {[
              { label: "Savings at Retirement", value: CAD(result.totalAtRetirement), color: "#2563eb" },
              { label: "Annual Income Gap", value: CAD(result.annualGap), color: result.annualGap > 0 ? "#dc2626" : "#059669", sub: "(after CPP + OAS)" },
              { label: "Withdrawal Rate", value: `${swr.toFixed(1)}%`, color: swrOk ? "#059669" : "#dc2626", sub: swrOk ? "✓ Sustainable" : "⚠ Above 4% rule" },
              { label: "Savings Last Until", value: `Age ${Math.min(result.ageRunsOut, retirementAge + 60)}${result.ageRunsOut >= retirementAge + 60 ? "+" : ""}`, color: result.ageRunsOut >= 90 ? "#059669" : "#d97706" },
              { label: "Years to Retirement", value: retirementAge - currentAge, color: "var(--text)" },
              { label: "CPP + OAS Cover", value: `${(result.replacementRate * 100).toFixed(0)}%`, color: result.replacementRate >= 0.4 ? "#059669" : "#d97706", sub: "of desired income" },
            ].map((c) => (
              <div key={c.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                {c.sub && <div style={{ fontSize: "0.68rem", color: "var(--text-light)", marginTop: 2 }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 8 }}>Portfolio Balance Projection</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="age" label={{ value: "Age", position: "insideBottom", offset: -2 }} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => CAD(Number(v))} labelFormatter={(l) => `Age ${l}`} />
                <Legend />
                <ReferenceLine x={retirementAge} stroke="#d97706" strokeDasharray="6 3" label={{ value: "Retire", position: "top", fontSize: 11 }} />
                <Line
                  dataKey="balance"
                  name="Portfolio Balance"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tips */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 8 }}>Key Assumptions & Tips</h3>
            <ul style={{ fontSize: "0.72rem", color: "var(--text-light)", lineHeight: 1.8, paddingLeft: 16 }}>
              <li>The <strong>4% rule</strong>: withdraw no more than 4% of your portfolio annually for a 30-year retirement.</li>
              <li>Max RRSP contribution room is 18% of prior-year income (2024 limit: $31,560).</li>
              <li>Max TFSA room accumulates at $7,000/year (2024). Use TFSA for tax-free growth.</li>
              <li>CPP is reduced ~7.2% per year if taken before 65, increased ~8.4%/year up to age 70.</li>
              <li>OAS is clawed back above ~$90,997 of net income. Deferring to 70 boosts it 36%.</li>
              <li>A balanced ETF (e.g., XBAL) has historically returned ~6–7% annually before inflation.</li>
            </ul>
          </div>

          {/* Monte Carlo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ fontSize: "0.75rem", fontWeight: 600, margin: 0 }}>Monte Carlo Simulation (3,000 scenarios)</h3>
              <button
                onClick={runMC}
                disabled={runningMC}
                style={{ fontSize: "0.72rem", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}
              >
                {runningMC ? "Running…" : "▶ Run Simulation"}
              </button>
            </div>
            {!mcResult && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-light)", margin: 0 }}>
                Click Run Simulation to model 3,000 randomised market scenarios and see your probability of success.
              </p>
            )}
            {mcResult && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                  {[
                    { label: "Success Rate", value: `${mcResult.successRate.toFixed(0)}%`, color: mcResult.successRate >= 80 ? "#059669" : mcResult.successRate >= 60 ? "#d97706" : "#dc2626", sub: "funds last to age 95" },
                    { label: "Comfort Rate", value: `${mcResult.comfortRate.toFixed(0)}%`, color: mcResult.comfortRate >= 70 ? "#059669" : "#d97706", sub: "2-yr buffer at 95" },
                    { label: "Median at Age 95", value: CAD(mcResult.medianFinal), color: "var(--text)", sub: "50th percentile" },
                  ].map(c => (
                    <div key={c.label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-light)", textTransform: "uppercase" }}>{c.label}</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-light)" }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={mcResult.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: "Age", position: "insideBottom", offset: -2 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => CAD(Number(v))} labelFormatter={(l) => `Age ${l}`} />
                    <ReferenceLine x={retirementAge} stroke="#d97706" strokeDasharray="6 3" />
                    <Area type="monotone" dataKey="base" stackId="mc" stroke="none" fill="#4f46e5" fillOpacity={0.08} legendType="none" />
                    <Area type="monotone" dataKey="band" stackId="mc" stroke="none" fill="#4f46e5" fillOpacity={0.18} name="P10–P90 band" />
                    <Line type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={2} dot={false} name="Median (P50)" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ fontSize: "0.68rem", color: "var(--text-light)", marginTop: 4 }}>
                  Shaded band = P10–P90 outcome range. Assumes 6% mean / 12% std dev annual nominal return. Results vary each run.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
