// @ts-nocheck
import { S } from "./styles";

export default function BottomNav({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "center", padding: "6px 0 10px", zIndex: 100 }}>
      <div style={{ display: "flex", maxWidth: "440px", width: "100%", justifyContent: "space-around" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTabChange(t.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", padding: "4px 12px", color: activeTab === t.id ? S.blue : S.textTer, transition: "color 0.2s", position: "relative" }}>
            <span style={{ fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>{t.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
            {t.badge && <span style={{ position: "absolute", top: -2, right: 4, background: S.blue, color: "#fff", fontSize: "8px", fontWeight: 700, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>{t.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
