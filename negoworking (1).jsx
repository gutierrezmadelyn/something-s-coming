import { useState, useEffect, useRef } from "react";

// ============ COUNTRY SVG PATHS (simplified) ============
const COUNTRY_PATHS = {
  Mexico: "M85,28 L95,25 L105,22 L115,28 L125,35 L130,45 L128,55 L135,60 L140,65 L145,72 L142,78 L135,82 L130,88 L125,92 L120,95 L118,100 L115,98 L110,95 L108,90 L105,88 L100,85 L95,82 L90,78 L85,75 L80,70 L75,65 L72,58 L70,52 L72,45 L75,38 L80,32 Z",
  Guatemala: "M122,98 L128,96 L132,98 L134,102 L132,106 L128,108 L124,106 L122,102 Z",
  ElSalvador: "M128,108 L132,106 L135,108 L134,112 L130,112 Z",
  Honduras: "M132,98 L140,96 L148,98 L150,102 L146,106 L140,108 L135,108 L132,106 Z",
  Nicaragua: "M140,108 L148,106 L152,110 L150,118 L145,120 L140,116 L138,112 Z",
  CostaRica: "M140,120 L145,120 L148,124 L146,128 L142,128 L140,124 Z",
  Colombia: "M155,128 L165,120 L175,118 L185,122 L190,130 L192,140 L188,150 L182,158 L175,162 L168,160 L160,155 L155,148 L152,140 L153,132 Z",
  Argentina: "M185,200 L190,190 L195,180 L198,195 L200,210 L198,225 L195,240 L190,250 L185,255 L180,248 L178,235 L180,220 L182,210 Z",
};

const COUNTRY_COLORS = {
  Mexico: true, Guatemala: true, ElSalvador: true, Honduras: true,
  Nicaragua: true, CostaRica: true, Colombia: true,
};

// Inactive countries (gray)
const INACTIVE_PATHS = {
  Belize: "M128,92 L132,90 L134,94 L130,96 L128,94 Z",
  Panama: "M146,128 L155,126 L162,128 L158,132 L152,134 L148,132 Z",
  Venezuela: "M190,118 L205,115 L215,120 L218,130 L212,138 L205,140 L195,138 L190,130 Z",
  Ecuador: "M148,148 L155,148 L158,155 L155,162 L148,160 L146,155 Z",
  Peru: "M148,162 L158,158 L168,160 L175,165 L178,175 L175,188 L168,195 L158,192 L152,185 L148,175 Z",
  Brazil: "M195,140 L212,138 L225,145 L235,160 L238,180 L235,200 L228,218 L218,230 L205,235 L195,228 L188,215 L185,200 L188,180 L190,160 L192,150 Z",
  Bolivia: "M178,178 L188,175 L195,180 L192,192 L185,198 L178,195 L175,188 Z",
  Paraguay: "M192,195 L200,192 L205,198 L202,208 L195,210 L190,205 Z",
  Uruguay: "M200,215 L208,212 L210,218 L206,224 L200,222 Z",
  Chile: "M175,195 L180,200 L182,215 L180,235 L178,250 L175,260 L172,255 L170,240 L172,220 L174,205 Z",
  Cuba: "M140,72 L155,68 L165,72 L160,76 L150,78 L142,76 Z",
  Haiti: "M170,78 L178,76 L180,80 L176,82 L172,80 Z",
  DomRep: "M180,76 L190,74 L192,78 L188,82 L182,80 Z",
};

