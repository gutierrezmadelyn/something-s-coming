// @ts-nocheck
import { useState } from "react";
import { S } from "./styles";
import { Avatar } from "./ui";
import { Target, Loader, Check, X } from "lucide-react";

// Format time for WhatsApp-style display
const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Ayer";
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }
};

// Truncate message for preview - adaptive based on screen
const truncateMessage = (text: string | null, maxLength: number = 35): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

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
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmUnmatch(prev => prev === matchId ? null : prev), 3000);
    }
  };

  // Filter matches that have valid profiles
  const validMatches = matches.filter(m => {
    const profile = allProfiles.find(x => x.id === m.id);
    return profile != null;
  });

  if (!matches.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ marginBottom: "12px" }}><Target size={48} color={S.textTer} strokeWidth={1.5}/></div>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>Aun no tienes matches</h3>
      <p style={{ fontSize: "14px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>Explora perfiles y conecta con personas de tu interes</p>
    </div>
  );

  if (matches.length > 0 && validMatches.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ marginBottom: "12px" }}><Loader size={48} color={S.textTer} strokeWidth={1.5}/></div>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "20px", color: S.text }}>Cargando...</h3>
      <p style={{ fontSize: "14px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>Por favor espera</p>
    </div>
  );

  const totalUnread = validMatches.reduce((sum, m) => sum + (m.unreadCount || 0), 0);

  return (
    <div style={{ padding: "12px 0" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
        padding: "0 2px",
      }}>
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "18px",
          fontWeight: 700,
          color: S.text,
          margin: 0
        }}>
          Conexiones ({validMatches.length})
        </h3>
        {totalUnread > 0 && (
          <span style={{
            background: S.green,
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif"
          }}>
            {totalUnread} nuevo{totalUnread > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Chat list */}
      {validMatches.map(m => {
        const p = allProfiles.find(x => x.id === m.id);
        const showLocation = p.showLocation !== false;
        const isConfirming = confirmUnmatch === m.matchId;
        const hasUnread = (m.unreadCount || 0) > 0;
        const lastMessage = m.lastMessage;
        const lastMessageTime = m.lastMessageAt || m.created_at;

        // Determine message preview text
        let previewText = "";
        if (lastMessage) {
          const isOwnMessage = lastMessage.sender_id !== m.id;
          previewText = isOwnMessage ? `Tu: ${truncateMessage(lastMessage.content)}` : truncateMessage(lastMessage.content);
        } else {
          previewText = `${p.role || 'Sin rol'}${showLocation && p.city ? ` · ${p.city}` : ''}`;
        }

        return (
          <div
            key={m.id}
            onClick={() => onOpenChat(m)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 10px",
              marginBottom: "4px",
              background: hasUnread ? `${S.green}08` : S.card,
              borderRadius: "14px",
              border: `1px solid ${isConfirming ? S.red : hasUnread ? `${S.green}30` : S.border}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Avatar with badge */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar profile={p} size={50}/>
              {hasUnread && (
                <span style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 20,
                  height: 20,
                  background: S.green,
                  color: "#fff",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                  fontFamily: "'DM Sans', sans-serif",
                  border: `2px solid ${hasUnread ? `${S.green}08` : S.card}`,
                }}>
                  {m.unreadCount > 99 ? "99+" : m.unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              {/* Name and time row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                marginBottom: "2px",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                }}>
                  <span style={{
                    color: S.text,
                    fontSize: "15px",
                    fontWeight: hasUnread ? 700 : 600,
                    fontFamily: "'DM Sans', sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {p.name}
                  </span>
                  {m.type === "cupido" && (
                    <span style={{
                      fontSize: "9px",
                      color: S.blue,
                      background: S.blueBg,
                      padding: "2px 5px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      <Target size={8} style={{ display: "inline", verticalAlign: "middle" }}/>
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: "11px",
                  color: hasUnread ? S.green : S.textTer,
                  fontWeight: hasUnread ? 600 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {formatMessageTime(lastMessageTime)}
                </span>
              </div>

              {/* Preview text */}
              <p style={{
                margin: 0,
                color: hasUnread ? S.text : S.textTer,
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: hasUnread ? 500 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.3,
              }}>
                {previewText}
              </p>
            </div>

            {/* Delete button */}
            {m.matchId && onUnmatch && (
              <button
                onClick={(e) => handleUnmatch(e, m.matchId)}
                disabled={unmatching}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isConfirming ? S.red : "transparent",
                  border: `1.5px solid ${isConfirming ? S.red : S.border}`,
                  color: isConfirming ? "#fff" : S.textTer,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: unmatching ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  opacity: isConfirming ? 1 : 0.5,
                }}
              >
                {unmatching ? "..." : isConfirming ? <Check size={12}/> : <X size={12}/>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
