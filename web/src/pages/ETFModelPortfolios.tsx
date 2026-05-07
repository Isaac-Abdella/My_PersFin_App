import { useState } from "react";
import { api } from "../api";
import "./ETFModelPortfolios.css";

interface AssetLocationRule {
  assetType: string;
  bestAccount: string;
  reason: string;
  priority: number;
  worstAccount: string;
}

const ALL_IN_ONE_ETFS = [
  {
    symbol: "XEQT",
    name: "iShares Core Equity ETF Portfolio",
    provider: "iShares (BlackRock)",
    equity: 100,
    bonds: 0,
    mer: 0.20,
    description: "100% global equity — maximum long-term growth, high short-term volatility. Best for investors with 20+ year horizons.",
    holdings: { canadianEquity: 25, usEquity: 45, intlEquity: 27, emerging: 3 },
    riskLevel: "Aggressive",
    riskColor: "#dc2626",
  },
  {
    symbol: "VEQT",
    name: "Vanguard All-Equity ETF Portfolio",
    provider: "Vanguard Canada",
    equity: 100,
    bonds: 0,
    mer: 0.24,
    description: "100% global equity. Slightly higher Canadian home bias than XEQT. Ideal for long-term investors comfortable with full equity volatility.",
    holdings: { canadianEquity: 30, usEquity: 43, intlEquity: 21, emerging: 6 },
    riskLevel: "Aggressive",
    riskColor: "#dc2626",
  },
  {
    symbol: "XGRO",
    name: "iShares Core Growth ETF Portfolio",
    provider: "iShares (BlackRock)",
    equity: 80,
    bonds: 20,
    mer: 0.20,
    description: "80% equity / 20% bonds. A popular balanced-growth option for investors with a 10–20 year horizon who want some downside cushion.",
    holdings: { canadianEquity: 20, usEquity: 36, intlEquity: 22, bonds: 20, emerging: 2 },
    riskLevel: "Growth",
    riskColor: "#d97706",
  },
  {
    symbol: "VGRO",
    name: "Vanguard Growth ETF Portfolio",
    provider: "Vanguard Canada",
    equity: 80,
    bonds: 20,
    mer: 0.24,
    description: "80% equity / 20% bonds. Near-identical to XGRO with slightly higher Canadian equity tilt. Great for 10–20 year investors.",
    holdings: { canadianEquity: 24, usEquity: 35, intlEquity: 17, bonds: 20, emerging: 4 },
    riskLevel: "Growth",
    riskColor: "#d97706",
  },
  {
    symbol: "XBAL",
    name: "iShares Core Balanced ETF Portfolio",
    provider: "iShares (BlackRock)",
    equity: 60,
    bonds: 40,
    mer: 0.20,
    description: "60% equity / 40% bonds. The classic balanced portfolio — lower volatility, suitable for 5–10 year horizons or near-retirees.",
    holdings: { canadianEquity: 15, usEquity: 27, intlEquity: 17, bonds: 40, emerging: 1 },
    riskLevel: "Balanced",
    riskColor: "#2563eb",
  },
  {
    symbol: "VBAL",
    name: "Vanguard Balanced ETF Portfolio",
    provider: "Vanguard Canada",
    equity: 60,
    bonds: 40,
    mer: 0.24,
    description: "60% equity / 40% bonds. Same balanced approach as XBAL with Vanguard's fund lineup underneath.",
    holdings: { canadianEquity: 18, usEquity: 26, intlEquity: 13, bonds: 40, emerging: 3 },
    riskLevel: "Balanced",
    riskColor: "#2563eb",
  },
  {
    symbol: "XCNS",
    name: "iShares Core Conservative Balanced ETF Portfolio",
    provider: "iShares (BlackRock)",
    equity: 40,
    bonds: 60,
    mer: 0.20,
    description: "40% equity / 60% bonds. Conservative — suitable for retirees or investors with a 3–5 year horizon who prioritize capital preservation.",
    holdings: { canadianEquity: 10, usEquity: 18, intlEquity: 12, bonds: 60 },
    riskLevel: "Conservative",
    riskColor: "#16a34a",
  },
];

