// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { useCohorts, useIcebreakers } from "@/hooks/useCohorts";
import { useLeaderboard } from "@/hooks/useCohorts";
import { useXP } from "@/hooks/useXP";
import { useMatches, useConversation } from "@/hooks/useMatches";
import ProfileForm from "@/components/ProfileForm";
import Onboarding from "@/components/Onboarding";
import type { Profile } from "@/lib/database.types";

// ============ MAP CONFIG ============
const MAP_CENTER = [14.5, -87.5];
const MAP_ZOOM = 5;

// ============ XP SYSTEM ============
const XP_VALUES = {
  profileComplete: 50,
  conversationStarted: 30,
  matchMade: 15,
  swipe: 2,
};

// Nivel basado en XP
const getLevel = (xp) => {
  if (xp >= 300) return 5;
  if (xp >= 200) return 4;
  if (xp >= 120) return 3;
  if (xp >= 50) return 2;
  return 1;
};

const getLevelThresholds = (level) => {
  const thresholds = {
    1: { min: 0, max: 49 },
    2: { min: 50, max: 119 },
    3: { min: 120, max: 199 },
    4: { min: 200, max: 299 },
    5: { min: 300, max: 999 },
  };
  return thresholds[level];
};

const LEAGUE_ICONS = {
  diamond: "💎",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  none: "⚪",
};

const LEAGUE_COLORS = {
  diamond: "#1CB0F6",
  gold: "#FFC800",
  silver: "#AFAFAF",
  bronze: "#CD7F32",
  none: "#E5E7EB",
};

// Helper function to convert DB profile to legacy format
const convertProfileToLegacy = (dbProfile: Profile) => {
  if (!dbProfile) return null;
  return {
    id: dbProfile.id,
    name: dbProfile.name || "",
    country: dbProfile.country || "",
    city: dbProfile.city || "",
    lat: dbProfile.lat || 14.5,
    lng: dbProfile.lng || -87.5,
    role: dbProfile.role || "",
    workType: dbProfile.work_type || "Independiente",
    org: dbProfile.organization || null,
    pitch: dbProfile.pitch || "",
    expertise: dbProfile.expertise || [],
    wantsToLearn: dbProfile.wants_to_learn || "",
    sectors: dbProfile.sectors || [],
    offers: dbProfile.offers || [],
    seeks: dbProfile.seeks || [],
    whatsapp: dbProfile.whatsapp || "",
    linkedin: dbProfile.linkedin || "",
    avatar: dbProfile.avatar_initials || dbProfile.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "??",
    color: dbProfile.avatar_color || "#1CB0F6",
    photo: dbProfile.photo_url || null,
    lastActive: dbProfile.last_active || null,
    hasLoggedIn: dbProfile.has_logged_in || false,
    swipeCount: dbProfile.swipe_count || 0,
    showLocation: dbProfile.show_location ?? true,
    showPhone: dbProfile.show_phone ?? true,
    streak: dbProfile.streak || 0,
    league: dbProfile.league || "none",
    conversationsStarted: dbProfile.conversations_started || 0,
    matchCount: dbProfile.match_count || 0,
    xp: dbProfile.xp || 0,
  };
};

// Default icebreakers (fallback if DB is empty)
const DEFAULT_ICEBREAKERS = [
  "Ambos trabajan con PyMEs. Cual ha sido el mayor reto con un cliente este anio?",
  "Tienen expertises complementarias. Que proyecto sonado harian juntos?",
  "Cual es la herramienta que mas les ha cambiado la forma de trabajar?",
  "Si pudieran resolver UN problema del ecosistema emprendedor en LATAM, cual seria?",
  "Cual ha sido su experiencia mas memorable como catalizador?",
  "Que consejo le darian a alguien que empieza en consultoria?",
  "Si combinaran sus habilidades en un solo servicio, como se llamaria?",
];

const calcCompat = (a, b) => {
  let s = 0;
  s += a.offers.filter(o => b.seeks.includes(o)).length * 10;
  s += a.seeks.filter(x => b.offers.includes(x)).length * 10;
  s += a.expertise.filter(e => !b.expertise.includes(e)).length * 10;
  s += a.sectors.filter(x => b.sectors.includes(x)).length * 7;
  if (b.expertise.includes(a.wantsToLearn)) s += 15;
  if (a.expertise.includes(b.wantsToLearn)) s += 10;
  return Math.min(Math.round(s), 100);
};

// ============ STYLES ============
const S = {
  bg: "#FAFBFC", card: "#FFFFFF", cardLight: "#F3F4F6", border: "#E5E7EB", borderLight: "#F3F4F6",
  text: "#111827", textSec: "#6B7280", textTer: "#9CA3AF",
  // Professional colors
  green: "#059669", greenBg: "#ECFDF5", greenLight: "#34D399",
  blue: "#2851A3", blueBg: "#EEF2FF", blueLight: "#4F6EC5",
  red: "#E11D48", redBg: "#FFF1F2", redLight: "#FB7185",
  yellow: "#FFC800", yellowBg: "#FFF4CC", yellowText: "#8B6914",
  purple: "#7C3AED", purpleBg: "#F5F3FF", purpleLight: "#A78BFA",
  orange: "#D97706", orangeBg: "#FFFBEB", orangeLight: "#FBBF24",
  gray: "#6B7280",
};

// ============ COMPONENTS ============
const Tag = ({ children, bg = S.cardLight, color = S.textSec }) => (
  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: bg, color, marginRight: "4px", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>{children}</span>
);

