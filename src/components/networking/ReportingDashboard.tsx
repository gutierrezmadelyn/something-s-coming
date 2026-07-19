// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  Activity, ArrowDownToLine, Clock3, Download, FileJson, Filter,
  HeartHandshake, Loader2, MessageCircle, Network, Printer, RefreshCw,
  Send, Sparkles, Users, X,
} from "lucide-react";

const COLORS = ["#2851A3", "#16A085", "#7C3AED", "#E67E22", "#DC4C64", "#0891B2", "#64748B"];
const css = {
  card: { background: "#fff", border: "1px solid #E6EAF0", borderRadius: 18, boxShadow: "0 8px 28px rgba(27,44,79,.06)" },
  label: { color: "#718096", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" },
};

const n = (value) => Number(value || 0);
const pct = (value, total) => total ? Math.round((value / total) * 100) : 0;
const day = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
const inRange = (value, from, to) => {
  if (!value) return false;
  const d = day(value);
  return (!from || d >= from) && (!to || d <= to);
};
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function download(filename, content, type = "text/csv;charset=utf-8") {
  const blob = new Blob([type.includes("csv") ? "\uFEFF" + content : content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function Kpi({ icon: Icon, label, value, detail, color }) {
  return <div style={{ ...css.card, padding: 16, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={css.label}>{label}</span>
      <span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", color, background: `${color}14` }}><Icon size={15}/></span>
    </div>
    <div style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 850, color: "#16213A", marginTop: 7 }}>{value}</div>
    <div style={{ fontSize: 11, color: "#8993A4", marginTop: 5 }}>{detail}</div>
  </div>;
}

function Section({ title, subtitle, children, action }) {
  return <section style={{ ...css.card, padding: 18, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 15 }}>
      <div><h4 style={{ margin: 0, color: "#16213A", fontSize: 15 }}>{title}</h4>{subtitle && <p style={{ margin: "4px 0 0", color: "#8993A4", fontSize: 11 }}>{subtitle}</p>}</div>
      {action}
    </div>{children}
  </section>;
}

function NetworkGraph({ nodes, edges }) {
  const layout = useMemo(() => {
    const ranked = [...nodes].sort((a,b) => b.connections - a.connections).slice(0, 35);
    const ids = new Set(ranked.map(x => x.id));
    const centerX = 350, centerY = 205;
    return ranked.map((node, i) => {
      const ring = i < 8 ? 1 : i < 22 ? 2 : 3;
      const ringItems = ranked.filter((_, j) => (j < 8 ? 1 : j < 22 ? 2 : 3) === ring).length;
      const ringIndex = ranked.slice(0, i).filter((_, j) => (j < 8 ? 1 : j < 22 ? 2 : 3) === ring).length;
      const radius = ring === 1 ? 82 : ring === 2 ? 145 : 188;
      const angle = (Math.PI * 2 * ringIndex / Math.max(ringItems, 1)) - Math.PI / 2;
      return { ...node, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, ids };
    });
  }, [nodes]);
  const byId = new Map(layout.map(x => [x.id, x]));
  if (!layout.length) return <div style={{ height: 300, display: "grid", placeItems: "center", color: "#8993A4" }}>Aún no hay conexiones para mostrar.</div>;
  return <div style={{ overflowX: "auto" }}><svg viewBox="0 0 700 410" style={{ width: "100%", minWidth: 560, height: 410 }} role="img" aria-label="Grafo de conexiones">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {edges.map((edge, i) => {
      const a = byId.get(edge.source), b = byId.get(edge.target); if (!a || !b) return null;
      return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edge.messages ? "#2851A3" : "#B9C3D3"} strokeOpacity={edge.messages ? .35 : .18} strokeWidth={Math.min(1 + Math.sqrt(edge.messages || 1), 8)}/>;
    })}
    {layout.map((node, i) => <g key={node.id} transform={`translate(${node.x},${node.y})`}>
      <circle r={Math.min(9 + node.connections * 1.5, 24)} fill={COLORS[i % COLORS.length]} opacity=".92" filter={i < 5 ? "url(#glow)" : undefined}/>
      <text y={Math.min(9 + node.connections * 1.5, 24) + 13} textAnchor="middle" fontSize="9" fontWeight="700" fill="#526071">{node.name?.split(" ")[0]}</text>
      <title>{node.name}: {node.connections} conexiones, {node.messages} mensajes</title>
    </g>)}
  </svg></div>;
}

export default function ReportingDashboard({ profiles = [], cohortName = "", selectedCohortId = null }) {
  const [raw, setRaw] = useState({ matches: [], conversations: [], messages: [], swipes: [], receipts: [], xp: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [networkMode, setNetworkMode] = useState("messages");

  const load = useCallback(async () => {
    const ids = profiles.map(p => p.id).filter(Boolean);
    if (!ids.length) { setRaw({ matches: [], conversations: [], messages: [], swipes: [], receipts: [], xp: [] }); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [matchesRes, swipesRes, xpRes] = await Promise.all([
        supabase.from("matches").select("*").or(ids.map(id => `user_id.eq.${id}`).join(",")),
        supabase.from("swipes").select("*").in("user_id", ids),
        supabase.from("xp_log").select("*").in("user_id", ids),
      ]);
      if (matchesRes.error) throw matchesRes.error;
      const matches = (matchesRes.data || []).filter(m => ids.includes(m.user_id) && ids.includes(m.matched_user_id));
      const convRes = matches.length ? await supabase.from("conversations").select("*").in("match_id", matches.map(m => m.id)) : { data: [] };
      const conversations = convRes.data || [];
      const [msgRes, receiptRes] = conversations.length ? await Promise.all([
        supabase.from("messages").select("id,conversation_id,sender_id,message_type,created_at").in("conversation_id", conversations.map(c => c.id)),
        supabase.from("read_receipts").select("conversation_id,user_id,last_read_at").in("conversation_id", conversations.map(c => c.id)),
      ]) : [{ data: [] }, { data: [] }];
      setRaw({ matches, conversations, messages: msgRes.data || [], swipes: swipesRes.data || [], receipts: receiptRes.data || [], xp: xpRes.data || [] });
    } catch (e) { setError(e?.message || "No fue posible cargar la reportería"); }
    finally { setLoading(false); }
  }, [profiles]);
  useEffect(() => { load(); }, [load, selectedCohortId]);

  const report = useMemo(() => {
    const ids = new Set(profiles.map(p => p.id));
    const matches = raw.matches.filter(x => inRange(x.created_at, from, to));
    const conversations = raw.conversations.filter(x => inRange(x.started_at, from, to));
    const messages = raw.messages.filter(x => inRange(x.created_at, from, to));
    const swipes = raw.swipes.filter(x => inRange(x.created_at, from, to));
    const convById = new Map(raw.conversations.map(x => [x.id, x]));
    const matchById = new Map(raw.matches.map(x => [x.id, x]));
    const profileById = new Map(profiles.map(x => [x.id, x]));
    const msgByConv = new Map();
    messages.forEach(m => msgByConv.set(m.conversation_id, [...(msgByConv.get(m.conversation_id) || []), m]));
    const pairs = conversations.map(c => {
      const mt = matchById.get(c.match_id); if (!mt) return null;
      const msgs = (msgByConv.get(c.id) || []).sort((a,b) => +new Date(a.created_at) - +new Date(b.created_at));
      const sentA = msgs.filter(m => m.sender_id === mt.user_id).length;
      const sentB = msgs.filter(m => m.sender_id === mt.matched_user_id).length;
      const first = msgs[0], secondPartyReply = first && msgs.find(m => m.sender_id !== first.sender_id);
      return { conversationId: c.id, matchId: mt.id, a: mt.user_id, b: mt.matched_user_id, nameA: profileById.get(mt.user_id)?.name || "—", nameB: profileById.get(mt.matched_user_id)?.name || "—", messages: msgs.length, sentA, sentB, reciprocal: sentA > 0 && sentB > 0, firstSender: first?.sender_id, responseMinutes: first && secondPartyReply ? Math.round((+new Date(secondPartyReply.created_at) - +new Date(first.created_at)) / 60000) : null, startedAt: c.started_at, lastAt: msgs.at(-1)?.created_at || c.last_message_at };
    }).filter(Boolean);
    const person = profiles.map(p => {
      const personMatches = matches.filter(m => m.user_id === p.id || m.matched_user_id === p.id);
      const sent = messages.filter(m => m.sender_id === p.id).length;
      const received = pairs.reduce((sum, pair) => sum + (pair.a === p.id ? pair.sentB : pair.b === p.id ? pair.sentA : 0), 0);
      const contacted = new Set(pairs.filter(pair => (pair.a === p.id || pair.b === p.id) && pair.messages).map(pair => pair.a === p.id ? pair.b : pair.a));
      const responses = pairs.filter(pair => pair.firstSender === p.id && pair.reciprocal).length;
      const initiated = pairs.filter(pair => pair.firstSender === p.id).length;
      return { ...p, matches: personMatches.length, sent, received, contacts: contacted.size, responseRate: pct(responses, initiated), complete: !!(p.pitch && p.expertise?.length && p.offers?.length && p.seeks?.length) };
    });
    const nodes = person.map(p => ({ id: p.id, name: p.name, connections: p.matches, messages: p.sent + p.received }));
    const edges = networkMode === "interest"
      ? swipes.filter(s => s.direction === "right" && ids.has(s.swiped_user_id)).map(s => ({ source: s.user_id, target: s.swiped_user_id, messages: 0 }))
      : matches.map(m => { const pair = pairs.find(p => p.matchId === m.id); return { source: m.user_id, target: m.matched_user_id, messages: pair?.messages || 0 }; });
    const dates = {};
    const bump = (date, field) => { const d = day(date); if (!d) return; dates[d] ||= { date: d, swipes: 0, matches: 0, messages: 0 }; dates[d][field]++; };
    swipes.forEach(x => bump(x.created_at, "swipes")); matches.forEach(x => bump(x.created_at, "matches")); messages.forEach(x => bump(x.created_at, "messages"));
    const activity = Object.values(dates).sort((a,b) => a.date.localeCompare(b.date));
    const distribution = (field) => Object.entries(profiles.reduce((acc,p) => { const key = p[field] || "Sin dato"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name,value]) => ({ name, value })).sort((a,b) => b.value-a.value);
    const positive = swipes.filter(s => s.direction === "right").length;
    const conversationsWithMessages = pairs.filter(p => p.messages > 0).length;
    const reciprocal = pairs.filter(p => p.reciprocal).length;
    const responseTimes = pairs.map(p => p.responseMinutes).filter(x => x !== null).sort((a,b) => a-b);
    const medianResponse = responseTimes.length ? responseTimes[Math.floor(responseTimes.length / 2)] : null;
    return { matches, conversations, messages, swipes, pairs, person, nodes, edges, activity, countries: distribution("country"), roles: distribution("role"), positive, conversationsWithMessages, reciprocal, medianResponse };
  }, [profiles, raw, from, to, networkMode]);

  const exportParticipants = () => {
    const h = ["Nombre","Email","País","Ciudad","Organización","Tipo de trabajo","Ingresó","Perfil completo","Swipes","Matches","Contactos únicos","Mensajes enviados","Mensajes recibidos","Tasa respuesta"];
    const rows = report.person.map(p => [p.name,p.email,p.country,p.city,p.role,p.workType,p.hasLoggedIn?"Sí":"No",p.complete?"Sí":"No",p.swipeCount,p.matches,p.contacts,p.sent,p.received,`${p.responseRate}%`]);
    download(`reporte_participantes_${day(new Date())}.csv`, [h,...rows].map(r => r.map(csvCell).join(",")).join("\n"));
  };
  const exportRelationships = () => {
    const h = ["Participante A","Participante B","Mensajes A→B","Mensajes B→A","Mensajes totales","Recíproca","Tiempo respuesta (min)","Inicio","Última actividad"];
    const rows = report.pairs.map(p => [p.nameA,p.nameB,p.sentA,p.sentB,p.messages,p.reciprocal?"Sí":"No",p.responseMinutes,p.startedAt,p.lastAt]);
    download(`reporte_relaciones_${day(new Date())}.csv`, [h,...rows].map(r => r.map(csvCell).join(",")).join("\n"));
  };
  const exportActivity = () => download(`reporte_actividad_${day(new Date())}.csv`, [["Fecha","Swipes","Matches","Mensajes"],...report.activity.map(x => [x.date,x.swipes,x.matches,x.messages])].map(r => r.map(csvCell).join(",")).join("\n"));
  const exportJson = () => download(`reporte_integral_${day(new Date())}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), cohort: cohortName, filters: { from, to }, summary: { participants: profiles.length, matches: report.matches.length, messages: report.messages.length }, participants: report.person, relationships: report.pairs, activity: report.activity }, null, 2), "application/json");

  if (loading) return <div style={{ ...css.card, minHeight: 380, display: "grid", placeItems: "center", color: "#526071" }}><div style={{ textAlign: "center" }}><Loader2 size={30} style={{ animation: "spin 1s linear infinite" }}/><p>Cargando inteligencia de la red…</p></div></div>;
  if (error) return <div style={{ ...css.card, padding: 24, color: "#B42318" }}><b>No se pudo cargar la reportería.</b><p style={{ fontSize: 12 }}>{error}</p><button onClick={load}>Reintentar</button></div>;

  const funnel = [
    { name: "Registrados", value: profiles.length, color: "#2851A3" },
    { name: "Ingresaron", value: profiles.filter(p => p.hasLoggedIn).length, color: "#3B72C4" },
    { name: "Exploraron", value: report.person.filter(p => n(p.swipeCount) > 0).length, color: "#16A085" },
    { name: "Con match", value: report.person.filter(p => p.matches > 0).length, color: "#7C3AED" },
    { name: "Conversaron", value: report.person.filter(p => p.sent + p.received > 0).length, color: "#E67E22" },
  ];

  return <div className="reporting-dashboard" style={{ fontFamily: "'DM Sans', sans-serif", color: "#16213A" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media print{body *{visibility:hidden}.reporting-dashboard,.reporting-dashboard *{visibility:visible}.reporting-dashboard{position:absolute;inset:0}.report-actions,.report-filters{display:none!important}}`}</style>
    <div style={{ background: "linear-gradient(135deg,#132B55 0%,#2851A3 58%,#218C8D 120%)", borderRadius: 22, padding: "22px 20px", color: "white", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -35, top: -55, width: 180, height: 180, borderRadius: "50%", border: "35px solid rgba(255,255,255,.06)" }}/>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14, position: "relative" }}>
        <div><div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", opacity: .75 }}><Sparkles size={13}/> NETWORK INTELLIGENCE</div><h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 25, margin: "6px 0 4px" }}>Reporte integral de networking</h3><p style={{ margin: 0, fontSize: 12, opacity: .78 }}>{cohortName || "Todos los participantes"} · Datos actualizados al {new Date().toLocaleDateString("es-GT")}</p></div>
        <div className="report-actions" style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
          {[{ icon: Download, text: "Participantes", fn: exportParticipants },{ icon: Network, text: "Relaciones", fn: exportRelationships },{ icon: Activity, text: "Actividad", fn: exportActivity },{ icon: FileJson, text: "JSON", fn: exportJson },{ icon: Printer, text: "Imprimir / PDF", fn: () => window.print() }].map(({icon:Icon,text,fn}) => <button key={text} onClick={fn} style={{ border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)", color: "white", padding: "8px 10px", borderRadius: 10, display: "flex", gap: 5, alignItems: "center", cursor: "pointer", fontSize: 10, fontWeight: 700 }}><Icon size={13}/>{text}</button>)}
        </div>
      </div>
    </div>

    <div className="report-filters" style={{ ...css.card, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
      <Filter size={15} color="#2851A3"/><b style={{ fontSize: 11 }}>Periodo de análisis</b>
      <label style={{ fontSize: 10, color: "#718096" }}>Desde <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ marginLeft: 5, border: "1px solid #DCE2EA", borderRadius: 8, padding: 6 }}/></label>
      <label style={{ fontSize: 10, color: "#718096" }}>Hasta <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ marginLeft: 5, border: "1px solid #DCE2EA", borderRadius: 8, padding: 6 }}/></label>
      {(from||to) && <button onClick={()=>{setFrom("");setTo("");}} style={{ border: 0, background: "#EDF2F7", borderRadius: 8, padding: 7, cursor: "pointer" }}><X size={13}/></button>}
      <button onClick={load} title="Actualizar" style={{ marginLeft: "auto", border: 0, color: "#2851A3", background: "#EEF4FF", borderRadius: 9, padding: 8, cursor: "pointer" }}><RefreshCw size={14}/></button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 14 }}>
      <Kpi icon={Users} label="Participantes" value={profiles.length} detail={`${pct(profiles.filter(p=>p.hasLoggedIn).length, profiles.length)}% activados`} color="#2851A3"/>
      <Kpi icon={HeartHandshake} label="Matches" value={report.matches.length} detail={`${pct(report.conversations.length, report.matches.length)}% abrieron chat`} color="#16A085"/>
      <Kpi icon={MessageCircle} label="Mensajes" value={report.messages.length} detail={`${report.pairs.length ? (report.messages.length/report.pairs.length).toFixed(1) : 0} por conversación`} color="#7C3AED"/>
      <Kpi icon={Send} label="Reciprocidad" value={`${pct(report.reciprocal, report.conversationsWithMessages)}%`} detail={`${report.reciprocal} conversaciones bilaterales`} color="#E67E22"/>
      <Kpi icon={Clock3} label="Respuesta mediana" value={report.medianResponse === null ? "—" : report.medianResponse < 60 ? `${report.medianResponse}m` : `${(report.medianResponse/60).toFixed(1)}h`} detail="Primera respuesta de la contraparte" color="#DC4C64"/>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12, marginBottom: 12 }}>
      <Section title="Embudo de participación" subtitle="Conversión desde registro hasta conversación real">
        <div>{funnel.map((x,i)=><div key={x.name} style={{ marginBottom: 11 }}><div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4 }}><b>{x.name}</b><span>{x.value} · {pct(x.value,profiles.length)}%</span></div><div style={{height:10,background:"#EDF1F5",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${pct(x.value,profiles.length)}%`,background:x.color,borderRadius:8}}/></div>{i<funnel.length-1&&<div style={{fontSize:9,color:"#9AA4B2",textAlign:"right",marginTop:2}}>{pct(funnel[i+1].value,x.value)}% pasa a la siguiente etapa</div>}</div>)}</div>
      </Section>
      <Section title="Actividad en el tiempo" subtitle="Swipes, matches y mensajes por día">
        <ResponsiveContainer width="100%" height={265}><AreaChart data={report.activity}><defs><linearGradient id="msg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2851A3" stopOpacity={.35}/><stop offset="95%" stopColor="#2851A3" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5"/><XAxis dataKey="date" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Area type="monotone" dataKey="messages" name="Mensajes" stroke="#2851A3" fill="url(#msg)"/><Area type="monotone" dataKey="swipes" name="Swipes" stroke="#16A085" fill="transparent"/><Area type="monotone" dataKey="matches" name="Matches" stroke="#E67E22" fill="transparent"/></AreaChart></ResponsiveContainer>
      </Section>
    </div>

    <Section title="Mapa de relaciones" subtitle="El tamaño del nodo indica conexiones; el grosor del vínculo indica mensajes" action={<div style={{display:"flex",background:"#EEF2F6",borderRadius:9,padding:3}}>{[["messages","Matches y mensajes"],["interest","Interés positivo"]].map(([id,label])=><button key={id} onClick={()=>setNetworkMode(id)} style={{border:0,borderRadius:7,padding:"6px 9px",fontSize:9,fontWeight:700,cursor:"pointer",background:networkMode===id?"#fff":"transparent",color:networkMode===id?"#2851A3":"#718096",boxShadow:networkMode===id?"0 2px 8px #CCD3DD":"none"}}>{label}</button>)}</div>}>
      <NetworkGraph nodes={report.nodes} edges={report.edges}/>
      <div style={{ display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",fontSize:10,color:"#718096" }}><span>● Nodo grande = más conexiones</span><span>━ Línea gruesa = más mensajes</span><span>Máximo 35 participantes más conectados</span></div>
    </Section>

    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:12,marginTop:12 }}>
      <Section title="Distribución geográfica" subtitle="Participantes por país"><ResponsiveContainer width="100%" height={260}><BarChart data={report.countries.slice(0,8)} layout="vertical" margin={{left:15}}><CartesianGrid strokeDasharray="3 3" stroke="#EDF1F5"/><XAxis type="number" tick={{fontSize:9}}/><YAxis dataKey="name" type="category" width={100} tick={{fontSize:9}}/><Tooltip/><Bar dataKey="value" name="Participantes" radius={[0,7,7,0]}>{report.countries.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></Section>
      <Section title="Tipo de organización" subtitle="Composición de la cohorte"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={report.roles.slice(0,7)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={3}>{report.roles.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend iconType="circle" wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer></Section>
    </div>

    <div style={{ marginTop:12 }}><Section title="Participación individual" subtitle="Indicadores accionables ordenados por actividad" action={<button onClick={exportParticipants} style={{border:0,background:"#EEF4FF",color:"#2851A3",borderRadius:9,padding:"7px 10px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",gap:5}}><ArrowDownToLine size={13}/>CSV</button>}>
      <div style={{overflowX:"auto",maxHeight:430}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead style={{position:"sticky",top:0,background:"#F7F9FC",zIndex:1}}><tr>{["Participante","País","Ingreso","Swipes","Matches","Contactos","Enviados","Recibidos","Respuesta"].map(h=><th key={h} style={{padding:"9px 8px",textAlign:h==="Participante"?"left":"center",color:"#718096",fontSize:9,textTransform:"uppercase",letterSpacing:".04em"}}>{h}</th>)}</tr></thead><tbody>{[...report.person].sort((a,b)=>(b.sent+b.received)-(a.sent+a.received)).map(p=><tr key={p.id} style={{borderBottom:"1px solid #EDF1F5"}}><td style={{padding:"9px 8px",fontWeight:700}}>{p.name}<div style={{fontSize:9,color:"#9AA4B2",fontWeight:400}}>{p.role||"Sin organización"}</div></td><td style={{textAlign:"center"}}>{p.country||"—"}</td><td style={{textAlign:"center",color:p.hasLoggedIn?"#16A085":"#B3BBC7"}}>●</td><td style={{textAlign:"center"}}>{p.swipeCount||0}</td><td style={{textAlign:"center",fontWeight:700,color:"#16A085"}}>{p.matches}</td><td style={{textAlign:"center"}}>{p.contacts}</td><td style={{textAlign:"center",color:"#2851A3"}}>{p.sent}</td><td style={{textAlign:"center",color:"#7C3AED"}}>{p.received}</td><td style={{textAlign:"center"}}>{p.responseRate}%</td></tr>)}</tbody></table></div>
    </Section></div>

    <div style={{ marginTop:12 }}><Section title="Relaciones y conversaciones" subtitle="Intercambio por pareja sin exponer el contenido de los mensajes" action={<button onClick={exportRelationships} style={{border:0,background:"#EEF4FF",color:"#2851A3",borderRadius:9,padding:"7px 10px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",gap:5}}><ArrowDownToLine size={13}/>CSV</button>}>
      <div style={{overflowX:"auto",maxHeight:390}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead style={{position:"sticky",top:0,background:"#F7F9FC"}}><tr>{["Relación","A → B","B → A","Total","Recíproca","1ª respuesta","Última actividad"].map(h=><th key={h} style={{padding:9,textAlign:h==="Relación"?"left":"center",fontSize:9,color:"#718096",textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{[...report.pairs].sort((a,b)=>b.messages-a.messages).map(p=><tr key={p.conversationId} style={{borderBottom:"1px solid #EDF1F5"}}><td style={{padding:9,fontWeight:700}}>{p.nameA} ↔ {p.nameB}</td><td style={{textAlign:"center"}}>{p.sentA}</td><td style={{textAlign:"center"}}>{p.sentB}</td><td style={{textAlign:"center",fontWeight:800,color:"#2851A3"}}>{p.messages}</td><td style={{textAlign:"center",color:p.reciprocal?"#16A085":"#B3BBC7"}}>{p.reciprocal?"Sí":"No"}</td><td style={{textAlign:"center"}}>{p.responseMinutes===null?"—":p.responseMinutes<60?`${p.responseMinutes} min`:`${(p.responseMinutes/60).toFixed(1)} h`}</td><td style={{textAlign:"center"}}>{p.lastAt?new Date(p.lastAt).toLocaleDateString("es-GT"):"—"}</td></tr>)}</tbody></table></div>
    </Section></div>
    <p style={{textAlign:"center",fontSize:9,color:"#9AA4B2",margin:"14px 0 0"}}>Reporte basado en metadatos de interacción. El contenido privado de los mensajes no se consulta ni se exporta.</p>
  </div>;
}