const FUND_COLORS = ["var(--primary)", "#16a34a", "#94a3b8", "#d97706"];

const COUCH_POTATO_PORTFOLIOS = [
  {
    name: "One-Fund Solution",
    complexity: "Beginner",
    funds: [{ symbol: "XEQT or VEQT", pct: 100, type: "All-in-One Equity" }],
    description: "Buy one ETF, set automatic contributions, rebalance never. Perfect for set-and-forget investors.",
    pros: ["Zero rebalancing needed", "Ultra-simple", "Globally diversified"],
    cons: ["Slightly higher MER than DIY", "Less control over asset location"],
  },
  {
    name: "Classic 3-Fund Portfolio",
    complexity: "Intermediate",
    funds: [
      { symbol: "VCN / ZCN", pct: 25, type: "Canadian Equity" },
      { symbol: "XAW / VXC", pct: 55, type: "Global ex-Canada Equity" },
      { symbol: "ZAG / VAB", pct: 20, type: "Canadian Bonds" },
    ],
    description: "Three ETFs covering the entire global market. Slightly lower cost, enables tax-efficient asset location across accounts.",
    pros: ["Full control over asset location", "Lower blended MER", "Clear separation of asset classes"],
    cons: ["Requires manual rebalancing annually", "More decisions"],
  },
  {
    name: "Canadian Dividend Focus",
    complexity: "Intermediate",
    funds: [
      { symbol: "CDZ / VDY", pct: 20, type: "Canadian Dividend Equity" },
      { symbol: "VFV / XSP", pct: 40, type: "US Equity" },
      { symbol: "XEF / VIU", pct: 20, type: "International Equity" },
      { symbol: "ZAG / VAB", pct: 20, type: "Canadian Bonds" },
    ],
    description: "Emphasizes Canadian dividend-paying stocks (eligible for the dividend tax credit) alongside global exposure.",
    pros: ["Tax-efficient Canadian dividend income", "Income stream for non-registered accounts", "Strong Canadian sector exposure"],
    cons: ["More concentrated in Canada", "Dividend-focused = sector concentration (banks/energy/utilities)"],
  },
];

const DEFAULT_RULES: AssetLocationRule[] = [
  { assetType: "High-growth equity ETFs (XEQT, VEQT)", bestAccount: "TFSA", worstAccount: "Non-Registered", reason: "Tax-free growth most valuable for highest-returning assets", priority: 1 },
  { assetType: "US equity ETFs (VFV, XSP)", bestAccount: "RRSP", worstAccount: "TFSA", reason: "Canada–US treaty eliminates 15% withholding tax inside RRSP only", priority: 1 },
  { assetType: "Canadian bond ETFs (ZAG, VAB)", bestAccount: "RRSP", worstAccount: "Non-Registered", reason: "Interest income is 100% taxable — defer in RRSP", priority: 1 },
  { assetType: "Canadian equity ETFs (VCN, ZCN)", bestAccount: "Non-Reg or TFSA", worstAccount: "RRSP", reason: "Eligible for dividend tax credit in non-registered accounts", priority: 2 },
  { assetType: "Canadian REITs (ZRE, XRE)", bestAccount: "RRSP or TFSA", worstAccount: "Non-Registered", reason: "Distributions are fully taxable — shelter in registered accounts", priority: 1 },
  { assetType: "International equity ETFs (XEF, VIU)", bestAccount: "TFSA or Non-Reg", worstAccount: "RRSP", reason: "Foreign withholding applies in RRSP for non-US countries", priority: 2 },
  { assetType: "GICs / HISA", bestAccount: "TFSA", worstAccount: "Non-Registered", reason: "Interest is 100% taxable — TFSA converts it to tax-free income", priority: 1 },
];