// ============ DATA ============
const PROFILES = [
  { id: 1, name: "Betsaida Olivares", country: "Guatemala", city: "Villa Nueva", lat: 14.53, lng: -90.59, role: "Facilitadora", workType: "Organización", org: "Agora Partnerships", pitch: "Transformo procesos empresariales con gamificación y e-learning", expertise: ["Sostenibilidad", "Desarrollo organizacional"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "OSC"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+502 4212 1291", avatar: "BO", color: "#3B5EE8", photo: null, lastActive: "2026-03-19T14:30:00", hasLoggedIn: true, swipeCount: 8 },
  { id: 2, name: "Benjamín Octavio Tapia", country: "Nicaragua", city: "Managua", lat: 12.13, lng: -86.25, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Estratega de negocios con 27 años llevando PyMEs al siguiente nivel", expertise: ["Marketing y ventas", "Finanzas"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Corporativos"], offers: ["Experiencia sectorial", "Mentoría"], seeks: ["Aliados complementarios", "Proyectos conjuntos"], whatsapp: "+505 8823 1488", avatar: "BT", color: "#0284C7", photo: null, lastActive: "2026-03-20T09:15:00", hasLoggedIn: true, swipeCount: 12 },
  { id: 3, name: "Sebastián Guirao", country: "México", city: "Ciudad de México", lat: 19.43, lng: -99.13, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Del marketing tradicional al UX: diseño experiencias que venden", expertise: ["Marketing y ventas", "Transformación digital"], wantsToLearn: "Género e inclusión", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Experiencia en otra temática"], whatsapp: "+52 1 1158 7378", avatar: "SG", color: "#7C3AED", photo: null, lastActive: "2026-03-18T11:00:00", hasLoggedIn: true, swipeCount: 5 },
  { id: 4, name: "Jorge Mario Donado", country: "Colombia", city: "Ibagué", lat: 4.44, lng: -75.24, role: "Consultor", workType: "Organización", org: "Agora Partnerships", pitch: "Ingeniero agroindustrial que conecta calidad, procesos y sostenibilidad", expertise: ["Sostenibilidad", "Finanzas"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "OSC"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Nuevas metodologías", "Proyectos conjuntos"], whatsapp: "+57 318 330 8937", avatar: "JD", color: "#059669", photo: null, lastActive: "2026-03-20T08:00:00", hasLoggedIn: true, swipeCount: 10 },
  { id: 5, name: "Cristhella Santizo", country: "Guatemala", city: "Ciudad de Guatemala", lat: 14.64, lng: -90.51, role: "Consultora", workType: "Organización", org: "Agora Partnerships", pitch: "Inteligencia de negocios para decisiones que transforman empresas", expertise: ["Finanzas", "Transformación digital"], wantsToLearn: "Sostenibilidad", sectors: ["Corporativos", "PyMEs"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Aliados complementarios", "Ampliar red"], whatsapp: "+502 5465 1383", avatar: "CS", color: "#DB2777", photo: null, lastActive: "2026-03-15T16:45:00", hasLoggedIn: true, swipeCount: 3 },
  { id: 6, name: "Valeria Sequeira", country: "Nicaragua", city: "Granada", lat: 11.93, lng: -85.96, role: "Consultora", workType: "Organización", org: "Agora Partnerships", pitch: "Finanzas con enfoque de género para PyMEs que quieren crecer", expertise: ["Finanzas", "Género e inclusión"], wantsToLearn: "Marketing y ventas", sectors: ["PyMEs", "OSC"], offers: ["Experiencia sectorial", "Mentoría"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+505 8293 1511", avatar: "VS", color: "#D97706", photo: null, lastActive: "2026-03-19T10:20:00", hasLoggedIn: true, swipeCount: 7 },
  { id: 7, name: "Madelyn Gutiérrez", country: "Guatemala", city: "Esquipulas", lat: 14.56, lng: -89.35, role: "Consultora", workType: "Ambas", org: "Agora / Solucemp", pitch: "Impulso emprendimientos con transformación digital y marketing", expertise: ["Transformación digital", "Marketing y ventas"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Sector público"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Proyectos conjuntos", "Ampliar red"], whatsapp: "+502 3568 7604", avatar: "MG", color: "#0891B2", photo: null, lastActive: "2026-03-20T10:00:00", hasLoggedIn: true, swipeCount: 9 },
  { id: 8, name: "Lucía Mendoza", country: "México", city: "Guadalajara", lat: 20.67, lng: -103.35, role: "Coach", workType: "Independiente", org: null, pitch: "Coaching ejecutivo para líderes que quieren inspirar, no mandar", expertise: ["Liderazgo", "Género e inclusión"], wantsToLearn: "Finanzas", sectors: ["Corporativos", "Educación"], offers: ["Mentoría", "Metodologías probadas"], seeks: ["Aliados complementarios", "Experiencia en otra temática"], whatsapp: "+52 33 1245 6789", avatar: "LM", color: "#E11D48", photo: null, lastActive: "2026-03-17T09:00:00", hasLoggedIn: true, swipeCount: 4 },
  { id: 9, name: "Carlos Mejía", country: "Honduras", city: "Tegucigalpa", lat: 14.07, lng: -87.19, role: "Consultor", workType: "Independiente", org: null, pitch: "Hago que las PyMEs dejen de temerle a los números", expertise: ["Finanzas", "Desarrollo organizacional"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "Cooperación internacional"], offers: ["Experiencia sectorial", "Contactos y red"], seeks: ["Nuevas metodologías", "Proyectos conjuntos"], whatsapp: "+504 9876 5432", avatar: "CM", color: "#0D9488", photo: null, lastActive: null, hasLoggedIn: false, swipeCount: 0 },
  { id: 10, name: "Ana Patricia Solano", country: "Costa Rica", city: "San José", lat: 9.93, lng: -84.08, role: "Facilitadora", workType: "Independiente", org: null, pitch: "Facilito procesos de cambio donde todos se sienten escuchados", expertise: ["Desarrollo organizacional", "Género e inclusión"], wantsToLearn: "Marketing y ventas", sectors: ["OSC", "Cooperación internacional"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Aliados complementarios"], whatsapp: "+506 8765 4321", avatar: "AP", color: "#9333EA", photo: null, lastActive: "2026-03-20T07:30:00", hasLoggedIn: true, swipeCount: 11 },
  { id: 11, name: "Roberto Castañeda", country: "El Salvador", city: "San Salvador", lat: 13.69, lng: -89.19, role: "Capacitador", workType: "Organización", org: "Fundación Empresarial", pitch: "Capacito equipos comerciales para vender con propósito", expertise: ["Marketing y ventas", "Liderazgo"], wantsToLearn: "Sostenibilidad", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Contactos y red"], seeks: ["Experiencia en otra temática", "Proyectos conjuntos"], whatsapp: "+503 7654 3210", avatar: "RC", color: "#DC2626", photo: null, lastActive: "2026-03-16T14:00:00", hasLoggedIn: true, swipeCount: 2 },
  { id: 12, name: "Diana Marcela Ortiz", country: "Colombia", city: "Bogotá", lat: 4.71, lng: -74.07, role: "Consultora", workType: "Independiente", org: null, pitch: "Diseño estrategias de sostenibilidad que también son rentables", expertise: ["Sostenibilidad", "Finanzas"], wantsToLearn: "Género e inclusión", sectors: ["Corporativos", "Cooperación internacional"], offers: ["Experiencia sectorial", "Alianza para proyectos"], seeks: ["Aliados complementarios", "Ampliar red"], whatsapp: "+57 300 123 4567", avatar: "DO", color: "#047857", photo: null, lastActive: "2026-03-19T18:00:00", hasLoggedIn: true, swipeCount: 6 },
  { id: 13, name: "Fernando Villanueva", country: "Guatemala", city: "Quetzaltenango", lat: 14.83, lng: -91.52, role: "Coach", workType: "Ambas", org: "Cámara de Comercio", pitch: "Acompaño emprendedores rurales a escalar sus negocios", expertise: ["Desarrollo organizacional", "Finanzas"], wantsToLearn: "Transformación digital", sectors: ["PyMEs", "Sector público"], offers: ["Mentoría", "Contactos y red"], seeks: ["Nuevas metodologías", "Aliados complementarios"], whatsapp: "+502 4567 8901", avatar: "FV", color: "#B45309", photo: null, lastActive: null, hasLoggedIn: false, swipeCount: 0 },
  { id: 14, name: "Gabriela Pineda", country: "Honduras", city: "San Pedro Sula", lat: 15.5, lng: -88.03, role: "Facilitadora", workType: "Independiente", org: null, pitch: "Género no es un tema aparte, es el lente para verlo todo", expertise: ["Género e inclusión", "Liderazgo"], wantsToLearn: "Finanzas", sectors: ["OSC", "Cooperación internacional"], offers: ["Metodologías probadas", "Mentoría"], seeks: ["Proyectos conjuntos", "Experiencia en otra temática"], whatsapp: "+504 3210 9876", avatar: "GP", color: "#6D28D9", photo: null, lastActive: "2026-03-14T12:00:00", hasLoggedIn: true, swipeCount: 1 },
  { id: 15, name: "Andrés Felipe Rojas", country: "Colombia", city: "Medellín", lat: 6.25, lng: -75.56, role: "Consultor", workType: "Independiente", org: null, pitch: "Llevo la transformación digital a empresas que aún le temen", expertise: ["Transformación digital", "Marketing y ventas"], wantsToLearn: "Desarrollo organizacional", sectors: ["PyMEs", "Corporativos"], offers: ["Metodologías probadas", "Alianza para proyectos"], seeks: ["Ampliar red", "Contactos y red"], whatsapp: "+57 311 987 6543", avatar: "AF", color: "#1D4ED8", photo: null, lastActive: "2026-03-20T06:45:00", hasLoggedIn: true, swipeCount: 8 },
  { id: 16, name: "María José Calderón", country: "Costa Rica", city: "Heredia", lat: 10.0, lng: -84.12, role: "Capacitadora", workType: "Organización", org: "TEC Costa Rica", pitch: "Enseño finanzas como si fuera un juego, porque así se aprende", expertise: ["Finanzas", "Desarrollo organizacional"], wantsToLearn: "Género e inclusión", sectors: ["Educación", "PyMEs"], offers: ["Metodologías probadas", "Experiencia sectorial"], seeks: ["Aliados complementarios", "Nuevas metodologías"], whatsapp: "+506 7012 3456", avatar: "MJ", color: "#C2410C", photo: null, lastActive: "2026-03-18T15:30:00", hasLoggedIn: true, swipeCount: 6 },
];

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
  bg: "#FAFBFC", card: "#FFFFFF", border: "#E5E7EB", borderLight: "#F3F4F6",
  text: "#111827", textSec: "#6B7280", textTer: "#9CA3AF",
  primary: "#2851A3", primaryLight: "#EEF2FF", primaryText: "#4F6EC5",
  green: "#059669", greenBg: "#ECFDF5", greenText: "#047857",
  rose: "#E11D48", roseBg: "#FFF1F2", roseText: "#BE123C",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#B45309",
  purple: "#7C3AED", purpleBg: "#F5F3FF", purpleText: "#6D28D9",
};

// ============ COMPONENTS ============
const Tag = ({ children, bg = S.borderLight, color = S.textSec }) => (
  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: bg, color, marginRight: "4px", marginBottom: "4px" }}>{children}</span>
);

const Avatar = ({ profile, size = 48 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: profile.photo ? `url(${profile.photo}) center/cover` : `linear-gradient(135deg, ${profile.color}, ${profile.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color: "#fff", flexShrink: 0, border: `2px solid ${S.border}` }}>
    {!profile.photo && profile.avatar}
  </div>
);

const CompatBadge = ({ score }) => {
  const c = score >= 75 ? S.green : score >= 50 ? S.amber : S.rose;
  const bg = score >= 75 ? S.greenBg : score >= 50 ? S.amberBg : S.roseBg;
  return (
    <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: "10px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }}/>
      <span style={{ color: c, fontSize: "12px", fontWeight: 700 }}>{score}%</span>
    </div>
  );
};

const Btn = ({ children, onClick, variant = "default", style: s = {} }) => {
  const base = { padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif", ...s };
  const styles = {
    default: { ...base, background: S.borderLight, color: S.textSec },
    primary: { ...base, background: S.primary, color: "#fff" },
    outline: { ...base, background: "transparent", border: `1.5px solid ${S.border}`, color: S.textSec },
  };
  return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};

// ============ MAP ============
function LatamMap({ profiles }) {
  const [hover, setHover] = useState(null);
  const countries = {};
  profiles.forEach(p => { if (!countries[p.country]) countries[p.country] = []; countries[p.country].push(p); });

  const project = (lat, lng) => ({
    x: ((lng + 120) / 55) * 350 + 15,
    y: ((25 - lat) / 32) * 300 + 10,
  });

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "20px", color: S.text, marginBottom: "4px" }}>Comunidad Catalizadores</h3>
      <p style={{ fontSize: "13px", color: S.textSec, marginBottom: "16px" }}>{profiles.length} participantes · {Object.keys(countries).length} países</p>
      <div style={{ background: S.card, borderRadius: "20px", padding: "16px", border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <svg viewBox="0 0 380 300" style={{ width: "100%", height: "auto" }}>
          {/* Inactive countries */}
          {Object.entries(INACTIVE_PATHS).map(([name, d]) => (
            <path key={name} d={d} fill="#E5E7EB" stroke="#fff" strokeWidth="1"/>
          ))}
          {/* Active countries */}
          {Object.entries(COUNTRY_PATHS).map(([name, d]) => (
            <path key={name} d={d} fill={S.primary} stroke="#fff" strokeWidth="1.5" opacity="0.85"/>
          ))}
          {/* Participant dots */}
          {profiles.map(p => {
            const pos = project(p.lat, p.lng);
            const isHovered = hover === p.id;
            return (
              <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                {isHovered && <circle cx={pos.x} cy={pos.y} r="14" fill={`${p.color}22`}/>}
                <circle cx={pos.x} cy={pos.y} r={isHovered ? 6 : 4.5} fill="#fff" stroke={p.color} strokeWidth="2.5"/>
                {isHovered && (
                  <g>
                    <rect x={pos.x - 55} y={pos.y - 36} width="110" height="28" rx="8" fill="white" stroke={S.border} strokeWidth="1" filter="url(#shadow)"/>
                    <text x={pos.x} y={pos.y - 24} textAnchor="middle" fill={S.text} fontSize="10" fontWeight="600" fontFamily="DM Sans">{p.name}</text>
                    <text x={pos.x} y={pos.y - 13} textAnchor="middle" fill={S.textSec} fontSize="8" fontFamily="DM Sans">{p.role} · {p.city}</text>
                  </g>
                )}
              </g>
            );
          })}
          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1"/>
            </filter>
          </defs>
        </svg>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {Object.entries(countries).sort((a, b) => b[1].length - a[1].length).map(([country, members]) => (
          <div key={country} style={{ background: S.card, borderRadius: "10px", padding: "6px 12px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{country}</span>
            <span style={{ fontSize: "10px", color: S.textSec, background: S.borderLight, padding: "1px 7px", borderRadius: "6px", fontWeight: 600 }}>{members.length}</span>
          </div>
        ))}
      </div>
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

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 auto", userSelect: "none", touchAction: "none" }}
      onMouseDown={e => onS(e.clientX)} onMouseMove={e => onM(e.clientX)} onMouseUp={onE} onMouseLeave={() => dragging && onE()}
      onTouchStart={e => onS(e.touches[0].clientX)} onTouchMove={e => onM(e.touches[0].clientX)} onTouchEnd={onE}>
      
      <div style={{ background: S.card, borderRadius: "24px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)", border: `1px solid ${S.border}` }}>
        <div style={{ background: `linear-gradient(135deg, ${profile.color}18, ${profile.color}08)`, padding: "32px 20px 20px", position: "relative", borderBottom: `1px solid ${S.borderLight}` }}>
          <CompatBadge score={compat}/>
          <Avatar profile={profile} size={80}/>
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "22px", color: S.text, margin: "0 0 2px" }}>{profile.name}</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: S.textSec }}>📍 {profile.city}, {profile.country}</span>
              <span style={{ fontSize: "12px", color: S.textSec }}>💼 {profile.role}</span>
            </div>
            {profile.org && <p style={{ color: S.textTer, fontSize: "11px", margin: "2px 0 0" }}>{profile.org}</p>}
            <div style={{ marginTop: "8px" }}>
              <Tag bg={`${profile.color}12`} color={profile.color}>{profile.workType === "Independiente" ? "Independiente" : profile.workType === "Organización" ? "Organización" : "Independiente + Org"}</Tag>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <p style={{ fontSize: "14px", color: S.text, fontStyle: "italic", textAlign: "center", margin: "0 0 16px", lineHeight: 1.5 }}>"{profile.pitch}"</p>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>Domina</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.expertise.map(e => <Tag key={e} bg={S.primaryLight} color={S.primaryText}>{e}</Tag>)}</div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>Quiere aprender</p>
            <Tag bg={S.amberBg} color={S.amberText}>{profile.wantsToLearn}</Tag>
          </div>
          {expanded && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>Ofrece</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.offers.map(o => <Tag key={o} bg={S.greenBg} color={S.greenText}>{o}</Tag>)}</div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>Busca</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.seeks.map(s => <Tag key={s} bg={S.roseBg} color={S.roseText}>{s}</Tag>)}</div>
              </div>
              <div>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>Sectores</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.sectors.map(s => <Tag key={s}>{s}</Tag>)}</div>
              </div>
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} style={{ width: "100%", padding: "8px", marginTop: "10px", background: S.borderLight, border: "none", borderRadius: "10px", color: S.textSec, fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {expanded ? "Ver menos ▲" : "Ver más ▼"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px" }}>
        <button onClick={onLeft} style={{ width: 56, height: 56, borderRadius: "50%", background: S.roseBg, border: `2px solid ${S.rose}33`, color: S.rose, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px" }}>✕</button>
        <button onClick={onRight} style={{ width: 56, height: 56, borderRadius: "50%", background: S.greenBg, border: `2px solid ${S.green}33`, color: S.green, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "18px" }}>♥</button>
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
        <div style={{ fontSize: "56px", marginBottom: "8px" }}>🤝</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "28px", color: S.text, marginBottom: "4px" }}>¡Es un Match!</h2>
        <p style={{ color: S.textSec, fontSize: "14px", marginBottom: "20px" }}>Tú y <strong style={{ color: S.text }}>{profile.name}</strong> quieren conectar</p>
        <div style={{ background: S.primaryLight, border: `1px solid ${S.primary}20`, borderRadius: "16px", padding: "14px", marginBottom: "20px", textAlign: "left" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", color: S.primary, letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 700 }}>💬 Pregunta rompehielo</p>
          <p style={{ color: S.text, fontSize: "13px", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{icebreaker}"</p>
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
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: `1px solid ${S.border}`, marginBottom: "12px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: S.textSec, cursor: "pointer", fontSize: "18px", padding: "4px" }}>←</button>
        <Avatar profile={profile} size={40}/>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: S.text, fontSize: "14px", fontWeight: 600 }}>{profile.name}</p>
          <p style={{ margin: 0, color: S.textTer, fontSize: "11px" }}>{profile.role} · {profile.city}</p>
        </div>
        <a href={`https://wa.me/${profile.whatsapp?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "10px", background: "#ECFDF5", border: "1px solid #D1FAE5", color: "#059669", fontSize: "11px", fontWeight: 600, textDecoration: "none" }}>
          📱 WhatsApp
        </a>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "12px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === "me" ? "flex-end" : m.from === "system" ? "center" : "flex-start", maxWidth: m.from === "system" ? "90%" : "80%" }}>
            {m.from === "system" ? (
              <div style={{ background: S.primaryLight, border: `1px solid ${S.primary}15`, borderRadius: "14px", padding: "12px 14px", textAlign: "center" }}>
                <p style={{ fontSize: "9px", textTransform: "uppercase", color: S.primary, letterSpacing: "0.08em", margin: "0 0 4px", fontWeight: 700 }}>Pregunta rompehielo</p>
                <p style={{ color: S.text, fontSize: "12px", margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>{m.text}</p>
              </div>
            ) : (
              <div style={{ background: m.from === "me" ? S.primary : S.borderLight, borderRadius: "16px", padding: "10px 14px" }}>
                <p style={{ color: m.from === "me" ? "#fff" : S.text, fontSize: "13px", margin: 0, lineHeight: 1.4 }}>{m.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: `1px solid ${S.border}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: "11px 14px", borderRadius: "12px", border: `1px solid ${S.border}`, background: S.card, color: S.text, fontSize: "13px", outline: "none", fontFamily: "'DM Sans',sans-serif" }}/>
        <Btn onClick={send} variant="primary" style={{ padding: "11px 18px" }}>Enviar</Btn>
      </div>
    </div>
  );
}

// ============ MATCHES LIST ============
function MatchesList({ matches, allProfiles, onOpenChat }) {
  if (!matches.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🤝</div>
      <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", color: S.text }}>Aún no tienes matches</h3>
      <p style={{ fontSize: "13px", color: S.textSec }}>Explora perfiles y conecta con otros catalizadores</p>
    </div>
  );
  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "20px", color: S.text, marginBottom: "16px" }}>Tus Matches ({matches.length})</h3>
      {matches.map(m => {
        const p = allProfiles.find(x => x.id === m.id);
        if (!p) return null;
        return (
          <div key={m.id} onClick={() => onOpenChat(m)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", marginBottom: "6px", background: S.card, borderRadius: "14px", border: `1px solid ${S.border}`, cursor: "pointer", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <Avatar profile={p} size={44}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h4 style={{ margin: 0, color: S.text, fontSize: "14px" }}>{p.name}</h4>
                {m.type === "cupido" && <span style={{ fontSize: "10px", color: S.rose, background: S.roseBg, padding: "2px 7px", borderRadius: "6px", fontWeight: 600 }}>💘 Cupido</span>}
              </div>
              <p style={{ margin: "1px 0 0", color: S.textTer, fontSize: "11px" }}>{p.role} · {p.city}</p>
            </div>
            <span style={{ color: S.textTer, fontSize: "12px" }}>💬</span>
          </div>
        );
      })}
    </div>
  );
}

// ============ MY PROFILE ============
function MyProfile({ profile }) {
  const [photoHover, setPhotoHover] = useState(false);
  const sections = [
    { label: "Domina", items: profile.expertise, bg: S.primaryLight, color: S.primaryText },
    { label: "Quiere aprender", items: [profile.wantsToLearn], bg: S.amberBg, color: S.amberText },
    { label: "Ofrece", items: profile.offers, bg: S.greenBg, color: S.greenText },
    { label: "Busca", items: profile.seeks, bg: S.roseBg, color: S.roseText },
    { label: "Sectores", items: profile.sectors, bg: S.borderLight, color: S.textSec },
  ];
  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ background: `linear-gradient(135deg, ${profile.color}12, ${profile.color}06)`, borderRadius: "20px", padding: "28px 20px", textAlign: "center", marginBottom: "12px", border: `1px solid ${S.border}` }}>
        <div style={{ position: "relative", display: "inline-block" }}
          onMouseEnter={() => setPhotoHover(true)} onMouseLeave={() => setPhotoHover(false)}>
          <Avatar profile={profile} size={76}/>
          {photoHover && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 600 }}>📷</span>
            </div>
          )}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", color: S.text, margin: "12px 0 2px", fontSize: "22px" }}>{profile.name}</h2>
        <p style={{ color: S.textSec, fontSize: "13px", margin: 0 }}>{profile.role} · {profile.city}, {profile.country}</p>
        {profile.org && <p style={{ color: S.textTer, fontSize: "11px", margin: "2px 0 0" }}>{profile.org}</p>}
      </div>
      <div style={{ background: S.card, borderRadius: "16px", padding: "18px", border: `1px solid ${S.border}` }}>
        <p style={{ fontStyle: "italic", color: S.text, fontSize: "14px", textAlign: "center", margin: "0 0 16px", lineHeight: 1.5 }}>"{profile.pitch}"</p>
        {sections.map(s => (
          <div key={s.label} style={{ marginBottom: "10px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: S.textTer, margin: "0 0 5px", fontWeight: 700 }}>{s.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{s.items.map(i => <Tag key={i} bg={s.bg} color={s.color}>{i}</Tag>)}</div>
          </div>
        ))}
        <Btn variant="outline" style={{ width: "100%", marginTop: "8px" }}>✏️ Editar mi perfil</Btn>
      </div>
    </div>
  );
}

// ============ ADMIN ============
function AdminPanel({ allProfiles, matches, onManualMatch }) {
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
      <div style={{ background: bgColor, borderRadius: "14px", padding: "14px", marginBottom: "10px", border: `1px solid ${color}15` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span>{icon}</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: S.text }}>{title}</span>
          <span style={{ fontSize: "10px", color: S.textSec, background: "rgba(0,0,0,0.05)", padding: "1px 7px", borderRadius: "6px", fontWeight: 600, marginLeft: "auto" }}>{items.length}</span>
        </div>
        {items.map((p, i) => (
          <div key={typeof p === "object" ? p.id : i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0" }}>
            <Avatar profile={typeof p === "object" ? p : allProfiles.find(x => x.id === p.id)} size={28}/>
            <span style={{ fontSize: "12px", color: S.text, flex: 1 }}>{typeof p === "object" ? p.name : allProfiles.find(x => x.id === p.id)?.name}</span>
            {onAction && <button onClick={() => onAction(typeof p === "object" ? p : allProfiles.find(x => x.id === p.id))} style={{ padding: "4px 10px", borderRadius: "8px", background: `${S.rose}10`, border: `1px solid ${S.rose}20`, color: S.rose, fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>💘 Match</button>}
          </div>
        ))}
      </div>
    );
  };

  const Bar = ({ entries, max, color }) => entries.sort((a, b) => b[1] - a[1]).map(([name, count]) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
      <span style={{ fontSize: "11px", color: S.textSec, minWidth: "120px", textAlign: "right" }}>{name}</span>
      <div style={{ flex: 1, height: 6, background: S.borderLight, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: color, borderRadius: "3px" }}/>
      </div>
      <span style={{ fontSize: "11px", color: S.textTer, minWidth: "16px" }}>{count}</span>
    </div>
  ));

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "20px", color: S.text, marginBottom: "14px" }}>Panel Admin</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "14px" }}>
        {[
          { v: allProfiles.length, l: "Perfiles", c: S.primary },
          { v: matches.length, l: "Matches", c: S.green },
          { v: allProfiles.filter(p => p.hasLoggedIn).length, l: "Activos", c: "#0891B2" },
          { v: total, l: "Alertas", c: S.amber },
        ].map(s => (
          <div key={s.l} style={{ background: S.card, borderRadius: "12px", padding: "12px 6px", border: `1px solid ${S.border}`, textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: "9px", color: S.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px", overflowX: "auto" }}>
        {[
          { id: "alerts", label: "Alertas", badge: total },
          { id: "stats", label: "Estadísticas" },
          { id: "people", label: "Participantes" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 14px", borderRadius: "10px", border: "none", background: tab === t.id ? S.primaryLight : "transparent", color: tab === t.id ? S.primary : S.textSec, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
            {t.label}
            {t.badge !== undefined && <span style={{ background: tab === t.id ? S.primary : S.borderLight, color: tab === t.id ? "#fff" : S.textTer, fontSize: "9px", padding: "1px 6px", borderRadius: "6px", fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div>
          <AlertCard icon="🚪" title="No han ingresado" items={noLogin} color={S.rose} bgColor={S.roseBg}/>
          <AlertCard icon="👆" title="Sin swipes" items={noSwipe} color={S.amber} bgColor={S.amberBg}/>
          <AlertCard icon="💔" title="Sin matches" items={noMatch} color={S.purple} bgColor={S.purpleBg} onAction={onManualMatch}/>
          <AlertCard icon="💬" title="Matches sin conversación" items={noConvo.map(m => allProfiles.find(p => p.id === m.id)).filter(Boolean)} color="#0891B2" bgColor="#ECFEFF"/>
          {total === 0 && <p style={{ textAlign: "center", color: S.textSec, padding: "40px 0" }}>Sin alertas</p>}
        </div>
      )}
      {tab === "stats" && (
        <div>
          <div style={{ background: S.card, borderRadius: "14px", padding: "16px", border: `1px solid ${S.border}`, marginBottom: "10px" }}>
            <h4 style={{ color: S.textSec, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 700 }}>Temáticas dominadas</h4>
            <Bar entries={Object.entries(expertCount)} max={allProfiles.length} color={S.primary}/>
          </div>
          <div style={{ background: S.card, borderRadius: "14px", padding: "16px", border: `1px solid ${S.border}` }}>
            <h4 style={{ color: S.textSec, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 700 }}>Lo que más buscan</h4>
            <Bar entries={Object.entries(seekCount)} max={allProfiles.length} color={S.rose}/>
          </div>
        </div>
      )}
      {tab === "people" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", color: S.textSec }}>{allProfiles.length} participantes</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <Btn variant="primary" style={{ padding: "6px 12px", fontSize: "11px" }}>+ Agregar</Btn>
              <Btn variant="outline" style={{ padding: "6px 12px", fontSize: "11px" }}>📤 CSV</Btn>
            </div>
          </div>
          {allProfiles.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: `1px solid ${S.borderLight}` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.hasLoggedIn ? S.green : S.border, flexShrink: 0 }}/>
              <Avatar profile={p} size={30}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: S.text, fontSize: "12px", fontWeight: 600 }}>{p.name}</p>
                <p style={{ margin: 0, color: S.textTer, fontSize: "10px" }}>{p.role} · {p.swipeCount} swipes</p>
              </div>
              <button style={{ padding: "4px 10px", borderRadius: "8px", background: S.roseBg, border: `1px solid ${S.rose}15`, color: S.rose, fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>💘 Match</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN ============
export default function Negoworking() {
  const [tab, setTab] = useState("swipe");
  const [matches, setMatches] = useState([
    { id: 6, type: "cupido", icebreaker: ICEBREAKERS[0], hasConversation: false },
    { id: 9, type: "cupido", icebreaker: ICEBREAKERS[3], hasConversation: false },
    { id: 12, type: "organic", icebreaker: ICEBREAKERS[5], hasConversation: true },
  ]);
  const [showMatch, setShowMatch] = useState(null);
  const [swiped, setSwiped] = useState(new Set());
  const [chatMatch, setChatMatch] = useState(null);

  const me = PROFILES.find(p => p.id === CURRENT_USER_ID);
  const sorted = PROFILES.filter(p => p.id !== CURRENT_USER_ID && !swiped.has(p.id)).sort((a, b) => calcCompat(me, b) - calcCompat(me, a));
  const current = sorted[0];

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

  const tabs = [
    { id: "swipe", label: "Explorar", icon: "🔍" },
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "matches", label: "Matches", icon: "🤝", badge: matches.length },
    { id: "profile", label: "Perfil", icon: "👤" },
    { id: "admin", label: "Admin", icon: "🛡️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans',sans-serif", color: S.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`* { box-sizing: border-box; margin: 0; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 3px; } input::placeholder { color: #9CA3AF; }`}</style>

      {/* Header */}
      <div style={{ padding: "12px 20px 8px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, zIndex: 100, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "20px", fontWeight: 800, color: S.primary, margin: 0 }}>Negoworking</h1>
          <p style={{ fontSize: "9px", color: S.textTer, letterSpacing: "0.12em", textTransform: "uppercase" }}>Formando Catalizadores</p>
        </div>
      </div>

      <div style={{ maxWidth: "440px", margin: "0 auto", padding: "14px 14px 100px", minHeight: "calc(100vh - 130px)" }}>
        {tab === "swipe" && (current ? <ProfileCard profile={current} currentUser={me} onLeft={() => swipe("left")} onRight={() => swipe("right")}/> : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", color: S.text }}>¡Exploraste todos!</h3>
            <p style={{ fontSize: "13px", color: S.textSec }}>Revisa tus matches y conecta</p>
          </div>
        ))}
        {tab === "map" && <LatamMap profiles={PROFILES}/>}
        {tab === "matches" && <MatchesList matches={matches} allProfiles={PROFILES} onOpenChat={openChat}/>}
        {tab === "chat" && chatMatch && <ChatView profile={PROFILES.find(p => p.id === chatMatch.id)} icebreaker={chatMatch.icebreaker} onBack={() => setTab("matches")}/>}
        {tab === "profile" && <MyProfile profile={me}/>}
        {tab === "admin" && <AdminPanel allProfiles={PROFILES} matches={matches} onManualMatch={manualMatch}/>}
      </div>

      {tab !== "chat" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,251,252,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "center", padding: "6px 0 10px", zIndex: 100 }}>
          <div style={{ display: "flex", maxWidth: "440px", width: "100%", justifyContent: "space-around" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", padding: "4px 12px", color: tab === t.id ? S.primary : S.textTer, transition: "color 0.2s", position: "relative" }}>
                <span style={{ fontSize: "16px" }}>{t.icon}</span>
                <span style={{ fontSize: "9px", fontWeight: 600 }}>{t.label}</span>
                {t.badge && <span style={{ position: "absolute", top: -2, right: 4, background: S.primary, color: "#fff", fontSize: "8px", fontWeight: 700, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMatch && <MatchAnim profile={showMatch.profile} icebreaker={showMatch.icebreaker} onClose={() => setShowMatch(null)}/>}
    </div>
  );
}
