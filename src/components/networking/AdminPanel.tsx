// @ts-nocheck
import { useState, useMemo } from "react";
import { S } from "./styles";
import { Avatar, Btn } from "./ui";

export default function AdminPanel({
  allProfiles,
  matches,
  onManualMatch,
  cohortName,
  currentUserId,
  cohorts = [],
  onCreateCohort,
  onUpdateCohort,
  onDeleteCohort,
  onImportUsers,
  allSystemProfiles = [],
  onAddMemberToCohort,
  onRemoveMemberFromCohort,
  selectedCohortId,
  onRefreshProfiles,
}) {
  const [tab, setTab] = useState("alerts");
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [cohortForm, setCohortForm] = useState({ name: "", short_name: "", description: "", color: "#2851A3", icon: "📋" });
  const [savingCohort, setSavingCohort] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importError, setImportError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cohort"); // "cohort" | "all"
  const [filterCountry, setFilterCountry] = useState("");
  const [assigningCohort, setAssigningCohort] = useState(null); // { profileId, show }

  // Determine which profiles to show
  const displayProfiles = viewMode === "all" ? allSystemProfiles : allProfiles;

  // Filter and search
  const filteredProfiles = useMemo(() => {
    let result = displayProfiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q)
      );
    }
    if (filterCountry) {
      result = result.filter(p => p.country === filterCountry);
    }
    return result;
  }, [displayProfiles, searchQuery, filterCountry]);

  // Get unique countries for filter
  const countries = useMemo(() => {
    const set = new Set(displayProfiles.map(p => p.country).filter(Boolean));
    return Array.from(set).sort();
  }, [displayProfiles]);

  const noLogin = allProfiles.filter(p => !p.hasLoggedIn);
  const noSwipe = allProfiles.filter(p => p.hasLoggedIn && p.swipeCount === 0);
  const matchedIds = new Set(matches.map(m => m.id));
  if (currentUserId) matchedIds.add(currentUserId);
  const noMatch = allProfiles.filter(p => !matchedIds.has(p.id));
  const noConvo = matches.filter(m => !m.hasConversation);
  const total = noLogin.length + noSwipe.length + noMatch.length + noConvo.length;

  const expertCount = {}; allProfiles.forEach(p => (p.expertise || []).forEach(e => { expertCount[e] = (expertCount[e] || 0) + 1; }));
  const seekCount = {}; allProfiles.forEach(p => (p.seeks || []).forEach(s => { seekCount[s] = (seekCount[s] || 0) + 1; }));

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
            <Avatar profile={typeof p === "object" ? p : allProfiles.find(x => x.id === p?.id)} size={32}/>
            <span style={{ fontSize: "13px", color: S.text, flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{typeof p === "object" ? p.name : allProfiles.find(x => x.id === p?.id)?.name}</span>
            {onAction && <button onClick={() => onAction(typeof p === "object" ? p : allProfiles.find(x => x.id === p?.id))} style={{ padding: "5px 12px", borderRadius: "8px", background: S.blueBg, border: `2px solid ${S.blue}30`, color: S.blue, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🎯 Conectar</button>}
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

  const exportCSV = () => {
    const headers = ["Nombre", "Email", "Pais", "Ciudad", "Rol", "Expertise", "Ofrece", "Busca", "XP", "Streak", "Liga", "Swipes", "Ha ingresado", "Cohorte"];
    const rows = (viewMode === "all" ? allSystemProfiles : allProfiles).map(p => [
      p.name, p.email || "", p.country || "", p.city || "", p.role || "",
      (p.expertise || []).join("; "), (p.offers || []).join("; "), (p.seeks || []).join("; "),
      p.xp || 0, p.streak || 0, p.league || "none", p.swipeCount || 0,
      p.hasLoggedIn ? "Si" : "No", cohortName || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `participantes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;

        // Remove BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        // Normalize line endings (Windows \r\n to \n)
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        const lines = text.split("\n").filter(line => line.trim());

        if (lines.length < 2) {
          setImportError("El archivo debe tener al menos una fila de encabezados y una fila de datos");
          return;
        }

        // Detect delimiter (tab, semicolon, or comma)
        const firstLine = lines[0];
        let delimiter = ",";
        if (firstLine.includes("\t")) {
          delimiter = "\t";
        } else if (firstLine.includes(";")) {
          delimiter = ";";
        }

        const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ""));

        console.log("CSV Headers detectados:", headers);
        console.log("Delimiter usado:", delimiter === "\t" ? "TAB" : delimiter);

        // Check for nombre or "nombre completo"
        const hasNombre = headers.some(h => h.includes("nombre"));
        const hasEmail = headers.some(h => h.includes("email") || h.includes("correo"));

        if (!hasNombre || !hasEmail) {
          const missing = [];
          if (!hasNombre) missing.push("nombre");
          if (!hasEmail) missing.push("email");
          setImportError(`Columnas requeridas faltantes: ${missing.join(", ")}. Columnas encontradas: ${headers.join(", ")}`);
          return;
        }

        const data = lines.slice(1).map((line, idx) => {
          const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ""));
          const row: Record<string, any> = { _row: idx + 2 };
          headers.forEach((h, i) => { row[h] = values[i] || ""; });

          // Normalize field names - find any header containing "nombre" or "email"
          const nombreKey = headers.find(h => h.includes("nombre"));
          const emailKey = headers.find(h => h.includes("email") || h.includes("correo"));

          if (nombreKey && !row.nombre) row.nombre = row[nombreKey];
          if (emailKey && !row.email) row.email = row[emailKey];

          return row;
        }).filter(row => row.nombre && row.email);

        console.log("Datos parseados:", data);

        if (data.length === 0) {
          setImportError(`No se encontraron filas validas. Asegurate de que cada fila tenga nombre y email. Total lineas: ${lines.length - 1}`);
          return;
        }

        setImportData(data);
        setImportError(null);
      } catch (err) {
        console.error("Error parsing CSV:", err);
        setImportError("Error al procesar el archivo CSV: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleAssignCohort = async (profileId, cohortId) => {
    if (!onAddMemberToCohort) return;
    const success = await onAddMemberToCohort(cohortId, profileId);
    if (success) {
      setAssigningCohort(null);
      if (onRefreshProfiles) onRefreshProfiles();
    }
  };

  const handleRemoveFromCohort = async (profileId) => {
    if (!onRemoveMemberFromCohort || !selectedCohortId) return;
    const success = await onRemoveMemberFromCohort(selectedCohortId, profileId);
    if (success && onRefreshProfiles) onRefreshProfiles();
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, marginBottom: "6px" }}>Panel Admin</h3>
      {cohortName && <p style={{ fontSize: "11px", color: S.blue, fontWeight: 600, marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>📋 Cohorte activa: {cohortName} · {allProfiles.length} participantes</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          { v: viewMode === "all" ? allSystemProfiles.length : allProfiles.length, l: "Perfiles", c: S.blue },
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
          { id: "stats", label: "Estadisticas" },
          { id: "people", label: "Participantes" },
          ...(onCreateCohort ? [{ id: "cohorts", label: "Cohortes", badge: cohorts.length }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", background: tab === t.id ? S.blueBg : "transparent", color: tab === t.id ? S.blue : S.textSec, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>
            {t.label}
            {t.badge !== undefined && <span style={{ background: tab === t.id ? `${S.blue}30` : S.border, color: tab === t.id ? S.blue : S.textTer, fontSize: "10px", padding: "2px 7px", borderRadius: "6px", fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div>
          <AlertCard icon="🚪" title="No han ingresado" items={noLogin} color={S.red} bgColor={S.redBg}/>
          <AlertCard icon="👆" title="Sin swipes" items={noSwipe} color={S.yellow} bgColor={S.yellowBg}/>
          <AlertCard icon="💔" title="Sin matches" items={noMatch} color={S.purple} bgColor={S.purpleBg} onAction={onManualMatch}/>
          <AlertCard icon="💬" title="Matches sin conversacion" items={noConvo.map(m => allProfiles.find(p => p.id === m.id)).filter(Boolean)} color={S.blue} bgColor={S.blueBg}/>
          {total === 0 && <p style={{ textAlign: "center", color: S.textSec, padding: "40px 0", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Sin alertas</p>}
        </div>
      )}

      {tab === "stats" && (
        <div>
          <div style={{ background: S.card, borderRadius: "16px", padding: "18px", border: `1px solid ${S.border}`, marginBottom: "12px" }}>
            <h4 style={{ color: S.textSec, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Tematicas dominadas</h4>
            <Bar entries={Object.entries(expertCount)} max={allProfiles.length} color={S.blue}/>
          </div>
          <div style={{ background: S.card, borderRadius: "16px", padding: "18px", border: `1px solid ${S.border}` }}>
            <h4 style={{ color: S.textSec, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Lo que mas buscan</h4>
            <Bar entries={Object.entries(seekCount)} max={allProfiles.length} color={S.red}/>
          </div>
        </div>
      )}

      {tab === "people" && (
        <div>
          {/* View mode toggle + actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "4px", background: S.cardLight, borderRadius: "10px", padding: "3px" }}>
              <button onClick={() => setViewMode("cohort")} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "cohort" ? S.card : "transparent", color: viewMode === "cohort" ? S.blue : S.textSec, fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: viewMode === "cohort" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Cohorte</button>
              <button onClick={() => setViewMode("all")} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "all" ? S.card : "transparent", color: viewMode === "all" ? S.blue : S.textSec, fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: viewMode === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Todos ({allSystemProfiles.length})</button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {onImportUsers && <Btn variant="primary" style={{ padding: "8px 14px", fontSize: "12px" }} onClick={() => { setShowImportModal(true); setImportData([]); setImportError(null); setImportSuccess(null); }}>📥 Importar</Btn>}
              <Btn variant="outline" style={{ padding: "8px 14px", fontSize: "12px" }} onClick={exportCSV}>📤 Exportar</Btn>
            </div>
          </div>

          {/* Search and filters */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o email..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: `1.5px solid ${S.border}`, fontSize: "13px", color: S.text, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            {countries.length > 1 && (
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${S.border}`, fontSize: "12px", color: S.text, background: S.card, cursor: "pointer" }}>
                <option value="">Todos los paises</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <p style={{ fontSize: "11px", color: S.textTer, marginBottom: "8px" }}>{filteredProfiles.length} resultados</p>

          {/* Profile list */}
          {filteredProfiles.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.hasLoggedIn ? S.green : S.border, flexShrink: 0 }}/>
              <Avatar profile={p} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <p style={{ margin: 0, color: S.text, fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</p>
                  {p.isAdmin && <span style={{ fontSize: "9px", color: S.purple, background: S.purpleBg, padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>Admin</span>}
                </div>
                <p style={{ margin: 0, color: S.textTer, fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>
                  {p.email ? `${p.email} · ` : ""}{p.role || "Sin rol"} · {p.xp || 0} XP
                </p>
              </div>
              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                {/* Assign to cohort button */}
                {viewMode === "all" && onAddMemberToCohort && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setAssigningCohort(assigningCohort === p.id ? null : p.id)} style={{ padding: "5px 10px", borderRadius: "8px", background: S.greenBg, border: `1px solid ${S.green}30`, color: S.green, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>+ Cohorte</button>
                    {assigningCohort === p.id && (
                      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "4px", background: S.card, borderRadius: "12px", border: `1px solid ${S.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "8px", zIndex: 50, minWidth: "180px" }}>
                        {cohorts.map(c => (
                          <button key={c.id} onClick={() => handleAssignCohort(p.id, c.id)} style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: "8px", border: "none", background: "transparent", color: S.text, fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}
                            onMouseEnter={e => e.currentTarget.style.background = S.cardLight}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            {c.icon || "📋"} {c.name}
                          </button>
                        ))}
                        {cohorts.length === 0 && <p style={{ margin: 0, padding: "8px", fontSize: "11px", color: S.textTer }}>No hay cohortes</p>}
                      </div>
                    )}
                  </div>
                )}
                {/* Remove from cohort */}
                {viewMode === "cohort" && onRemoveMemberFromCohort && selectedCohortId && p.id !== currentUserId && (
                  <button onClick={() => handleRemoveFromCohort(p.id)} title="Quitar de cohorte" style={{ padding: "5px 10px", borderRadius: "8px", background: S.redBg, border: `1px solid ${S.red}30`, color: S.red, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>✕</button>
                )}
                <button onClick={() => onManualMatch(p)} style={{ padding: "5px 10px", borderRadius: "8px", background: S.blueBg, border: `1px solid ${S.blue}30`, color: S.blue, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>🎯</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "cohorts" && onCreateCohort && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: S.textSec, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{cohorts.length} cohortes</span>
            <Btn variant="primary" style={{ padding: "8px 14px", fontSize: "12px" }} onClick={() => {
              setEditingCohort(null);
              setCohortForm({ name: "", short_name: "", description: "", color: "#2851A3", icon: "📋" });
              setShowCohortModal(true);
            }}>+ Nueva cohorte</Btn>
          </div>
          {cohorts.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", marginBottom: "8px", background: S.card, borderRadius: "14px", border: `1px solid ${c.is_active ? S.border : S.red}30` }}>
              <span style={{ fontSize: "24px" }}>{c.icon || "📋"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ margin: 0, color: S.text, fontSize: "14px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{c.name}</p>
                  {!c.is_active && <span style={{ fontSize: "10px", color: S.red, background: S.redBg, padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>Inactiva</span>}
                </div>
                <p style={{ margin: "2px 0 0", color: S.textTer, fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>{c.description || "Sin descripcion"} · {c.memberCount || 0} miembros</p>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => {
                  setEditingCohort(c);
                  setCohortForm({ name: c.name, short_name: c.short_name || "", description: c.description || "", color: c.color || "#2851A3", icon: c.icon || "📋" });
                  setShowCohortModal(true);
                }} style={{ padding: "6px 12px", borderRadius: "8px", background: S.cardLight, border: `1px solid ${S.border}`, color: S.textSec, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>✏️</button>
                {onDeleteCohort && <button onClick={async () => {
                  if (confirm(`Eliminar la cohorte "${c.name}"? Se removeran ${c.memberCount || 0} miembros. Esta accion no se puede deshacer.`)) {
                    await onDeleteCohort(c.id);
                  }
                }} style={{ padding: "6px 12px", borderRadius: "8px", background: S.redBg, border: `1px solid ${S.red}30`, color: S.red, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort Modal */}
      {showCohortModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: S.card, borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "400px", maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, margin: "0 0 20px" }}>
              {editingCohort ? "Editar cohorte" : "Nueva cohorte"}
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.textSec, marginBottom: "6px", textTransform: "uppercase" }}>Nombre</label>
              <input value={cohortForm.name} onChange={e => setCohortForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Cohorte Guatemala 2026" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${S.border}`, fontSize: "14px", color: S.text, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.textSec, marginBottom: "6px", textTransform: "uppercase" }}>Nombre corto</label>
              <input value={cohortForm.short_name} onChange={e => setCohortForm(prev => ({ ...prev, short_name: e.target.value }))} placeholder="Ej: GT-2026" style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${S.border}`, fontSize: "14px", color: S.text, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.textSec, marginBottom: "6px", textTransform: "uppercase" }}>Descripcion</label>
              <textarea value={cohortForm.description} onChange={e => setCohortForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Descripcion de la cohorte..." rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${S.border}`, fontSize: "14px", color: S.text, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.textSec, marginBottom: "6px", textTransform: "uppercase" }}>Icono</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["📋", "🌎", "🚀", "💼", "🎯", "🌱", "⭐", "🔥"].map(icon => (
                  <button key={icon} type="button" onClick={() => setCohortForm(prev => ({ ...prev, icon }))} style={{ width: 44, height: 44, borderRadius: "12px", background: cohortForm.icon === icon ? S.blueBg : S.cardLight, border: `2px solid ${cohortForm.icon === icon ? S.blue : S.border}`, fontSize: "20px", cursor: "pointer" }}>{icon}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.textSec, marginBottom: "6px", textTransform: "uppercase" }}>Color</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["#2851A3", "#059669", "#7C3AED", "#E11D48", "#FFC800", "#D97706"].map(color => (
                  <button key={color} type="button" onClick={() => setCohortForm(prev => ({ ...prev, color }))} style={{ width: 44, height: 44, borderRadius: "50%", background: color, border: cohortForm.color === color ? `3px solid ${S.text}` : `3px solid transparent`, cursor: "pointer" }} />
                ))}
              </div>
            </div>
            {editingCohort && onUpdateCohort && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <button type="button" onClick={() => onUpdateCohort(editingCohort.id, { is_active: !editingCohort.is_active })} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: editingCohort.is_active ? S.green : S.border, position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: editingCohort.is_active ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}/>
                  </button>
                  <span style={{ fontSize: "13px", color: S.text, fontWeight: 500 }}>Cohorte activa</span>
                </label>
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button onClick={() => setShowCohortModal(false)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1.5px solid ${S.border}`, background: S.card, color: S.textSec, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button disabled={savingCohort || !cohortForm.name.trim()} onClick={async () => {
                setSavingCohort(true);
                if (editingCohort && onUpdateCohort) { await onUpdateCohort(editingCohort.id, cohortForm); }
                else if (onCreateCohort) { await onCreateCohort(cohortForm); }
                setSavingCohort(false);
                setShowCohortModal(false);
              }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: savingCohort ? S.textTer : S.blue, color: "#fff", fontSize: "14px", fontWeight: 600, cursor: savingCohort ? "not-allowed" : "pointer" }}>{savingCohort ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && onImportUsers && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: S.card, borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: S.text, margin: "0 0 20px" }}>Importar usuarios desde CSV</h3>
            {importSuccess !== null && (
              <div style={{ background: S.greenBg, border: `1px solid ${S.green}30`, borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ margin: 0, color: S.green, fontSize: "13px", fontWeight: 500 }}>{importSuccess} usuarios importados correctamente</p>
              </div>
            )}
            {importError && (
              <div style={{ background: S.redBg, border: `1px solid ${S.red}30`, borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ margin: 0, color: S.red, fontSize: "13px", fontWeight: 500 }}>{importError}</p>
              </div>
            )}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: S.textSec, marginBottom: "8px" }}>El archivo CSV debe tener las siguientes columnas: <strong>nombre, email</strong> (opcionales: pais, tipo de organizacion, tipo de trabajo, tu expertise, whatsapp, linkedin)</p>
              <input type="file" accept=".csv" onChange={handleFileImport} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: `1.5px solid ${S.border}`, fontSize: "14px" }} />
            </div>
            {importData.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", color: S.text, fontWeight: 600, marginBottom: "8px" }}>Vista previa: {importData.length} usuarios</p>
                <div style={{ maxHeight: "200px", overflow: "auto", background: S.cardLight, borderRadius: "12px", padding: "12px" }}>
                  {importData.slice(0, 5).map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${S.border}` : "none" }}>
                      <span style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{row.nombre}</span>
                      <span style={{ fontSize: "12px", color: S.textSec }}>{row.email}</span>
                    </div>
                  ))}
                  {importData.length > 5 && <p style={{ fontSize: "11px", color: S.textTer, textAlign: "center", margin: "8px 0 0" }}>... y {importData.length - 5} mas</p>}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowImportModal(false)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1.5px solid ${S.border}`, background: S.card, color: S.textSec, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button disabled={importing || importData.length === 0} onClick={async () => {
                setImporting(true);
                setImportError(null);
                try {
                  const result = await onImportUsers(importData);
                  if (result.error) { setImportError(result.error.message); }
                  else { setImportSuccess(result.count); setImportData([]); if (onRefreshProfiles) onRefreshProfiles(); }
                } catch (err) { setImportError("Error al importar usuarios"); }
                setImporting(false);
              }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: importing || importData.length === 0 ? S.textTer : S.blue, color: "#fff", fontSize: "14px", fontWeight: 600, cursor: importing || importData.length === 0 ? "not-allowed" : "pointer" }}>{importing ? "Importando..." : `Importar ${importData.length} usuarios`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
