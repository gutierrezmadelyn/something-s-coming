// @ts-nocheck
import { useState, useEffect } from "react";
import { Target, MessageCircle } from "lucide-react";
import { S } from "./styles";
import { Btn } from "./ui";

export default function MatchAnimation({ profile, icebreaker, onClose, onSendMessage }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", opacity: show ? 1 : 0, transition: "opacity 0.4s" }}>
      <div style={{ textAlign: "center", transform: show ? "scale(1)" : "scale(0.7)", transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)", maxWidth: "340px", padding: "0 20px" }}>
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}><Target size={48} color="#2851A3"/></div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", fontWeight: 700, color: S.text, marginBottom: "8px" }}>¡Es un Match!</h2>
        <p style={{ color: S.textSec, fontSize: "14px", marginBottom: "20px", fontFamily: "'DM Sans', sans-serif" }}>Tú y <strong style={{ color: S.text }}>{profile.name}</strong> quieren conectar</p>
        <div style={{ background: S.blueBg, border: `2px solid ${S.blue}30`, borderRadius: "16px", padding: "14px", marginBottom: "20px", textAlign: "left" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", color: S.blue, letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}><MessageCircle size={16}/> Pregunta rompehielo</p>
          <p style={{ color: S.text, fontSize: "13px", margin: 0, lineHeight: 1.5, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>"{icebreaker}"</p>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Btn onClick={onClose} variant="outline">Seguir explorando</Btn>
          <Btn onClick={onSendMessage || onClose} variant="primary">Enviar mensaje</Btn>
        </div>
      </div>
    </div>
  );
}
