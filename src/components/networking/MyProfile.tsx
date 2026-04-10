// @ts-nocheck
import { useState } from "react";
import { S } from "./styles";
import { Avatar, Tag, Btn, Toggle, ProfileBadges, LevelProgressBar } from "./ui";

export default function MyProfile({ profile, privacySettings, onPrivacyChange, matches, onEdit }) {
  const [photoHover, setPhotoHover] = useState(false);

  const sections = [
    { label: "Domina", items: profile.expertise, bg: S.blueBg, color: S.blue },
    { label: "Quiere aprender", items: [profile.wantsToLearn], bg: S.yellowBg, color: S.yellowText },
    { label: "Ofrece", items: profile.offers, bg: S.greenBg, color: S.green },
    { label: "Busca", items: profile.seeks, bg: S.redBg, color: S.red },
    { label: "Sectores", items: profile.sectors, bg: S.cardLight, color: S.textSec },
  ];

  const stats = [
    { icon: "🔥", value: profile.streak || 0, label: "Racha", color: S.orange },
    { icon: "⚡", value: profile.xp || 0, label: "XP", color: S.yellow },
    { icon: "🤝", value: matches?.length || profile.matchCount || 0, label: "Matches", color: S.purple },
    { icon: "💬", value: profile.conversationsStarted || 0, label: "Chats", color: S.blue },
  ];

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ background: `linear-gradient(135deg, ${profile.color}30, ${profile.color}10)`, borderRadius: "24px", padding: "28px 20px", textAlign: "center", marginBottom: "12px", border: `1px solid ${S.border}` }}>
        <div style={{ position: "relative", display: "inline-block" }}
          onMouseEnter={() => setPhotoHover(true)} onMouseLeave={() => setPhotoHover(false)}>
          <Avatar profile={profile} size={80}/>
          {photoHover && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>📷</span>
            </div>
          )}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: S.text, margin: "12px 0 4px", fontSize: "22px", fontWeight: 700 }}>{profile.name}</h2>
        <p style={{ color: S.textSec, fontSize: "14px", margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{profile.role} · {profile.city}, {profile.country}</p>
        {profile.org && <p style={{ color: S.textTer, fontSize: "12px", margin: "4px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{profile.org}</p>}
        {profile.orgDescription && <p style={{ color: S.textTer, fontSize: "11px", margin: "2px 0 0", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>{profile.orgDescription}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "20px" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ background: S.card, borderRadius: "14px", padding: "12px 8px", border: `1px solid ${S.border}` }}>
              <span style={{ fontSize: "20px" }}>{stat.icon}</span>
              <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700, color: stat.color, fontFamily: "'DM Sans', sans-serif" }}>{stat.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: S.textTer, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" }}>{stat.label}</p>
            </div>
          ))}
        </div>
        <LevelProgressBar profile={profile}/>
        <ProfileBadges profile={profile}/>
      </div>
      <div style={{ background: S.card, borderRadius: "18px", padding: "18px", border: `1px solid ${S.border}`, marginBottom: "12px" }}>
        <h3 style={{ fontSize: "15px", color: S.text, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", fontFamily: "'DM Sans', sans-serif" }}>🔒 Privacidad</h3>
        <Toggle label="Mostrar mi ubicación en el mapa" enabled={privacySettings.showLocation} onChange={(v) => onPrivacyChange({ ...privacySettings, showLocation: v })} />
        <Toggle label="Mostrar mi número de teléfono" enabled={privacySettings.showPhone} onChange={(v) => onPrivacyChange({ ...privacySettings, showPhone: v })} />
        <p style={{ fontSize: "11px", color: S.textTer, margin: "12px 0 0", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>Estos ajustes controlan qué información pueden ver otros participantes.</p>
      </div>
      <div style={{ background: S.card, borderRadius: "18px", padding: "18px", border: `1px solid ${S.border}` }}>
        <p style={{ fontStyle: "italic", color: S.text, fontSize: "14px", textAlign: "center", margin: "0 0 16px", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>"{profile.pitch}"</p>
        {sections.map(s => (
          <div key={s.label} style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 6px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{s.items.map(i => <Tag key={i} bg={s.bg} color={s.color}>{i}</Tag>)}</div>
          </div>
        ))}
        <Btn variant="outline" style={{ width: "100%", marginTop: "12px" }} onClick={onEdit}>✏️ Editar mi perfil</Btn>
      </div>
    </div>
  );
}
