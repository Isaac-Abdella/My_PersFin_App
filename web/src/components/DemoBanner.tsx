import { useState } from "react";
import { useAuth } from "../AuthContext";
import { api } from "../api";

type Action = "regenerate" | "reset" | "clear";

const ACTION_CONFIG: Record<Action, {
  label: string;
  description: string;
  confirmMsg: string;
  successMsg: string;
  color: string;
}> = {
  regenerate: {
    label: "Regenerate Data",
    description: "Same profile type — new random amounts & today's dates",
    confirmMsg: "Regenerate all data with fresh random values? This replaces your current data.",
    successMsg: "Data regenerated! Reloading…",
    color: "#2563eb",
  },
  reset: {
    label: "Reset to Baseline",
    description: "Restore the deterministic demo baseline (always identical)",
    confirmMsg: "Reset data to the standard demo baseline? This replaces your current data.",
    successMsg: "Data reset to baseline! Reloading…",
    color: "#7c3aed",
  },
  clear: {
    label: "Clear All Data",
    description: "Wipe everything — start with a completely blank account",
    confirmMsg: "Clear ALL data? This cannot be undone.",
    successMsg: "All data cleared! Reloading…",
    color: "#dc2626",
  },
};

function isDemoUser(email: string | undefined): boolean {
  return !!email && /^user_test\d+@demo\.com$/.test(email);
}

export default function DemoBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<Action | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoUser(user?.email) || dismissed) return null;

  async function handleAction(action: Action) {
    const cfg = ACTION_CONFIG[action];
    if (!window.confirm(cfg.confirmMsg)) return;
    setBusy(action);
    try {
      await api(`/demo/${action}`, { method: "POST" });
      alert(cfg.successMsg);
      window.location.reload();
    } catch (err: any) {
      alert(err.message ?? "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      borderBottom: "1px solid #334155",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      fontSize: "13px",
      zIndex: 50,
    }}>
      <span style={{ color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap" }}>
        DEMO MODE
      </span>
      <span style={{ color: "#94a3b8", flexShrink: 0 }}>
        {user?.email}
      </span>

      <div style={{ flex: 1 }} />

      {(Object.entries(ACTION_CONFIG) as [Action, typeof ACTION_CONFIG[Action]][]).map(([action, cfg]) => (
        <button
          key={action}
          disabled={!!busy}
          onClick={() => handleAction(action)}
          title={cfg.description}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            border: `1px solid ${cfg.color}`,
            background: busy === action ? cfg.color : "transparent",
            color: busy === action ? "#fff" : cfg.color,
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "12px",
            whiteSpace: "nowrap",
            opacity: busy && busy !== action ? 0.5 : 1,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {busy === action ? "Working…" : cfg.label}
        </button>
      ))}

      <button
        onClick={() => setDismissed(true)}
        title="Hide this banner"
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px 4px",
        }}
      >
        ×
      </button>
    </div>
  );
}
