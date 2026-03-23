// @ts-nocheck
import { useState } from "react";
import { S } from "./styles";
import { Avatar } from "./ui";

export default function MatchesList({ matches, allProfiles, onOpenChat, onUnmatch }) {
  const [confirmUnmatch, setConfirmUnmatch] = useState<string | null>(null);
  const [unmatching, setUnmatching] = useState(false);

  const handleUnmatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    if (confirmUnmatch === matchId) {
      setUnmatching(true);
      if (onUnmatch) await onUnmatch(matchId);
      setUnmatching(false);
      setConfirmUnmatch(null);
    } else {
      setConfirmUnmatch(matchId);
    }
  };

  if (!matches.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎯</div>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>Aun no tienes matches</h3>
      <p style={{ fontSize: "14px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>Explora perfiles y conecta con otros catalizadores</p>
    </div>
  );

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "16px" }}>Tus Conexiones ({matches.length})</h3>
      {matches.map(m => {
        const p = allProfiles.find(x => x.id === m.id);
        if (!p) return null;
        const showLocation = p.showLocation !== false;
        const isConfirming = confirmUnmatch === m.matchId;

        return (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", marginBottom: "8px", background: S.card, borderRadius: "16px", border: `1px solid ${isConfirming ? S.red : S.border}`, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { if (!isConfirming) { e.currentTarget.style.borderColor = S.green; e.currentTarget.style.transform = "translateY(-2px)"; } }}
            onMouseLeave={e => { if (!isConfirming) { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = "translateY(0)"; } setConfirmUnmatch(null); }}>
            <div onClick={() => onOpenChat(m)} style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <Avatar profile={p} size={48}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h4 style={{ margin: 0, color: S.text, fontSize: "15px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</h4>
                  {m.type === "cupido" && <span style={{ fontSize: "10px", color: S.blue, background: S.blueBg, padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🎯 Sugerido</span>}
                </div>
                <p style={{ margin: "2px 0 0", color: S.textTer, fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                  {p.role} {showLocation && `· ${p.city}`}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span onClick={() => onOpenChat(m)} style={{ color: S.green, fontSize: "16px", cursor: "pointer" }}>💬</span>
              {m.matchId && onUnmatch && (
                <button
                  onClick={(e) => handleUnmatch(e, m.matchId)}
                  disabled={unmatching}
                  title={isConfirming ? "Confirmar" : "Eliminar conexion"}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: isConfirming ? S.red : S.cardLight,
                    border: `1.5px solid ${isConfirming ? S.red : S.border}`,
                    color: isConfirming ? "#fff" : S.textTer,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: unmatching ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    transition: "all 0.2s"
                  }}
                >
                  {unmatching ? "..." : isConfirming ? "✓" : "✕"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
