// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { S } from "./styles";
import { calcCompat } from "./utils";
import { Tag, XPChip, StreakChip, Avatar, CompatBadge, ProfileBadges } from "./ui";

export default function ProfileCard({ profile, currentUser, onLeft, onRight, getCompatibility }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [compat, setCompat] = useState(() => calcCompat(currentUser, profile));
  const startX = useRef(0);

  useEffect(() => {
    if (getCompatibility && currentUser?.id && profile?.id) {
      getCompatibility(currentUser.id, profile.id).then(score => {
        if (score > 0) setCompat(score);
      });
    }
  }, [getCompatibility, currentUser?.id, profile?.id]);

  const onS = cx => { startX.current = cx; setDragging(true); };
  const onM = cx => { if (dragging) setDragX(cx - startX.current); };
  const onE = () => { if (dragX > 100) onRight(); else if (dragX < -100) onLeft(); setDragX(0); setDragging(false); };

  const showLocation = profile.showLocation !== false;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 auto", userSelect: "none", touchAction: "none" }}
      onMouseDown={e => onS(e.clientX)} onMouseMove={e => onM(e.clientX)} onMouseUp={onE} onMouseLeave={() => dragging && onE()}
      onTouchStart={e => onS(e.touches[0].clientX)} onTouchMove={e => onM(e.touches[0].clientX)} onTouchEnd={onE}>

      {/* Swipe direction indicators */}
      {dragX < -30 && (
        <div style={{
          position: "absolute", top: "50%", left: "8px", transform: "translateY(-50%)",
          zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          opacity: Math.min(Math.abs(dragX) / 100, 1), transition: "opacity 0.1s"
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: S.redBg,
            border: `2px solid ${S.red}`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: S.red, fontWeight: 700
          }}>✕</div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: S.red, fontFamily: "'DM Sans', sans-serif" }}>Pasar</span>
        </div>
      )}
      {dragX > 30 && (
        <div style={{
          position: "absolute", top: "50%", right: "8px", transform: "translateY(-50%)",
          zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          opacity: Math.min(Math.abs(dragX) / 100, 1), transition: "opacity 0.1s"
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: S.greenBg,
            border: `2px solid ${S.green}`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: S.green, fontWeight: 700
          }}>✓</div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: S.green, fontFamily: "'DM Sans', sans-serif" }}>Conectar</span>
        </div>
      )}

      {/* Stamp overlay on card */}
      {Math.abs(dragX) > 30 && (
        <div style={{
          position: "absolute", top: "80px", left: dragX > 0 ? "20px" : "auto", right: dragX < 0 ? "20px" : "auto",
          zIndex: 20, padding: "6px 16px", borderRadius: "8px",
          border: `3px solid ${dragX > 0 ? S.green : S.red}`,
          color: dragX > 0 ? S.green : S.red,
          fontSize: "18px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
          transform: `rotate(${dragX > 0 ? -15 : 15}deg)`,
          opacity: Math.min(Math.abs(dragX) / 100, 1),
          pointerEvents: "none"
        }}>
          {dragX > 0 ? "CONECTAR" : "PASAR"}
        </div>
      )}

      <div style={{ background: S.card, borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)", border: `1px solid ${Math.abs(dragX) > 30 ? (dragX > 0 ? S.green : S.red) : S.border}` }}>
        <div style={{ background: `linear-gradient(135deg, ${profile.color}30, ${profile.color}10)`, padding: "32px 20px 20px", position: "relative", borderBottom: `1px solid ${S.border}` }}>
          <CompatBadge score={compat}/>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Avatar profile={profile} size={80}/>
          </div>
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "22px", fontWeight: 700, color: S.text, margin: "0 0 4px" }}>{profile.name}</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              {showLocation ? (
                <span style={{ fontSize: "12px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>📍 {profile.city}, {profile.country}</span>
              ) : (
                <span style={{ fontSize: "12px", color: S.textTer, fontFamily: "'DM Sans', sans-serif" }}>📍 Ubicación oculta</span>
              )}
              <span style={{ fontSize: "12px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>💼 {profile.role}</span>
            </div>
            {profile.org && <p style={{ color: S.textTer, fontSize: "11px", margin: "2px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{profile.org}</p>}
            {profile.orgDescription && <p style={{ color: S.textTer, fontSize: "10px", margin: "2px 0 0", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>{profile.orgDescription}</p>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
              <Tag bg={`${profile.color}30`} color={profile.color}>{profile.workType === "Independiente" ? "Independiente" : profile.workType === "Organización" ? "Organización" : "Independiente + Org"}</Tag>
              <StreakChip streak={profile.streak || 0} size="small"/>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
              <XPChip xp={profile.xp || 0} size="small"/>
            </div>
            <ProfileBadges profile={profile}/>
          </div>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <p style={{ fontSize: "14px", color: S.text, fontStyle: "italic", textAlign: "center", margin: "0 0 16px", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>"{profile.pitch}"</p>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Domina</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.expertise.map(e => <Tag key={e} bg={S.blueBg} color={S.blue}>{e}</Tag>)}</div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Quiere aprender</p>
            <Tag bg={S.yellowBg} color={S.yellowText}>{profile.wantsToLearn}</Tag>
          </div>
          {expanded && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Ofrece</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.offers.map(o => <Tag key={o} bg={S.greenBg} color={S.green}>{o}</Tag>)}</div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Busca</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.seeks.map(s => <Tag key={s} bg={S.redBg} color={S.red}>{s}</Tag>)}</div>
              </div>
              <div>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Sectores</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.sectors.map(s => <Tag key={s}>{s}</Tag>)}</div>
              </div>
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} style={{ width: "100%", padding: "10px", marginTop: "10px", background: S.cardLight, border: "none", borderRadius: "12px", color: S.textSec, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            {expanded ? "Ver menos ▲" : "Ver más ▼"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "20px" }}>
        <span style={{ fontSize: "11px", color: S.red, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>← Pasar</span>
        <button onClick={onLeft} style={{ width: 64, height: 64, borderRadius: "50%", background: S.redBg, border: `3px solid ${S.red}50`, color: S.red, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "24px", fontWeight: 700, boxShadow: `0 4px 0 ${S.red}30` }}>✕</button>
        <button onClick={onRight} style={{ width: 64, height: 64, borderRadius: "50%", background: S.greenBg, border: `3px solid ${S.green}50`, color: S.green, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "24px", fontWeight: 700, boxShadow: `0 4px 0 ${S.green}30` }}>✓</button>
        <span style={{ fontSize: "11px", color: S.green, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>Conectar →</span>
      </div>
    </div>
  );
}