const XPChip = ({ xp, size = "normal" }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: size === "small" ? "2px 8px" : "4px 12px",
    borderRadius: "12px",
    background: S.yellowBg,
    border: `1px solid ${S.yellow}30`
  }}>
    <span style={{ fontSize: size === "small" ? "12px" : "14px" }}>⚡</span>
    <span style={{ color: S.yellow, fontSize: size === "small" ? "11px" : "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{xp} XP</span>
  </div>
);

const StreakChip = ({ streak, size = "normal" }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: size === "small" ? "2px 8px" : "4px 12px",
    borderRadius: "12px",
    background: S.orangeBg,
    border: `1px solid ${S.orange}30`
  }}>
    <span style={{ fontSize: size === "small" ? "12px" : "14px" }}>🔥</span>
    <span style={{ color: S.orange, fontSize: size === "small" ? "11px" : "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{streak}</span>
  </div>
);

const Avatar = ({ profile, size = 48 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: profile.photo ? `url(${profile.photo}) center/cover` : `linear-gradient(135deg, ${profile.color}, ${profile.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color: "#fff", flexShrink: 0, border: `2px solid ${S.border}`, fontFamily: "'DM Sans', sans-serif" }}>
    {!profile.photo && profile.avatar}
  </div>
);

const CompatBadge = ({ score }) => {
  const c = score >= 75 ? S.green : score >= 50 ? S.yellow : S.red;
  return (
    <div style={{ position: "absolute", top: 12, right: 12, background: S.card, borderRadius: "10px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", border: `1px solid ${S.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }}/>
      <span style={{ color: c, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{score}%</span>
    </div>
  );
};

const Btn = ({ children, onClick, variant = "default", style: s = {} }) => {
  const base = { padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif", ...s };
  const styles = {
    default: { ...base, background: S.cardLight, color: S.textSec },
    primary: { ...base, background: S.blue, color: "#fff" },
    outline: { ...base, background: "transparent", border: `1.5px solid ${S.border}`, color: S.textSec },
    green: { ...base, background: S.green, color: "#fff" },
  };
  return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};

const Toggle = ({ enabled, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${S.borderLight}` }}>
    <span style={{ fontSize: "13px", color: S.text, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: enabled ? S.green : S.border,
        position: "relative", transition: "background 0.2s"
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: enabled ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }}/>
    </button>
  </div>
);

// Badges Component
const ProfileBadges = ({ profile }) => {
  const badges = [];

  // 🔗 Conector - 3+ conversaciones
  if ((profile.conversationsStarted || 0) >= 3) {
    badges.push({ icon: "🔗", label: "Conector", bg: S.blueBg, color: S.blue });
  }

  // ⭐ Popular - 4+ matches
  if ((profile.matchCount || 0) >= 4) {
    badges.push({ icon: "⭐", label: "Popular", bg: S.yellowBg, color: S.yellowText });
  }

  // ✅ Completo - perfil completo
  if (profile.pitch && profile.expertise?.length && profile.wantsToLearn && profile.sectors?.length) {
    badges.push({ icon: "✅", label: "Completo", bg: S.greenBg, color: S.green });
  }

  // 🔥 Streak 7+
  if ((profile.streak || 0) >= 7) {
    badges.push({ icon: "🔥", label: `${profile.streak} días`, bg: S.orangeBg, color: S.orange });
  }

  // ⚡ Power - XP 200+
  if ((profile.xp || 0) >= 200) {
    badges.push({ icon: "⚡", label: "Power", bg: S.purpleBg, color: S.purple });
  }

  if (!badges.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
      {badges.map((b, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: "3px",
          padding: "3px 8px", borderRadius: "6px",
          background: b.bg, fontSize: "10px", fontWeight: 700,
          color: b.color, fontFamily: "'DM Sans', sans-serif"
        }}>
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );
};

// Level Progress Bar
const LevelProgressBar = ({ profile }) => {
  const level = getLevel(profile.xp || 0);
  const thresholds = getLevelThresholds(level);
  const progress = level === 5 ? 100 : ((profile.xp - thresholds.min) / (thresholds.max - thresholds.min + 1)) * 100;
  const xpToNext = level === 5 ? 0 : thresholds.max - profile.xp + 1;

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: S.textSec, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
          Nivel {level} · Liga {LEAGUE_ICONS[profile.league || 'none']} {profile.league?.charAt(0).toUpperCase() + profile.league?.slice(1) || 'Ninguna'}
        </span>
        {level < 5 && (
          <span style={{ fontSize: "11px", color: S.blue, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
            {xpToNext} XP para subir
          </span>
        )}
      </div>
      <div style={{ height: "10px", background: S.border, borderRadius: "5px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${S.green}, ${S.greenLight})`,
          borderRadius: "5px",
          transition: "width 0.5s ease"
        }}/>
      </div>
    </div>
  );
};

// ============ MAP (Leaflet + OpenStreetMap) ============
// Custom marker icon creator for Leaflet
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

function MapView({ profiles, privacySettings, currentUserId }) {
  // Filter profiles that have location visible
  const visibleProfiles = profiles.filter(p => {
    if (p.id === currentUserId) return privacySettings.showLocation;
    return p.showLocation !== false;
  });

  const countries = {};
  profiles.forEach(p => {
    if (!countries[p.country]) countries[p.country] = [];
    countries[p.country].push(p);
  });

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
      <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "16px", fontFamily: "'DM Sans', sans-serif" }}>{visibleProfiles.length} de {profiles.length} participantes visibles · {Object.keys(countries).length} países</p>

      <div style={{ background: S.card, borderRadius: "20px", overflow: "hidden", border: `1px solid ${S.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ width: "100%", height: "350px" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleProfiles.map(p => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createCustomIcon(p.color)}
            >
              <Popup>
                <div style={{ padding: "4px", minWidth: "160px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Avatar profile={p} size={32}/>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: "#111", fontFamily: "'DM Sans', sans-serif" }}>{p.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#666", fontFamily: "'DM Sans', sans-serif" }}>{p.role}</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>📍 {p.city}, {p.country}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {Object.entries(countries).sort((a, b) => b[1].length - a[1].length).map(([country, members]) => (
          <div key={country} style={{ background: S.card, borderRadius: "10px", padding: "6px 12px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: S.text, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{country}</span>
            <span style={{ fontSize: "10px", color: S.textSec, background: S.cardLight, padding: "1px 7px", borderRadius: "6px", fontWeight: 700 }}>{members.length}</span>
          </div>
        ))}
      </div>

      {!privacySettings.showLocation && (
        <div style={{ marginTop: "12px", background: S.orangeBg, borderRadius: "10px", padding: "10px 14px", border: `1px solid ${S.orange}30` }}>
          <p style={{ margin: 0, fontSize: "12px", color: S.orange, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            🔒 Tu ubicación está oculta. Otros participantes no pueden verte en el mapa.
          </p>
        </div>
      )}
    </div>
  );
}

// ============ PROFILE CARD ============
function ProfileCard({ profile, currentUser, onLeft, onRight, getCompatibility }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [compat, setCompat] = useState(() => calcCompat(currentUser, profile));
  const startX = useRef(0);

  // Load compatibility from database if function provided
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

      <div style={{ background: S.card, borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)", border: `1px solid ${S.border}` }}>
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
      <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "20px" }}>
        <button onClick={onLeft} style={{ width: 64, height: 64, borderRadius: "50%", background: S.redBg, border: `3px solid ${S.red}50`, color: S.red, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "24px", fontWeight: 700, boxShadow: `0 4px 0 ${S.red}30` }}>✕</button>
        <button onClick={onRight} style={{ width: 64, height: 64, borderRadius: "50%", background: S.greenBg, border: `3px solid ${S.green}50`, color: S.green, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "24px", fontWeight: 700, boxShadow: `0 4px 0 ${S.green}30` }}>✓</button>
      </div>
    </div>
  );
}

// ============ MATCH ANIMATION ============
function MatchAnim({ profile, icebreaker, onClose }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", opacity: show ? 1 : 0, transition: "opacity 0.4s" }}>
      <div style={{ textAlign: "center", transform: show ? "scale(1)" : "scale(0.7)", transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)", maxWidth: "340px", padding: "0 20px" }}>
        <div style={{ fontSize: "64px", marginBottom: "12px" }}>🎯</div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", fontWeight: 700, color: S.text, marginBottom: "8px" }}>¡Es un Match!</h2>
        <div style={{ marginBottom: "8px" }}>
          <XPChip xp={15}/>
        </div>
        <p style={{ color: S.textSec, fontSize: "14px", marginBottom: "20px", fontFamily: "'DM Sans', sans-serif" }}>Tú y <strong style={{ color: S.text }}>{profile.name}</strong> quieren conectar</p>
        <div style={{ background: S.blueBg, border: `2px solid ${S.blue}30`, borderRadius: "16px", padding: "14px", marginBottom: "20px", textAlign: "left" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", color: S.blue, letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>💬 Pregunta rompehielo</p>
          <p style={{ color: S.text, fontSize: "13px", margin: 0, lineHeight: 1.5, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>"{icebreaker}"</p>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Btn onClick={onClose} variant="outline">Seguir explorando</Btn>
          <Btn onClick={onClose} variant="primary">Enviar mensaje</Btn>
        </div>
      </div>
    </div>
  );
}

// ============ CHAT ============
function ChatView({ profile, icebreaker, onBack, conversationId, currentUserId }) {
  const [input, setInput] = useState("");
  const { messages: dbMessages, loading, sendMessage } = useConversation(conversationId, currentUserId);

  // Convert DB messages to display format and add icebreaker as first message
  const displayMessages = [
    { from: "system", text: icebreaker, id: "icebreaker" },
    ...dbMessages.map(m => ({
      from: m.sender_id === currentUserId ? "me" : "them",
      text: m.content,
      id: m.id,
    }))
  ];

  const send = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  };

  const showPhone = profile?.showPhone !== false;
  const showLocation = profile?.showLocation !== false;

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <p style={{ color: S.textSec }}>Perfil no encontrado</p>
        <Btn onClick={onBack} variant="outline" style={{ marginTop: "16px" }}>Volver</Btn>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: `1px solid ${S.border}`, marginBottom: "12px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: S.textSec, cursor: "pointer", fontSize: "20px", padding: "4px", fontWeight: 700 }}>←</button>
        <Avatar profile={profile} size={44}/>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: S.text, fontSize: "15px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{profile.name}</p>
          <p style={{ margin: 0, color: S.textTer, fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>
            {profile.role} {showLocation && `· ${profile.city}`}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {profile.linkedin && (
            <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "10px", background: S.blueBg, border: `1px solid ${S.blue}30`, color: S.blue, fontSize: "11px", fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
              💼 LinkedIn
            </a>
          )}
          {showPhone ? (
            <a href={`https://wa.me/${profile.whatsapp?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "10px", background: S.greenBg, border: `1px solid ${S.green}30`, color: S.green, fontSize: "11px", fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
              📱 WhatsApp
            </a>
          ) : (
            <span style={{ padding: "6px 12px", borderRadius: "10px", background: S.cardLight, color: S.textTer, fontSize: "11px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              🔒 Oculto
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "12px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "20px", color: S.textTer }}>
            Cargando mensajes...
          </div>
        )}
        {displayMessages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.from === "me" ? "flex-end" : m.from === "system" ? "center" : "flex-start", maxWidth: m.from === "system" ? "90%" : "80%" }}>
            {m.from === "system" ? (
              <div style={{ background: S.blueBg, border: `2px solid ${S.blue}20`, borderRadius: "16px", padding: "12px 14px", textAlign: "center" }}>
                <p style={{ fontSize: "9px", textTransform: "uppercase", color: S.blue, letterSpacing: "0.08em", margin: "0 0 4px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Pregunta rompehielo</p>
                <p style={{ color: S.text, fontSize: "13px", margin: 0, fontStyle: "italic", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>{m.text}</p>
              </div>
            ) : (
              <div style={{ background: m.from === "me" ? S.green : S.cardLight, borderRadius: "18px", padding: "10px 16px" }}>
                <p style={{ color: m.from === "me" ? "#fff" : S.text, fontSize: "14px", margin: 0, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>{m.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: `1px solid ${S.border}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: "14px 16px", borderRadius: "14px", border: `1px solid ${S.border}`, background: S.cardLight, color: S.text, fontSize: "14px", outline: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}/>
        <Btn onClick={send} variant="primary" style={{ padding: "14px 20px" }}>Enviar</Btn>
      </div>
    </div>
  );
}

// ============ MATCHES LIST ============
function MatchesList({ matches, allProfiles, onOpenChat }) {
  if (!matches.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎯</div>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>Aún no tienes matches</h3>
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
        return (
          <div key={m.id} onClick={() => onOpenChat(m)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", marginBottom: "8px", background: S.card, borderRadius: "16px", border: `1px solid ${S.border}`, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = S.green; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.transform = "translateY(0)"; }}>
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
            <span style={{ color: S.green, fontSize: "16px" }}>💬</span>
          </div>
        );
      })}
    </div>
  );
}

// ============ LEADERBOARD ============
function Leaderboard({ profiles, matches = [], currentUserId, onContact, cohortId }) {
  // Use the leaderboard hook for ranking from Supabase
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard(cohortId);

  // Convert leaderboard entries to profile-like objects for display
  const leaderboardProfiles = leaderboard.map(entry => ({
    id: entry.user_id,
    name: entry.name,
    avatar: entry.avatar_initials || entry.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "??",
    color: entry.avatar_color || "#1CB0F6",
    photo: entry.photo_url,
    xp: entry.xp,
    league: entry.league,
    rank: entry.rank,
    hasLoggedIn: true,
  }));

  // Use leaderboard data if available, otherwise fall back to profiles
  const sorted = leaderboardProfiles.length > 0
    ? leaderboardProfiles
    : [...profiles].filter(p => p.hasLoggedIn).sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const Pedestal = ({ profile, position }) => {
    const heights = { 1: 140, 2: 110, 3: 90 };
    const colors = { 1: S.yellow, 2: "#C0C0C0", 3: "#CD7F32" };
    const order = { 1: 2, 2: 1, 3: 3 };

    if (!profile) return null;

    return (
      <div style={{ order: order[position], display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Avatar profile={profile} size={position === 1 ? 64 : 52}/>
          <div style={{
            position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
            background: colors[position], width: 24, height: 24, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 700, color: position === 1 ? "#000" : "#fff",
            border: `3px solid ${S.card}`, fontFamily: "'DM Sans', sans-serif"
          }}>
            {position}
          </div>
        </div>
        <p style={{ fontSize: "12px", fontWeight: 700, color: S.text, margin: "8px 0 2px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{profile.name.split(" ")[0]}</p>
        <XPChip xp={profile.xp || 0} size="small"/>
        {profile.id !== currentUserId && onContact && (
          <button onClick={() => onContact(profile)} style={{ marginTop: "4px", padding: "3px 10px", borderRadius: "8px", background: S.blueBg, border: `1px solid ${S.blue}30`, color: S.blue, fontSize: "10px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            💬 Mensaje
          </button>
        )}
        <div style={{
          width: "100%",
          height: heights[position],
          background: `linear-gradient(180deg, ${colors[position]}40, ${colors[position]}20)`,
          borderRadius: "12px 12px 0 0",
          marginTop: "12px",
          border: `2px solid ${colors[position]}50`,
          borderBottom: "none"
        }}/>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "20px" }}>🏆 Top Conectores</h3>

      {/* Podio */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "24px", padding: "0 10px" }}>
        <Pedestal profile={top3[1]} position={2}/>
        <Pedestal profile={top3[0]} position={1}/>
        <Pedestal profile={top3[2]} position={3}/>
      </div>

      {/* Ranking completo */}
      <div style={{ background: S.card, borderRadius: "16px", border: `1px solid ${S.border}`, overflow: "hidden" }}>
        {sorted.map((p, i) => {
          const level = getLevel(p.xp || 0);
          const thresholds = getLevelThresholds(level);
          const progress = level === 5 ? 100 : ((p.xp - thresholds.min) / (thresholds.max - thresholds.min + 1)) * 100;

          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 14px",
              borderBottom: i < sorted.length - 1 ? `1px solid ${S.border}` : "none",
              background: i < 3 ? `${S.yellow}08` : "transparent"
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "8px",
                background: i < 3 ? S.yellow : S.cardLight,
                color: i < 3 ? "#000" : S.textSec,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif"
              }}>
                {i + 1}
              </span>
              <Avatar profile={p} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</span>
                  <span style={{ fontSize: "12px" }}>{LEAGUE_ICONS[p.league || 'none']}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: S.textTer, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Nv.{level}</span>
                  <div style={{ flex: 1, height: 6, background: S.border, borderRadius: "3px", maxWidth: "80px" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: S.green, borderRadius: "3px" }}/>
                  </div>
                  <span style={{ fontSize: "10px", color: S.textTer, fontFamily: "'DM Sans', sans-serif" }}>💬 {p.conversationsStarted || 0}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {(p.streak || 0) > 0 && <StreakChip streak={p.streak} size="small"/>}
                <XPChip xp={p.xp || 0} size="small"/>
              </div>
              {p.id !== currentUserId && onContact && (
                <button onClick={(e) => { e.stopPropagation(); onContact(p); }} title={`Mensaje a ${p.name.split(" ")[0]}`}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: matches.some(m => m.id === p.id) ? S.greenBg : S.blueBg, border: `1.5px solid ${matches.some(m => m.id === p.id) ? S.green : S.blue}30`, color: matches.some(m => m.id === p.id) ? S.green : S.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}>
                  💬
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Guía de XP */}
      <div style={{ marginTop: "20px", background: S.card, borderRadius: "16px", border: `1px solid ${S.border}`, padding: "16px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: S.text, margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
          ¿Cómo gano XP? ⚡
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: S.greenBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.green}30` }}>
            <span style={{ fontSize: "20px" }}>✅</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.green, fontFamily: "'DM Sans', sans-serif" }}>Perfil completo</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.green, fontFamily: "'DM Sans', sans-serif" }}>+50</p>
          </div>
          <div style={{ background: S.blueBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.blue}30` }}>
            <span style={{ fontSize: "20px" }}>💬</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.blue, fontFamily: "'DM Sans', sans-serif" }}>Conversación</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.blue, fontFamily: "'DM Sans', sans-serif" }}>+30</p>
          </div>
          <div style={{ background: S.purpleBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.purple}30` }}>
            <span style={{ fontSize: "20px" }}>🤝</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.purple, fontFamily: "'DM Sans', sans-serif" }}>Match</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.purple, fontFamily: "'DM Sans', sans-serif" }}>+15</p>
          </div>
          <div style={{ background: S.orangeBg, borderRadius: "12px", padding: "12px", textAlign: "center", border: `1px solid ${S.orange}30` }}>
            <span style={{ fontSize: "20px" }}>👆</span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 700, color: S.orange, fontFamily: "'DM Sans', sans-serif" }}>Swipe</p>
            <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: S.orange, fontFamily: "'DM Sans', sans-serif" }}>+2</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MY PROFILE ============
