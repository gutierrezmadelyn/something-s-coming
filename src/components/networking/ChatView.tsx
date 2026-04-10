// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { useConversation } from "@/hooks/useMatches";
import { ArrowLeft, Send, Check, CheckCheck, Smile, ChevronUp, Loader, ChevronDown, ExternalLink } from "lucide-react";
import { S } from "./styles";
import { Avatar, Btn } from "./ui";
import EmojiPicker from "./EmojiPicker";

// Format time for message display (HH:mm)
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

// Format date for message grouping
const formatDateDivider = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) return "Hoy";
  if (messageDate.getTime() === yesterday.getTime()) return "Ayer";
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Check if two dates are different days
const isDifferentDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() !== d2.toDateString();
};

// Message bubble component
function MessageBubble({ message, isOwn, isRead, showTimestamp = true }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: isOwn ? "flex-end" : "flex-start",
      padding: "2px 12px",
    }}>
      <div style={{
        background: isOwn
          ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
          : S.card,
        borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "10px 14px",
        maxWidth: "78%",
        boxShadow: isOwn
          ? "0 1px 2px rgba(5, 150, 105, 0.2)"
          : "0 1px 2px rgba(0,0,0,0.05)",
        border: isOwn ? "none" : `1px solid ${S.border}`,
      }}>
        <p style={{
          color: isOwn ? "#fff" : S.text,
          fontSize: "15px",
          margin: 0,
          lineHeight: 1.45,
          fontFamily: "'DM Sans', sans-serif",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}>
          {message.text}
        </p>
        {showTimestamp && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "3px",
            marginTop: "4px",
          }}>
            <span style={{
              fontSize: "10px",
              color: isOwn ? "rgba(255,255,255,0.75)" : S.textTer,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {formatTime(message.created_at)}
            </span>
            {isOwn && (
              <span style={{
                color: isRead ? "#86EFAC" : "rgba(255,255,255,0.6)",
                display: "flex",
                marginLeft: "2px"
              }}>
                {isRead ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} />}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Date divider component
function DateDivider({ date }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "12px 0 8px",
    }}>
      <span style={{
        fontSize: "11px",
        color: S.textSec,
        background: S.cardLight,
        padding: "5px 14px",
        borderRadius: "12px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}>
        {formatDateDivider(date)}
      </span>
    </div>
  );
}

// Quick chat switcher component
function ChatSwitcher({ matches, currentChatId, onSelectChat, allProfiles }) {
  const [isOpen, setIsOpen] = useState(false);

  const otherMatches = matches.filter(m => m.id !== currentChatId);
  if (otherMatches.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          background: S.cardLight,
          border: `1px solid ${S.border}`,
          borderRadius: "6px",
          padding: "5px 8px",
          fontSize: "10px",
          color: S.textSec,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
        }}
      >
        <ChevronDown size={10} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
            }}
          />
          {/* Dropdown */}
          <div style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            background: S.card,
            borderRadius: "12px",
            border: `1px solid ${S.border}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            maxHeight: "280px",
            overflowY: "auto",
            minWidth: "220px",
            zIndex: 100,
          }}>
            <div style={{ padding: "8px" }}>
              <p style={{
                fontSize: "10px",
                color: S.textTer,
                padding: "4px 8px",
                margin: 0,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Otras conversaciones
              </p>
              {otherMatches.slice(0, 8).map(m => {
                const profile = allProfiles.find(p => p.id === m.id);
                if (!profile) return null;
                const hasUnread = (m.unreadCount || 0) > 0;

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectChat(m);
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "8px",
                      background: hasUnread ? `${S.green}08` : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.15s",
                    }}
                  >
                    <Avatar profile={profile} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: hasUnread ? 700 : 500,
                        color: S.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {profile.name}
                      </p>
                      {m.lastMessage && (
                        <p style={{
                          margin: 0,
                          fontSize: "11px",
                          color: S.textTer,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {m.lastMessage.content.substring(0, 25)}...
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <span style={{
                        minWidth: 18,
                        height: 18,
                        background: S.green,
                        color: "#fff",
                        borderRadius: "9px",
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 5px",
                      }}>
                        {m.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatView({
  profile,
  icebreaker,
  onBack,
  conversationId,
  currentUserId,
  // New props for chat switching
  allMatches = [],
  allProfiles = [],
  onSwitchChat,
}) {
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const {
    messages: dbMessages,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    loadMore,
    isMessageRead
  } = useConversation(conversationId, currentUserId);

  const displayMessages = [
    { from: "system", text: icebreaker, id: "icebreaker", created_at: null },
    ...dbMessages.map(m => ({
      from: m.sender_id === currentUserId ? "me" : "them",
      text: m.content,
      id: m.id,
      created_at: m.created_at,
    }))
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [dbMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && dbMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  // Maintain scroll position when loading more
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore) return;

    if (prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [dbMessages, loadingMore]);

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;

    if (container.scrollTop < 80) {
      prevScrollHeightRef.current = container.scrollHeight;
      loadMore();
    }
  }, [loadMore, loadingMore, hasMore]);

  const send = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    setShowEmojiPicker(false);
    await sendMessage(content);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      background: S.bg,
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        background: S.card,
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: S.textSec,
            cursor: "pointer",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            borderRadius: "8px",
            transition: "background 0.15s",
          }}
        >
          <ArrowLeft size={20}/>
        </button>

        <Avatar profile={profile} size={38}/>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            color: S.text,
            fontSize: "15px",
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {profile.name}
          </p>
          <p style={{
            margin: 0,
            color: S.textTer,
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {profile.role}{showLocation && profile.city ? ` · ${profile.city}` : ''}
          </p>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {/* Chat switcher */}
          {allMatches.length > 1 && onSwitchChat && (
            <ChatSwitcher
              matches={allMatches}
              currentChatId={profile.id}
              onSelectChat={onSwitchChat}
              allProfiles={allProfiles}
            />
          )}

          {/* Contact buttons */}
          {profile.linkedin && (
            <a
              href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: S.blueBg,
                border: `1px solid ${S.blue}20`,
                color: S.blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                fontSize: "10px",
                fontWeight: 700,
              }}
              title="LinkedIn"
            >
              in
            </a>
          )}
          {showPhone && profile.whatsapp && (
            <a
              href={`https://wa.me/${profile.whatsapp?.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: S.greenBg,
                border: `1px solid ${S.green}20`,
                color: S.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
              title="WhatsApp"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, ${S.bg} 0%, #F3F4F6 100%)`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Load more */}
        {hasMore && (
          <div style={{ textAlign: "center", padding: "12px" }}>
            {loadingMore ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: S.textTer }}>
                <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "12px" }}>Cargando...</span>
              </div>
            ) : (
              <button
                onClick={loadMore}
                style={{
                  background: S.card,
                  border: `1px solid ${S.border}`,
                  color: S.textSec,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                <ChevronUp size={14} /> Ver anteriores
              </button>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: S.textTer }}>
            <Loader size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", margin: 0 }}>Cargando mensajes...</p>
          </div>
        )}

        {/* Spacer to push messages to bottom when few */}
        <div style={{ flex: 1, minHeight: "8px" }} />

        {/* Messages */}
        <div style={{ padding: "4px 0" }}>
          {displayMessages.map((m, idx) => {
            const prevMessage = idx > 0 ? displayMessages[idx - 1] : null;
            const showDateDivider = m.created_at && (!prevMessage?.created_at || isDifferentDay(prevMessage.created_at, m.created_at));

            return m.from === "system" ? (
              <div key={m.id} style={{ padding: "8px 16px", marginBottom: "8px" }}>
                <div style={{
                  background: `linear-gradient(135deg, ${S.blueBg} 0%, #E0E7FF 100%)`,
                  border: `1px solid ${S.blue}15`,
                  borderRadius: "16px",
                  padding: "14px 18px",
                  textAlign: "center",
                  maxWidth: "320px",
                  margin: "0 auto",
                }}>
                  <p style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    color: S.blue,
                    letterSpacing: "0.8px",
                    margin: "0 0 6px",
                    fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif"
                  }}>
                    Rompehielo
                  </p>
                  <p style={{
                    color: S.text,
                    fontSize: "14px",
                    margin: 0,
                    fontStyle: "italic",
                    lineHeight: 1.5,
                    fontFamily: "'DM Sans', sans-serif"
                  }}>
                    "{m.text}"
                  </p>
                </div>
              </div>
            ) : (
              <div key={m.id}>
                {showDateDivider && <DateDivider date={m.created_at} />}
                <MessageBubble
                  message={m}
                  isOwn={m.from === "me"}
                  isRead={m.from === "me" && isMessageRead ? isMessageRead(m.id) : false}
                  showTimestamp={!!m.created_at}
                />
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} style={{ height: "1px" }} />
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0,
        padding: "8px 10px",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        background: S.card,
        borderTop: `1px solid ${S.border}`,
        position: "relative",
      }}>
        {showEmojiPicker && (
          <div style={{
            position: "absolute",
            bottom: "100%",
            left: "8px",
            right: "8px",
            marginBottom: "4px",
            zIndex: 10,
          }}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
          </div>
        )}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: "20px",
              border: "none",
              background: showEmojiPicker ? S.blueBg : S.cardLight,
              color: showEmojiPicker ? S.blue : S.textSec,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            onFocus={() => setShowEmojiPicker(false)}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "20px",
              border: `1px solid ${S.border}`,
              background: S.bg,
              color: S.text,
              fontSize: "15px",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              minWidth: 0,
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: "20px",
              border: "none",
              background: input.trim()
                ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                : S.cardLight,
              color: input.trim() ? "#fff" : S.textTer,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              flexShrink: 0,
              boxShadow: input.trim() ? "0 2px 8px rgba(5, 150, 105, 0.3)" : "none",
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
