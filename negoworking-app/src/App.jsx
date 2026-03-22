import { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";

// ============ GOOGLE MAPS CONFIG ============
const GOOGLE_MAPS_API_KEY = ""; // Add your API key here for production
const MAP_CENTER = { lat: 14.5, lng: -87.5 };
const MAP_STYLES = [
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e9e9e9" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] },
];

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

// ============ DATA ============
const PROFILES = [
  { id: 1, name: "Betsaida Olivares", country: "Guatemala", city: "Villa Nueva", lat: 14.53, lng: -90.59, role: "Facilitadora", workType: "Organización", org: "Agora Partnerships", pitch: "Transformo procesos empresariales con gamificación y e-learning", expertise: ["Sostenibilidad", "Desarrollo organizacional"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "OSC"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+502 4212 1291", linkedin: "betsaida-olivares", avatar: "BO", color: "#58CC02", photo: null, lastActive: "2026-03-19T14:30:00", hasLoggedIn: true, swipeCount: 8, showLocation: true, showPhone: true, streak: 7, league: "silver", conversationsStarted: 3, matchCount: 4 },
  { id: 2, name: "Benjamín Octavio Tapia", country: "Nicaragua", city: "Managua", lat: 12.13, lng: -86.25, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Estratega de negocios con 27 años llevando PyMEs al siguiente nivel", expertise: ["Marketing y ventas", "Finanzas"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Corporativos"], offers: ["Experiencia sectorial", "Mentoría"], seeks: ["Aliados complementarios", "Proyectos conjuntos"], whatsapp: "+505 8823 1488", linkedin: "benjamin-tapia", avatar: "BT", color: "#1CB0F6", photo: null, lastActive: "2026-03-20T09:15:00", hasLoggedIn: true, swipeCount: 12, showLocation: true, showPhone: true, streak: 12, league: "gold", conversationsStarted: 5, matchCount: 6 },
  { id: 3, name: "Sebastián Guirao", country: "México", city: "Ciudad de México", lat: 19.43, lng: -99.13, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Del marketing tradicional al UX: diseño experiencias que venden", expertise: ["Marketing y ventas", "Transformación digital"], wantsToLearn: "Género e inclusión", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Experiencia en otra temática"], whatsapp: "+52 1 1158 7378", linkedin: "sebastian-guirao", avatar: "SG", color: "#CE82FF", photo: null, lastActive: "2026-03-18T11:00:00", hasLoggedIn: true, swipeCount: 5, showLocation: false, showPhone: true, streak: 3, league: "bronze", conversationsStarted: 2, matchCount: 3 },
  { id: 4, name: "Jorge Mario Donado", country: "Colombia", city: "Ibagué", lat: 4.44, lng: -75.24, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Ingeniero agroindustrial que conecta calidad, procesos y sostenibilidad", expertise: ["Sostenibilidad", "Finanzas"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "OSC"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Nuevas metodologías", "Proyectos conjuntos"], whatsapp: "+57 318 330 8937", linkedin: "jorge-mario-donado", avatar: "JD", color: "#58CC02", photo: null, lastActive: "2026-03-20T08:00:00", hasLoggedIn: true, swipeCount: 10, showLocation: true, showPhone: true, streak: 9, league: "gold", conversationsStarted: 4, matchCount: 5 },
  { id: 5, name: "Cristhella Santizo", country: "Guatemala", city: "Ciudad de Guatemala", lat: 14.64, lng: -90.51, role: "Consultora", workType: "Organización", org: "Agora Partnerships", pitch: "Inteligencia de negocios para decisiones que transforman empresas", expertise: ["Finanzas", "Transformación digital"], wantsToLearn: "Sostenibilidad", sectors: ["Corporativos", "PyMEs"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Aliados complementarios", "Ampliar red"], whatsapp: "+502 5465 1383", linkedin: "cristhella-santizo", avatar: "CS", color: "#FF4B4B", photo: null, lastActive: "2026-03-15T16:45:00", hasLoggedIn: true, swipeCount: 3, showLocation: true, showPhone: false, streak: 1, league: "bronze", conversationsStarted: 1, matchCount: 2 },
  { id: 6, name: "Valeria Sequeira", country: "Nicaragua", city: "Granada", lat: 11.93, lng: -85.96, role: "Consultora", workType: "Organización", org: "Agora Partnerships", pitch: "Finanzas con enfoque de género para PyMEs que quieren crecer", expertise: ["Finanzas", "Género e inclusión"], wantsToLearn: "Marketing y ventas", sectors: ["PyMEs", "OSC"], offers: ["Experiencia sectorial", "Mentoría"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+505 8293 1511", linkedin: "valeria-sequeira", avatar: "VS", color: "#FFC800", photo: null, lastActive: "2026-03-19T10:20:00", hasLoggedIn: true, swipeCount: 7, showLocation: true, showPhone: true, streak: 6, league: "silver", conversationsStarted: 3, matchCount: 4 },
  { id: 7, name: "Madelyn Gutiérrez", country: "Guatemala", city: "Esquipulas", lat: 14.56, lng: -89.35, role: "Consultora", workType: "Ambas", org: "Agora Partnerships", pitch: "Impulso emprendimientos con transformación digital y marketing", expertise: ["Transformación digital", "Marketing y ventas"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Sector público"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Proyectos conjuntos", "Ampliar red"], whatsapp: "+502 3568 7604", linkedin: "madelyn-gutierrez", avatar: "MG", color: "#1CB0F6", photo: null, lastActive: "2026-03-20T10:00:00", hasLoggedIn: true, swipeCount: 9, showLocation: true, showPhone: true, streak: 5, league: "silver", conversationsStarted: 4, matchCount: 5 },
  { id: 8, name: "Lucía Mendoza", country: "México", city: "Guadalajara", lat: 20.67, lng: -103.35, role: "Coach", workType: "Independiente", org: null, pitch: "Coaching ejecutivo para líderes que quieren inspirar, no mandar", expertise: ["Liderazgo", "Género e inclusión"], wantsToLearn: "Finanzas", sectors: ["Corporativos", "Educación"], offers: ["Mentoría", "Metodologías probadas"], seeks: ["Aliados complementarios", "Experiencia en otra temática"], whatsapp: "+52 33 1245 6789", linkedin: "lucia-mendoza-coach", avatar: "LM", color: "#FF4B4B", photo: null, lastActive: "2026-03-17T09:00:00", hasLoggedIn: true, swipeCount: 4, showLocation: true, showPhone: true, streak: 2, league: "bronze", conversationsStarted: 2, matchCount: 2 },
  { id: 9, name: "Carlos Mejía", country: "Honduras", city: "Tegucigalpa", lat: 14.07, lng: -87.19, role: "Consultor", workType: "Independiente", org: null, pitch: "Hago que las PyMEs dejen de temerle a los números", expertise: ["Finanzas", "Desarrollo organizacional"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "Cooperación internacional"], offers: ["Experiencia sectorial", "Contactos y red"], seeks: ["Nuevas metodologías", "Proyectos conjuntos"], whatsapp: "+504 9876 5432", linkedin: "carlos-mejia-hn", avatar: "CM", color: "#AFAFAF", photo: null, lastActive: null, hasLoggedIn: false, swipeCount: 0, showLocation: true, showPhone: true, streak: 0, league: "none", conversationsStarted: 0, matchCount: 0 },
  { id: 10, name: "Ana Patricia Solano", country: "Costa Rica", city: "San José", lat: 9.93, lng: -84.08, role: "Facilitadora", workType: "Independiente", org: null, pitch: "Facilito procesos de cambio donde todos se sienten escuchados", expertise: ["Desarrollo organizacional", "Género e inclusión"], wantsToLearn: "Marketing y ventas", sectors: ["OSC", "Cooperación internacional"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Aliados complementarios"], whatsapp: "+506 8765 4321", linkedin: "ana-patricia-solano", avatar: "AP", color: "#1CB0F6", photo: null, lastActive: "2026-03-20T07:30:00", hasLoggedIn: true, swipeCount: 11, showLocation: true, showPhone: true, streak: 14, league: "diamond", conversationsStarted: 8, matchCount: 10 },
  { id: 11, name: "Roberto Castañeda", country: "El Salvador", city: "San Salvador", lat: 13.69, lng: -89.19, role: "Capacitador", workType: "Organización", org: "Fundación Empresarial", pitch: "Capacito equipos comerciales para vender con propósito", expertise: ["Marketing y ventas", "Liderazgo"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Contactos y red"], seeks: ["Experiencia en otra temática", "Proyectos conjuntos"], whatsapp: "+503 7654 3210", linkedin: "roberto-castaneda-sv", avatar: "RC", color: "#FF4B4B", photo: null, lastActive: "2026-03-16T14:00:00", hasLoggedIn: true, swipeCount: 2, showLocation: true, showPhone: true, streak: 0, league: "bronze", conversationsStarted: 1, matchCount: 1 },
  { id: 12, name: "Diana Marcela Ortiz", country: "Colombia", city: "Bogotá", lat: 4.71, lng: -74.07, role: "Consultora", workType: "Independiente", org: null, pitch: "Diseño estrategias de sostenibilidad que también son rentables", expertise: ["Sostenibilidad", "Finanzas"], wantsToLearn: "Género e inclusión", sectors: ["Corporativos", "Cooperación internacional"], offers: ["Experiencia sectorial", "Alianza para proyectos"], seeks: ["Aliados complementarios", "Ampliar red"], whatsapp: "+57 300 123 4567", linkedin: "diana-marcela-ortiz", avatar: "DO", color: "#58CC02", photo: null, lastActive: "2026-03-19T18:00:00", hasLoggedIn: true, swipeCount: 6, showLocation: true, showPhone: true, streak: 4, league: "silver", conversationsStarted: 3, matchCount: 4 },
  { id: 13, name: "Fernando Villanueva", country: "Guatemala", city: "Quetzaltenango", lat: 14.83, lng: -91.52, role: "Coach", workType: "Ambas", org: "Cámara de Comercio", pitch: "Acompaño emprendedores rurales a escalar sus negocios", expertise: ["Desarrollo organizacional", "Finanzas"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "Sector público"], offers: ["Mentoría", "Contactos y red"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+502 4567 8901", linkedin: "fernando-villanueva-gt", avatar: "FV", color: "#AFAFAF", photo: null, lastActive: null, hasLoggedIn: false, swipeCount: 0, showLocation: false, showPhone: false, streak: 0, league: "none", conversationsStarted: 0, matchCount: 0 },
  { id: 14, name: "Gabriela Pineda", country: "Honduras", city: "San Pedro Sula", lat: 15.5, lng: -88.03, role: "Facilitadora", workType: "Independiente", org: null, pitch: "Género no es un tema aparte, es el lente para verlo todo", expertise: ["Género e inclusión", "Liderazgo"], wantsToLearn: "Finanzas", sectors: ["OSC", "Cooperación internacional"], offers: ["Metodologías probadas", "Mentoría"], seeks: ["Proyectos conjuntos", "Experiencia en otra temática"], whatsapp: "+504 3210 9876", linkedin: "gabriela-pineda-hn", avatar: "GP", color: "#CE82FF", photo: null, lastActive: "2026-03-14T12:00:00", hasLoggedIn: true, swipeCount: 1, showLocation: true, showPhone: true, streak: 1, league: "bronze", conversationsStarted: 1, matchCount: 1 },
  { id: 15, name: "Andrés Felipe Rojas", country: "Colombia", city: "Medellín", lat: 6.25, lng: -75.56, role: "Consultor", workType: "Independiente", org: null, pitch: "Llevo la transformación digital a empresas que aún le temen", expertise: ["Transformación digital", "Marketing y ventas"], wantsToLearn: "Desarrollo organizacional", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Contactos y red"], whatsapp: "+57 311 987 6543", linkedin: "andres-felipe-rojas", avatar: "AF", color: "#1CB0F6", photo: null, lastActive: "2026-03-20T06:45:00", hasLoggedIn: true, swipeCount: 8, showLocation: true, showPhone: true, streak: 8, league: "silver", conversationsStarted: 4, matchCount: 5 },
  { id: 16, name: "María José Calderón", country: "Costa Rica", city: "Heredia", lat: 10.0, lng: -84.12, role: "Capacitadora", workType: "Organización", org: "TEC Costa Rica", pitch: "Enseño finanzas como si fuera un juego, porque así se aprende", expertise: ["Finanzas", "Desarrollo organizacional"], wantsToLearn: "Género e inclusión", sectors: ["Educación", "PyMEs"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Aliados complementarios", "Nuevas metodologías"], whatsapp: "+506 7012 3456", linkedin: "maria-jose-calderon-cr", avatar: "MJ", color: "#FFC800", photo: null, lastActive: "2026-03-18T15:30:00", hasLoggedIn: true, swipeCount: 6, showLocation: true, showPhone: true, streak: 3, league: "bronze", conversationsStarted: 2, matchCount: 3 },
];

// ============ COHORTS ============
const COHORTS = [
  {
    id: "ttt-2026",
    name: "Formando Catalizadores",
    shortName: "TTT",
    description: "Programa de formación de catalizadores empresariales — Cohorte 2026",
    color: "#2851A3",
    icon: "🚀",
    profileIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    isActive: true,
  },
  {
    id: "innovation-2026",
    name: "Innovación Empresarial",
    shortName: "IE",
    description: "Taller de innovación para líderes de PyMEs — Marzo 2026",
    color: "#7C3AED",
    icon: "💡",
    profileIds: [1, 3, 5, 7, 10, 12, 15],
    isActive: true,
  },
  {
    id: "gender-2026",
    name: "Liderazgo con Perspectiva de Género",
    shortName: "LPG",
    description: "Cohorte especializada en género e inclusión — Q2 2026",
    color: "#E11D48",
    icon: "🌟",
    profileIds: [5, 6, 7, 8, 10, 12, 14, 16],
    isActive: true,
  },
];

// Calculate XP for each profile
const calcXP = (profile) => {
  let xp = 0;
  // Profile complete
  if (profile.pitch && profile.expertise?.length && profile.wantsToLearn && profile.sectors?.length) {
    xp += XP_VALUES.profileComplete;
  }
  // Conversations started
  xp += (profile.conversationsStarted || 0) * XP_VALUES.conversationStarted;
  // Matches
  xp += (profile.matchCount || 0) * XP_VALUES.matchMade;
  // Swipes
  xp += (profile.swipeCount || 0) * XP_VALUES.swipe;
  return xp;
};

// Add XP to each profile
PROFILES.forEach(p => {
  p.xp = calcXP(p);
});

const ICEBREAKERS = [
  "Ambos trabajan con PyMEs. ¿Cuál ha sido el mayor reto con un cliente este año?",
  "Tienen expertises complementarias. ¿Qué proyecto soñado harían juntos?",
  "¿Cuál es la herramienta que más les ha cambiado la forma de trabajar?",
  "Si pudieran resolver UN problema del ecosistema emprendedor en LATAM, ¿cuál sería?",
  "¿Cuál ha sido su experiencia más memorable como catalizador?",
  "¿Qué consejo le darían a alguien que empieza en consultoría?",
  "Si combinaran sus habilidades en un solo servicio, ¿cómo se llamaría?",
];

const CURRENT_USER_ID = 7;

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

// ============ GOOGLE MAPS ============
function GoogleMapsView({ profiles, privacySettings }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [mapRef, setMapRef] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const onLoad = useCallback((map) => {
    setMapRef(map);
  }, []);

  // Filter profiles that have location visible
  const visibleProfiles = profiles.filter(p => {
    if (p.id === CURRENT_USER_ID) return privacySettings.showLocation;
    return p.showLocation !== false;
  });

  const countries = {};
  profiles.forEach(p => {
    if (!countries[p.country]) countries[p.country] = [];
    countries[p.country].push(p);
  });

  if (loadError) {
    return (
      <div style={{ padding: "16px 0" }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
        <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "16px" }}>{profiles.length} participantes · {Object.keys(countries).length} países</p>
        <div style={{ background: S.redBg, borderRadius: "12px", padding: "16px", border: `1px solid ${S.red}30` }}>
          <p style={{ color: S.red, fontSize: "13px", margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Error al cargar Google Maps. Verifica tu API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ padding: "16px 0" }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
        <div style={{ background: S.card, borderRadius: "20px", padding: "60px 20px", border: `1px solid ${S.border}`, textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${S.green}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }}/>
          <p style={{ color: S.textSec, fontSize: "13px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Cargando mapa...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
      <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "16px", fontFamily: "'DM Sans', sans-serif" }}>{visibleProfiles.length} de {profiles.length} participantes visibles · {Object.keys(countries).length} países</p>

      <div style={{ background: S.card, borderRadius: "20px", overflow: "hidden", border: `1px solid ${S.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "350px" }}
          center={MAP_CENTER}
          zoom={5}
          onLoad={onLoad}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          {visibleProfiles.map(p => (
            <MarkerF
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={() => setSelectedProfile(p)}
              icon={{
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                fillColor: p.color,
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
                scale: 1.5,
                anchor: { x: 12, y: 22 },
              }}
            />
          ))}

          {selectedProfile && (
            <InfoWindowF
              position={{ lat: selectedProfile.lat, lng: selectedProfile.lng }}
              onCloseClick={() => setSelectedProfile(null)}
            >
              <div style={{ padding: "4px", minWidth: "160px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Avatar profile={selectedProfile} size={32}/>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: "#111", fontFamily: "'DM Sans', sans-serif" }}>{selectedProfile.name}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666", fontFamily: "'DM Sans', sans-serif" }}>{selectedProfile.role}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>📍 {selectedProfile.city}, {selectedProfile.country}</p>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
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
function ProfileCard({ profile, currentUser, onLeft, onRight }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const startX = useRef(0);
  const compat = calcCompat(currentUser, profile);

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
function ChatView({ profile, icebreaker, onBack }) {
  const [messages, setMessages] = useState([{ from: "system", text: icebreaker }]);
  const [input, setInput] = useState("");
  const send = () => { if (!input.trim()) return; setMessages(p => [...p, { from: "me", text: input }]); setInput(""); };

  const showPhone = profile.showPhone !== false;
  const showLocation = profile.showLocation !== false;

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
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === "me" ? "flex-end" : m.from === "system" ? "center" : "flex-start", maxWidth: m.from === "system" ? "90%" : "80%" }}>
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
function Leaderboard({ profiles, matches = [], currentUserId, onContact }) {
  const sorted = [...profiles].filter(p => p.hasLoggedIn).sort((a, b) => (b.xp || 0) - (a.xp || 0));
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
function MyProfile({ profile, privacySettings, onPrivacyChange, matches }) {
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
        <Btn variant="outline" style={{ width: "100%", marginTop: "12px" }}>✏️ Editar mi perfil</Btn>
      </div>
    </div>
  );
}

// ============ ADMIN ============
function AdminPanel({ allProfiles, matches, onManualMatch, cohortName }) {
  const [tab, setTab] = useState("alerts");
  const noLogin = allProfiles.filter(p => !p.hasLoggedIn);
  const noSwipe = allProfiles.filter(p => p.hasLoggedIn && p.swipeCount === 0);
  const matchedIds = new Set(matches.map(m => m.id));
  matchedIds.add(CURRENT_USER_ID);
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
export default function App() {
  const [tab, setTab] = useState("swipe");
  const [matches, setMatches] = useState([
    { id: 6, type: "cupido", icebreaker: ICEBREAKERS[0], hasConversation: false },
    { id: 9, type: "cupido", icebreaker: ICEBREAKERS[3], hasConversation: false },
    { id: 12, type: "organic", icebreaker: ICEBREAKERS[5], hasConversation: true },
  ]);
  const [showMatch, setShowMatch] = useState(null);
  const [swiped, setSwiped] = useState(new Set());
  const [chatMatch, setChatMatch] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    showLocation: true,
    showPhone: true,
  });
  const [selectedCohortId, setSelectedCohortId] = useState("ttt-2026");
  const [showCohortPicker, setShowCohortPicker] = useState(false);

  const selectedCohort = COHORTS.find(c => c.id === selectedCohortId);
  const cohortProfiles = selectedCohort
    ? PROFILES.filter(p => selectedCohort.profileIds.includes(p.id))
    : PROFILES;

  const me = PROFILES.find(p => p.id === CURRENT_USER_ID);
  const sorted = cohortProfiles.filter(p => p.id !== CURRENT_USER_ID && !swiped.has(p.id)).sort((a, b) => calcCompat(me, b) - calcCompat(me, a));
  const current = sorted[0];

  useEffect(() => { setSwiped(new Set()); }, [selectedCohortId]);

  const swipe = dir => {
    if (!current) return;
    setSwiped(p => new Set([...p, current.id]));
    if (dir === "right" && Math.random() > 0.35) {
      const ice = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
      setMatches(p => [...p, { id: current.id, type: "organic", icebreaker: ice, hasConversation: false }]);
      setShowMatch({ profile: current, icebreaker: ice });
    }
  };

  const openChat = m => { setChatMatch(m); setTab("chat"); setMatches(p => p.map(x => x.id === m.id ? { ...x, hasConversation: true } : x)); };

  const manualMatch = profile => {
    const ice = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
    if (!matches.find(m => m.id === profile.id)) {
      setMatches(p => [...p, { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false }]);
    }
  };

  const contactFromLeaderboard = (profile) => {
    const existing = matches.find(m => m.id === profile.id);
    if (existing) {
      openChat(existing);
    } else {
      const ice = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
      const newMatch = { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false };
      setMatches(p => [...p, newMatch]);
      openChat(newMatch);
    }
  };

  const tabs = [
    { id: "swipe", label: "Explorar", icon: "🔍" },
    { id: "leaderboard", label: "Ranking", icon: "🏆" },
    { id: "matches", label: "Conexiones", icon: "🎯", badge: matches.length },
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "profile", label: "Perfil", icon: "👤" },
    { id: "admin", label: "Admin", icon: "🛡️" },
  ];

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
        </div>
      </div>

      {/* Cohort Picker Dropdown */}
      {showCohortPicker && (
        <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 150, background: "rgba(250,251,252,0.98)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.border}`, padding: "12px 20px" }}>
          <div style={{ maxWidth: "440px", margin: "0 auto" }}>
            <p style={{ fontSize: "11px", color: S.textTer, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>Seleccionar cohorte</p>
            {COHORTS.filter(c => c.isActive).map(c => (
              <button key={c.id} onClick={() => { setSelectedCohortId(c.id); setShowCohortPicker(false); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", marginBottom: "6px", borderRadius: "12px", background: c.id === selectedCohortId ? `${c.color}12` : S.card, border: `1.5px solid ${c.id === selectedCohortId ? c.color : S.border}`, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "20px" }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>{c.name}</span>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>{c.description}</p>
                </div>
                <span style={{ fontSize: "10px", color: S.textTer, background: S.cardLight, padding: "2px 8px", borderRadius: "6px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {c.profileIds.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: "440px", margin: "0 auto", padding: "14px 14px 100px", minHeight: "calc(100vh - 130px)" }}>
        {tab === "swipe" && (current ? <ProfileCard profile={current} currentUser={me} onLeft={() => swipe("left")} onRight={() => swipe("right")}/> : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>¡Exploraste todos!</h3>
            <p style={{ fontSize: "14px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>Revisa tus conexiones y conecta</p>
          </div>
        ))}
        {tab === "map" && <GoogleMapsView profiles={cohortProfiles} privacySettings={privacySettings}/>}
        {tab === "leaderboard" && <Leaderboard profiles={cohortProfiles} matches={matches} currentUserId={CURRENT_USER_ID} onContact={contactFromLeaderboard}/>}
        {tab === "matches" && <MatchesList matches={matches} allProfiles={PROFILES} onOpenChat={openChat}/>}
        {tab === "chat" && chatMatch && <ChatView profile={PROFILES.find(p => p.id === chatMatch.id)} icebreaker={chatMatch.icebreaker} onBack={() => setTab("matches")}/>}
        {tab === "profile" && <MyProfile profile={me} privacySettings={privacySettings} onPrivacyChange={setPrivacySettings} matches={matches}/>}
        {tab === "admin" && <AdminPanel allProfiles={cohortProfiles} matches={matches} onManualMatch={manualMatch} cohortName={selectedCohort?.name}/>}
      </div>

      {tab !== "chat" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "center", padding: "6px 0 10px", zIndex: 100 }}>
          <div style={{ display: "flex", maxWidth: "440px", width: "100%", justifyContent: "space-around" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", padding: "4px 12px", color: tab === t.id ? S.blue : S.textTer, transition: "color 0.2s", position: "relative" }}>
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