function MyProfile({ profile, privacySettings, onPrivacyChange, matches, onEdit }) {
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

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "20px" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ background: S.card, borderRadius: "14px", padding: "12px 8px", border: `1px solid ${S.border}` }}>
              <span style={{ fontSize: "20px" }}>{stat.icon}</span>
              <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700, color: stat.color, fontFamily: "'DM Sans', sans-serif" }}>{stat.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: S.textTer, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Level Progress */}
        <LevelProgressBar profile={profile}/>

        {/* Badges */}
        <ProfileBadges profile={profile}/>
      </div>

      {/* Privacy Settings */}
      <div style={{ background: S.card, borderRadius: "18px", padding: "18px", border: `1px solid ${S.border}`, marginBottom: "12px" }}>
        <h3 style={{ fontSize: "15px", color: S.text, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", fontFamily: "'DM Sans', sans-serif" }}>
          🔒 Privacidad
        </h3>
        <Toggle
          label="Mostrar mi ubicación en el mapa"
          enabled={privacySettings.showLocation}
          onChange={(v) => onPrivacyChange({ ...privacySettings, showLocation: v })}
        />
        <Toggle
          label="Mostrar mi número de teléfono"
          enabled={privacySettings.showPhone}
          onChange={(v) => onPrivacyChange({ ...privacySettings, showPhone: v })}
        />
        <p style={{ fontSize: "11px", color: S.textTer, margin: "12px 0 0", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
          Estos ajustes controlan qué información pueden ver otros participantes.
        </p>
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

// ============ ADMIN ============
function AdminPanel({ allProfiles, matches, onManualMatch, cohortName, currentUserId }) {
  const [tab, setTab] = useState("alerts");
  const noLogin = allProfiles.filter(p => !p.hasLoggedIn);
  const noSwipe = allProfiles.filter(p => p.hasLoggedIn && p.swipeCount === 0);
  const matchedIds = new Set(matches.map(m => m.id));
  if (currentUserId) matchedIds.add(currentUserId);
  const noMatch = allProfiles.filter(p => !matchedIds.has(p.id));
  const noConvo = matches.filter(m => !m.hasConversation);
  const total = noLogin.length + noSwipe.length + noMatch.length + noConvo.length;

  const expertCount = {}; allProfiles.forEach(p => p.expertise.forEach(e => { expertCount[e] = (expertCount[e] || 0) + 1; }));
  const seekCount = {}; allProfiles.forEach(p => p.seeks.forEach(s => { seekCount[s] = (seekCount[s] || 0) + 1; }));

  const AlertCard = ({ icon, title, items, color, bgColor, onAction }) => {
    if (!items.length) return null;
    return (
      <div style={{ background: bgColor, borderRadius: "14px", padding: "14px", marginBottom: "10px", border: `2px solid ${color}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span>{icon}</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
          <span style={{ fontSize: "10px", color: S.textSec, background: S.cardLight, padding: "2px 8px", borderRadius: "6px", fontWeight: 700, marginLeft: "auto", fontFamily: "'DM Sans', sans-serif" }}>{items.length}</span>
        </div>
        {items.map((p, i) => (
          <div key={typeof p === "object" ? p.id : i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
            <Avatar profile={typeof p === "object" ? p : allProfiles.find(x => x.id === p.id)} size={32}/>
            <span style={{ fontSize: "13px", color: S.text, flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{typeof p === "object" ? p.name : allProfiles.find(x => x.id === p.id)?.name}</span>
            {onAction && <button onClick={() => onAction(typeof p === "object" ? p : allProfiles.find(x => x.id === p.id))} style={{ padding: "5px 12px", borderRadius: "8px", background: S.blueBg, border: `2px solid ${S.blue}30`, color: S.blue, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🎯 Conectar</button>}
          </div>
        ))}
      </div>
    );
  };

  const Bar = ({ entries, max, color }) => entries.sort((a, b) => b[1] - a[1]).map(([name, count]) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ fontSize: "11px", color: S.textSec, minWidth: "120px", textAlign: "right", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{name}</span>
      <div style={{ flex: 1, height: 8, background: S.border, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: color, borderRadius: "4px" }}/>
      </div>
      <span style={{ fontSize: "11px", color: S.textTer, minWidth: "20px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{count}</span>
    </div>
  ));

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "6px" }}>Panel Admin</h3>
      {cohortName && <p style={{ fontSize: "11px", color: S.blue, fontWeight: 600, marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>📋 Cohorte activa: {cohortName} · {allProfiles.length} participantes</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          { v: allProfiles.length, l: "Perfiles", c: S.blue },
          { v: matches.length, l: "Matches", c: S.green },
          { v: allProfiles.filter(p => p.hasLoggedIn).length, l: "Activos", c: S.purple },
          { v: total, l: "Alertas", c: S.yellow },
        ].map(s => (
          <div key={s.l} style={{ background: S.card, borderRadius: "14px", padding: "14px 8px", border: `1px solid ${S.border}`, textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: s.c, fontFamily: "'DM Sans', sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: "10px", color: S.textTer, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto" }}>
        {[
          { id: "alerts", label: "Alertas", badge: total },
          { id: "stats", label: "Estadísticas" },
          { id: "people", label: "Participantes" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", background: tab === t.id ? S.blueBg : "transparent", color: tab === t.id ? S.blue : S.textSec, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>
            {t.label}
            {t.badge !== undefined && <span style={{ background: tab === t.id ? "rgba(255,255,255,0.3)" : S.border, color: tab === t.id ? "#fff" : S.textTer, fontSize: "10px", padding: "2px 7px", borderRadius: "6px", fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div>
          <AlertCard icon="🚪" title="No han ingresado" items={noLogin} color={S.red} bgColor={S.redBg}/>
          <AlertCard icon="👆" title="Sin swipes" items={noSwipe} color={S.yellow} bgColor={S.yellowBg}/>
          <AlertCard icon="💔" title="Sin matches" items={noMatch} color={S.purple} bgColor={S.purpleBg} onAction={onManualMatch}/>
          <AlertCard icon="💬" title="Matches sin conversación" items={noConvo.map(m => allProfiles.find(p => p.id === m.id)).filter(Boolean)} color={S.blue} bgColor={S.blueBg}/>
          {total === 0 && <p style={{ textAlign: "center", color: S.textSec, padding: "40px 0", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Sin alertas</p>}
        </div>
      )}
      {tab === "stats" && (
        <div>
          <div style={{ background: S.card, borderRadius: "16px", padding: "18px", border: `1px solid ${S.border}`, marginBottom: "12px" }}>
            <h4 style={{ color: S.textSec, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Temáticas dominadas</h4>
            <Bar entries={Object.entries(expertCount)} max={allProfiles.length} color={S.blue}/>
          </div>
          <div style={{ background: S.card, borderRadius: "16px", padding: "18px", border: `1px solid ${S.border}` }}>
            <h4 style={{ color: S.textSec, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Lo que más buscan</h4>
            <Bar entries={Object.entries(seekCount)} max={allProfiles.length} color={S.red}/>
          </div>
        </div>
      )}
      {tab === "people" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: S.textSec, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{allProfiles.length} participantes</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant="primary" style={{ padding: "8px 14px", fontSize: "12px" }}>+ Agregar</Btn>
              <Btn variant="outline" style={{ padding: "8px 14px", fontSize: "12px" }}>📤 CSV</Btn>
            </div>
          </div>
          {allProfiles.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.hasLoggedIn ? S.green : S.border, flexShrink: 0 }}/>
              <Avatar profile={p} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: S.text, fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</p>
                <p style={{ margin: 0, color: S.textTer, fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>{p.role} · {p.swipeCount} swipes · {p.xp || 0} XP</p>
              </div>
              <button style={{ padding: "6px 12px", borderRadius: "8px", background: S.blueBg, border: `2px solid ${S.blue}30`, color: S.blue, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🎯 Conectar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN ============
export default function Networking() {
  const navigate = useNavigate();

  // Auth and data hooks
  const { user, profile: authProfile, loading: authLoading, signOut, updateProfile } = useAuth();
  const currentUserId = user?.id;

  // Cohorts hook
  const { cohorts, userCohorts, loading: cohortsLoading } = useCohorts(currentUserId);

  // Icebreakers hook
  const { icebreakers, getRandomIcebreaker } = useIcebreakers();
  const ICEBREAKERS = icebreakers.length > 0 ? icebreakers : DEFAULT_ICEBREAKERS;

  // State
  const [tab, setTab] = useState("swipe");
  const [localMatches, setLocalMatches] = useState([]);
  const [showMatch, setShowMatch] = useState(null);
  const [swiped, setSwiped] = useState(new Set());
  const [chatMatch, setChatMatch] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    showLocation: true,
    showPhone: true,
  });
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [showCohortPicker, setShowCohortPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [allLoadedProfiles, setAllLoadedProfiles] = useState([]);

  // Profiles hook - depends on selectedCohortId
  const { profiles: dbProfiles, loading: profilesLoading, recordSwipe, getCompatibility } = useProfiles({
    currentUserId,
    cohortId: selectedCohortId || undefined,
    excludeSwiped: true,
  });

  // Matches hook
  const { matches: dbMatches, loading: matchesLoading, startConversation } = useMatches(currentUserId);

  // XP system
  const { awardXP } = useXP(currentUserId);

  // Convert profile from DB format to legacy format
  const me = authProfile ? convertProfileToLegacy(authProfile) : null;

  // Convert all profiles to legacy format
  const cohortProfiles = dbProfiles.map(convertProfileToLegacy).filter(Boolean);

  // Store all profiles for lookups
  useEffect(() => {
    if (cohortProfiles.length > 0) {
      setAllLoadedProfiles(prev => {
        const existing = new Map(prev.map(p => [p.id, p]));
        cohortProfiles.forEach(p => existing.set(p.id, p));
        return Array.from(existing.values());
      });
    }
  }, [cohortProfiles]);

  // Also add matched profiles
  useEffect(() => {
    if (dbMatches.length > 0) {
      const matchedProfiles = dbMatches
        .filter(m => m.matchedProfile)
        .map(m => convertProfileToLegacy(m.matchedProfile));

      setAllLoadedProfiles(prev => {
        const existing = new Map(prev.map(p => [p.id, p]));
        matchedProfiles.forEach(p => {
          if (p) existing.set(p.id, p);
        });
        return Array.from(existing.values());
      });
    }
  }, [dbMatches]);

  // Convert matches from DB format
  useEffect(() => {
    if (dbMatches.length > 0) {
      const converted = dbMatches.map(m => ({
        id: m.user_id === currentUserId ? m.matched_user_id : m.user_id,
        type: m.match_type || "organic",
        icebreaker: m.icebreaker || ICEBREAKERS[0],
        hasConversation: m.has_conversation || !!m.conversation,
        matchId: m.id,
        conversationId: m.conversation?.id || null,
      }));
      setLocalMatches(converted);
    }
  }, [dbMatches, currentUserId, ICEBREAKERS]);

  // Sync privacy settings with profile
  useEffect(() => {
    if (authProfile) {
      setPrivacySettings({
        showLocation: authProfile.show_location ?? true,
        showPhone: authProfile.show_phone ?? true,
      });
    }
  }, [authProfile]);

  // Check if user needs onboarding
  useEffect(() => {
    if (authProfile && !authProfile.has_logged_in) {
      setShowOnboarding(true);
    }
  }, [authProfile]);

  // Set default cohort when cohorts load
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      // Try to use user's first cohort, or first available cohort
      const firstUserCohort = userCohorts[0];
      const firstCohort = cohorts[0];
      setSelectedCohortId(firstUserCohort || firstCohort?.id || null);
    }
  }, [cohorts, userCohorts, selectedCohortId]);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

  // Sort profiles by compatibility
  const sorted = cohortProfiles
    .filter(p => p.id !== currentUserId && !swiped.has(p.id))
    .sort((a, b) => (me ? calcCompat(me, b) - calcCompat(me, a) : 0));
  const current = sorted[0];

  useEffect(() => { setSwiped(new Set()); }, [selectedCohortId]);

  const swipe = async (dir) => {
    if (!current || !currentUserId) return;

    setSwiped(p => new Set([...p, current.id]));

    // Record swipe in database
    const result = await recordSwipe(current.id, dir);

    // Award XP for swipe
    awardXP('swipe');

    if (result.isMatch) {
      // Award XP for match
      awardXP('match');

      const ice = await getRandomIcebreaker();
      setLocalMatches(p => [...p, {
        id: current.id,
        type: "organic",
        icebreaker: ice,
        hasConversation: false,
        matchId: result.matchId
      }]);
      setShowMatch({ profile: current, icebreaker: ice });
    }
  };

  const openChat = async (m) => {
    let conversationId = m.conversationId;
    const isNewConversation = !m.hasConversation && !conversationId;

    // Start conversation if we have a matchId but no conversationId
    if (m.matchId && !conversationId) {
      const conversation = await startConversation(m.matchId);
      conversationId = conversation?.id;

      // Award XP for starting a new conversation
      if (isNewConversation && conversationId) {
        awardXP('conversation_started');
      }
    }

    setChatMatch({ ...m, conversationId });
    setTab("chat");
    setLocalMatches(p => p.map(x => x.id === m.id ? { ...x, hasConversation: true, conversationId } : x));
  };

  const manualMatch = async (profile) => {
    const ice = await getRandomIcebreaker();
    if (!localMatches.find(m => m.id === profile.id)) {
      setLocalMatches(p => [...p, { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false }]);
    }
  };

  const contactFromLeaderboard = async (profile) => {
    const existing = localMatches.find(m => m.id === profile.id);
    if (existing) {
      openChat(existing);
    } else {
      const ice = await getRandomIcebreaker();
      const newMatch = { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false };
      setLocalMatches(p => [...p, newMatch]);
      openChat(newMatch);
    }
  };

  const handlePrivacyChange = async (newSettings) => {
    setPrivacySettings(newSettings);
    await updateProfile({
      show_location: newSettings.showLocation,
      show_phone: newSettings.showPhone,
    });
  };

  const handleSaveProfile = async (updates: Partial<Profile>) => {
    // Check if this is completing the profile for the first time
    const isCompletingProfile = showOnboarding || !authProfile?.has_logged_in;

    await updateProfile(updates);

    // Award XP for completing profile (only on first completion)
    if (isCompletingProfile) {
      awardXP('profile_complete');
    }

    setShowEditProfile(false);
    setShowOnboarding(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const tabs = [
    { id: "swipe", label: "Explorar", icon: "🔍" },
    { id: "leaderboard", label: "Ranking", icon: "🏆" },
    { id: "matches", label: "Conexiones", icon: "🎯", badge: localMatches.length || undefined },
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "profile", label: "Perfil", icon: "👤" },
    { id: "admin", label: "Admin", icon: "🛡️" },
  ];

  // Show onboarding if needed
  if (showOnboarding && authProfile) {
    return (
      <Onboarding
        profile={authProfile}
        onComplete={handleSaveProfile}
      />
    );
  }

  // Loading state
  if (authLoading || (profilesLoading && cohortProfiles.length === 0)) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: `4px solid ${S.blue}20`,
            borderTopColor: S.blue,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "24px", fontWeight: 700, color: S.blue, margin: 0 }}>
            Negoworking
          </h1>
          <p style={{ color: S.textSec, fontSize: "13px", marginTop: "8px" }}>Cargando perfiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans', sans-serif", color: S.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`* { box-sizing: border-box; margin: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${S.border}; border-radius: 4px; } input::placeholder { color: ${S.textTer}; }`}</style>

      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "22px", fontWeight: 700, color: S.blue, margin: 0 }}>Negoworking</h1>
          <button onClick={() => setShowCohortPicker(!showCohortPicker)} style={{ fontSize: "9px", color: selectedCohort?.color || S.textTer, letterSpacing: "0.12em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            {selectedCohort?.icon} {selectedCohort?.name || "Todas las cohortes"} ▾
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StreakChip streak={me?.streak || 0}/>
          <XPChip xp={me?.xp || 0}/>
          <button onClick={handleLogout} style={{ padding: "6px 12px", borderRadius: "8px", background: S.cardLight, border: "none", color: S.textSec, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            Salir
          </button>
        </div>
      </div>

      {/* Cohort Picker Dropdown */}
      {showCohortPicker && (
        <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 150, background: "rgba(250,251,252,0.98)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.border}`, padding: "12px 20px" }}>
          <div style={{ maxWidth: "440px", margin: "0 auto" }}>
            <p style={{ fontSize: "11px", color: S.textTer, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>Seleccionar cohorte</p>
            {cohorts.filter(c => c.is_active).map(c => (
              <button key={c.id} onClick={() => { setSelectedCohortId(c.id); setShowCohortPicker(false); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", marginBottom: "6px", borderRadius: "12px", background: c.id === selectedCohortId ? `${c.color || S.blue}12` : S.card, border: `1.5px solid ${c.id === selectedCohortId ? (c.color || S.blue) : S.border}`, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "20px" }}>{c.icon || "📋"}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{c.name}</span>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>{c.description}</p>
                </div>
                <span style={{ fontSize: "10px", color: S.textTer, background: S.cardLight, padding: "2px 8px", borderRadius: "6px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {c.memberCount || 0}
                </span>
              </button>
            ))}
            {cohorts.length === 0 && (
              <p style={{ textAlign: "center", color: S.textTer, padding: "20px", fontSize: "13px" }}>
                No hay cohortes disponibles
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{ maxWidth: "440px", margin: "0 auto", padding: "14px 14px 100px", minHeight: "calc(100vh - 130px)" }}>
        {tab === "swipe" && (current ? <ProfileCard profile={current} currentUser={me} onLeft={() => swipe("left")} onRight={() => swipe("right")} getCompatibility={getCompatibility}/> : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>Exploraste todos!</h3>
            <p style={{ fontSize: "14px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>Revisa tus conexiones y conecta</p>
          </div>
        ))}
        {tab === "map" && <MapView profiles={[...cohortProfiles, ...(me ? [me] : [])]} privacySettings={privacySettings} currentUserId={currentUserId}/>}
        {tab === "leaderboard" && <Leaderboard profiles={cohortProfiles} matches={localMatches} currentUserId={currentUserId} onContact={contactFromLeaderboard} cohortId={selectedCohortId}/>}
        {tab === "matches" && <MatchesList matches={localMatches} allProfiles={allLoadedProfiles} onOpenChat={openChat}/>}
        {tab === "chat" && chatMatch && <ChatView profile={allLoadedProfiles.find(p => p.id === chatMatch.id)} icebreaker={chatMatch.icebreaker} onBack={() => setTab("matches")} conversationId={chatMatch.conversationId} currentUserId={currentUserId}/>}
        {tab === "profile" && !showEditProfile && <MyProfile profile={me} privacySettings={privacySettings} onPrivacyChange={handlePrivacyChange} matches={localMatches} onEdit={() => setShowEditProfile(true)}/>}
        {tab === "profile" && showEditProfile && (
          <ProfileForm
            profile={authProfile}
            onSave={handleSaveProfile}
            onCancel={() => setShowEditProfile(false)}
          />
        )}
        {tab === "admin" && <AdminPanel allProfiles={cohortProfiles} matches={localMatches} onManualMatch={manualMatch} cohortName={selectedCohort?.name} currentUserId={currentUserId}/>}
      </div>

      {tab !== "chat" && !showEditProfile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "center", padding: "6px 0 10px", zIndex: 100 }}>
          <div style={{ display: "flex", maxWidth: "440px", width: "100%", justifyContent: "space-around" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setShowEditProfile(false); }} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", padding: "4px 12px", color: tab === t.id ? S.blue : S.textTer, transition: "color 0.2s", position: "relative" }}>
                <span style={{ fontSize: "18px" }}>{t.icon}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
                {t.badge && <span style={{ position: "absolute", top: -2, right: 4, background: S.blue, color: "#fff", fontSize: "8px", fontWeight: 700, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMatch && <MatchAnim profile={showMatch.profile} icebreaker={showMatch.icebreaker} onClose={() => setShowMatch(null)}/>}
    </div>
  );
}
