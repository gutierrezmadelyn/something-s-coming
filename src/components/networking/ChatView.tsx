// @ts-nocheck
import { useState } from "react";
import { useConversation } from "@/hooks/useMatches";
import { S } from "./styles";
import { Avatar, Btn } from "./ui";

export default function ChatView({ profile, icebreaker, onBack, conversationId, currentUserId }) {
  const [input, setInput] = useState("");
  const { messages: dbMessages, loading, sendMessage } = useConversation(conversationId, currentUserId);

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
            <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
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