export default function ETFModelPortfolios() {
  const [tab, setTab] = useState<"all-in-one" | "couch-potato" | "asset-location">("all-in-one");
  const [accountValues, setAccountValues] = useState({ tfsaValue: "", rrspValue: "", fhsaValue: "", nonRegValue: "" });
  const [locationResult, setLocationResult] = useState<{ rules: AssetLocationRule[]; accounts: any[]; total: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const runAssetLocation = async () => {
    setLoadingLocation(true);
    try {
      const data = await api("/portfolio/asset-location", {
        method: "POST",
        body: JSON.stringify({
          tfsaValue: Number(accountValues.tfsaValue) || 0,
          rrspValue: Number(accountValues.rrspValue) || 0,
          fhsaValue: Number(accountValues.fhsaValue) || 0,
          nonRegValue: Number(accountValues.nonRegValue) || 0,
        }),
      });
      setLocationResult(data);
    } catch { /* ignore */ }
    finally { setLoadingLocation(false); }
  };

  const displayRules = locationResult?.rules || DEFAULT_RULES;

  return (
    <div className="etf-container">
      <div className="etf-header">
        <h1>Canadian ETF Model Portfolios</h1>
        <p>
          Compare all-in-one ETFs, explore Couch Potato strategies, and optimize which assets
          belong in which registered account to maximize tax efficiency.
        </p>
      </div>

      <div className="etf-tabs">
        <button className={`etf-tab${tab === "all-in-one" ? " active" : ""}`} onClick={() => setTab("all-in-one")}>All-in-One ETFs</button>
        <button className={`etf-tab${tab === "couch-potato" ? " active" : ""}`} onClick={() => setTab("couch-potato")}>Couch Potato Portfolios</button>
        <button className={`etf-tab${tab === "asset-location" ? " active" : ""}`} onClick={() => setTab("asset-location")}>Asset Location Guide</button>
      </div>

      {/* ── All-in-One ETFs ── */}
      {tab === "all-in-one" && (
        <div>
          <div className="info-banner">
            All-in-one ETFs hold hundreds of underlying funds and automatically rebalance internally.
            MERs shown are approximate 2024 values. Data is for educational purposes — always verify with the fund provider.
          </div>

          <div className="etf-cards-grid">
            {ALL_IN_ONE_ETFS.map((etf) => (
              <div key={etf.symbol} className="etf-card">
                <div className="etf-card-top">
                  <div>
                    <span className="etf-symbol">{etf.symbol}</span>
                    <span className="risk-badge" style={{ background: etf.riskColor }}>{etf.riskLevel}</span>
                  </div>
                  <div className="etf-mer">MER {etf.mer}%</div>
                </div>
                <div className="etf-provider">{etf.provider}</div>
                <p className="etf-description">{etf.description}</p>

                <div className="alloc-bar-wrap">
                  <div className="alloc-bar">
                    <div className="alloc-bar-equity" style={{ width: `${etf.equity}%` }} title="Equity" />
                    <div className="alloc-bar-bonds" style={{ width: `${etf.bonds}%` }} title="Bonds" />
                  </div>
                  <div className="alloc-legend">
                    <span className="equity">■ {etf.equity}% Equity</span>
                    {etf.bonds > 0 && <span className="bonds">■ {etf.bonds}% Bonds</span>}
                  </div>
                </div>

                <div className="etf-holdings-grid">
                  {Object.entries(etf.holdings).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                      <strong>{v}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="table-card">
            <div className="table-card-header">
              <h3>Quick Comparison</h3>
            </div>
            <table className="inv-table">
              <thead>
                <tr>
                  {["Symbol", "Equity %", "Bonds %", "MER", "Best For"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_IN_ONE_ETFS.map((e, i) => (
                  <tr key={e.symbol} className={i % 2 !== 0 ? "row-alt" : ""}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{e.symbol}</td>
                    <td>{e.equity}%</td>
                    <td>{e.bonds}%</td>
                    <td>{e.mer}%</td>
                    <td style={{ color: "var(--text-light)", fontSize: "0.72rem" }}>{e.riskLevel} investors</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Couch Potato ── */}
      {tab === "couch-potato" && (
        <div>
          <div className="info-banner">
            The <strong>Canadian Couch Potato</strong> strategy, popularized by Dan Bortolotti, uses simple low-cost index ETFs
            to match the market rather than beat it — beating most actively managed funds over the long run.
          </div>

          {COUCH_POTATO_PORTFOLIOS.map((p) => (
            <div key={p.name} className="portfolio-card">
              <div className="portfolio-card-title">
                <h3>{p.name}</h3>
                <span className="complexity-badge">{p.complexity}</span>
              </div>
              <p className="portfolio-description">{p.description}</p>

              <div className="fund-alloc-bar">
                {p.funds.map((f, i) => (
                  <div key={f.symbol} style={{ width: `${f.pct}%`, background: FUND_COLORS[i % FUND_COLORS.length] }} title={`${f.symbol}: ${f.pct}%`} />
                ))}
              </div>
              <div className="fund-legend">
                {p.funds.map((f, i) => (
                  <div key={f.symbol} className="fund-legend-item" style={{ color: FUND_COLORS[i % FUND_COLORS.length] }}>
                    ■ <strong>{f.symbol}</strong> — {f.type} ({f.pct}%)
                  </div>
                ))}
              </div>

              <div className="pros-cons">
                <div>
                  <div className="pros-cons-title pros">Pros</div>
                  <ul>{p.pros.map((pr) => <li key={pr}>{pr}</li>)}</ul>
                </div>
                <div>
                  <div className="pros-cons-title cons">Cons</div>
                  <ul>{p.cons.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Asset Location ── */}
      {tab === "asset-location" && (
        <div>
          <div className="section-card">
            <h3>Your Account Values (optional)</h3>
            <p>Enter your account balances for a personalized asset location summary.</p>
            <div className="account-inputs">
              {[
                { key: "tfsaValue", label: "TFSA Total ($)" },
                { key: "rrspValue", label: "RRSP Total ($)" },
                { key: "fhsaValue", label: "FHSA Total ($)" },
                { key: "nonRegValue", label: "Non-Registered ($)" },
              ].map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={(accountValues as any)[key]}
                    onChange={(e) => setAccountValues((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={runAssetLocation} disabled={loadingLocation}>
              {loadingLocation ? "Loading…" : "Get Personalized Guide"}
            </button>
          </div>

          {locationResult && locationResult.accounts.length > 0 && (
            <div className="location-summary">
              <strong>Your registered accounts:</strong>{" "}
              {locationResult.accounts.map((a: any) => `${a.type} ($${a.value.toLocaleString()})`).join(" · ")}
              {" — Total "}<strong>${locationResult.total.toLocaleString()}</strong>
            </div>
          )}

          <div className="table-card">
            <div className="table-card-header">
              <h3>Canadian Tax-Law Asset Location Rules</h3>
              <p>Priority 1 = strong preference; Priority 2 = moderate preference based on Canadian tax rules.</p>
            </div>
            <table className="inv-table">
              <thead>
                <tr>
                  {["Asset Type", "Best Account", "Avoid", "Reason"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRules.map((r, i) => (
                  <tr key={r.assetType} className={i % 2 !== 0 ? "row-alt" : ""}>
                    <td style={{ fontWeight: 500 }}>{r.assetType}</td>
                    <td><span className="badge-best">{r.bestAccount}</span></td>
                    <td><span className="badge-avoid">{r.worstAccount}</span></td>
                    <td style={{ color: "var(--text-light)", fontSize: "0.72rem" }}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
