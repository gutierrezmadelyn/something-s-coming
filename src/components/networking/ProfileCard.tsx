// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Handshake, X, Check, MessageCircle } from "lucide-react";
import { S } from "./styles";
import { calcCompat } from "./utils";
import { Tag, Avatar, CompatBadge } from "./ui";

export default function ProfileCard({ profile, currentUser, onLeft, onRight, getCompatibility, hasMatch = false }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [compat, setCompat] = useState(() => calcCompat(currentUser, profile));
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef(false);

  useEffect(() => {
    if (getCompatibility && currentUser?.id && profile?.id) {
      getCompatibility(currentUser.id, profile.id).then(score => {
        if (score > 0) setCompat(score);
      });
    }
  }, [getCompatibility, currentUser?.id, profile?.id]);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = false;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!isHorizontal.current && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (!isHorizontal.current) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal.current) { setDragging(false); setDragX(0); return; }
    }
    e.preventDefault();
    setDragX(dx);
  };
  const onTouchEnd = () => { if (dragX > 100) onRight(); else if (dragX < -100) onLeft(); setDragX(0); setDragging(false); isHorizontal.current = false; };
  const onMouseDown = (e) => { startX.current = e.clientX; setDragging(true); };
  const onMouseMove = (e) => { if (dragging) setDragX(e.clientX - startX.current); };
  const onMouseEnd = () => { if (dragX > 100) onRight(); else if (dragX < -100) onLeft(); setDragX(0); setDragging(false); };

  const showLocation = profile.showLocation !== false;
  const swipeOpacity = Math.min(Math.abs(dragX) / 100, 1);
  const isRight = dragX > 30;
  const isLeft = dragX < -30;
  const rightColor = hasMatch ? S.blue : S.green;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "380px", margin: "0 auto", paddingBottom: "90px" }}>

      {/* Swipe feedback stamp */}
      {(isLeft || isRight) && (
        <div style={{
          position: "absolute", top: "50px",
          left: isRight ? "24px" : "auto",
          right: isLeft ? "24px" : "auto",
          zIndex: 20, padding: "8px 20px", borderRadius: "12px",
          background: isRight ? `${rightColor}15` : `${S.red}15`,
          border: `2.5px solid ${isRight ? rightColor : S.red}`,
          color: isRight ? rightColor : S.red,
          fontSize: "16px", fontWeight: 800, fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.05em",
          transform: `rotate(${isRight ? -12 : 12}deg)`,
          opacity: swipeOpacity,
          pointerEvents: "none",
        }}>
          {isRight ? (hasMatch ? "MENSAJE" : "CONECTAR") : "PASAR"}
        </div>
      )}

      {/* Card */}
      <div
        style={{
          background: S.card,
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: isLeft || isRight
            ? `0 8px 30px ${isRight ? rightColor : S.red}20`
            : "0 2px 16px rgba(0,0,0,0.06)",
          transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
          transition: dragging ? "none" : "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          border: `1px solid ${isRight ? `${rightColor}50` : isLeft ? `${S.red}50` : S.border}`,
          userSelect: "none",
        }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseEnd}
        onMouseLeave={() => dragging && onMouseEnd()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(160deg, ${profile.color}18, ${profile.color}06)`,
          padding: "24px 20px 18px",
          position: "relative",
        }}>
          {/* Top row: badge + compat */}
          {hasMatch && (
            <div style={{
              position: "absolute", top: 10, left: 10,
              background: `${S.blue}10`, backdropFilter: "blur(8px)",
              color: S.blue, padding: "4px 10px", borderRadius: "10px",
              fontSize: "10px", fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${S.blue}20`,
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <Handshake size={12}/> Conectados
            </div>
          )}
          <CompatBadge score={compat}/>

          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: hasMatch ? "8px" : "0" }}>
            <div style={{
              padding: "3px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${profile.color}60, ${profile.color}20)`,
            }}>
              <Avatar profile={profile} size={68}/>
            </div>
          </div>

          {/* Info */}
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "19px", fontWeight: 700, color: S.text,
              margin: "0 0 6px", lineHeight: 1.2,
            }}>{profile.name}</h2>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexWrap: "wrap", marginBottom: "4px" }}>
              {showLocation && (
                <span style={{ fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>
                  {profile.city ? `${profile.city}, ${profile.country}` : profile.country}
                </span>
              )}
              {showLocation && <span style={{ color: S.border }}>·</span>}
              <span style={{ fontSize: "11px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>{profile.role}</span>
            </div>

            {profile.org && (
              <p style={{ color: S.text, fontSize: "11px", margin: "0", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {profile.org}
              </p>
            )}
            {profile.orgDescription && (
              <p style={{ color: S.textTer, fontSize: "10px", margin: "2px 0 0", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", lineHeight: 1.3 }}>
                {profile.orgDescription}
              </p>
            )}

            {/* Chips row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "3px 10px", borderRadius: "10px",
                background: `${profile.color}12`, color: profile.color,
                fontSize: "10px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                border: `1px solid ${profile.color}20`,
              }}>
                {profile.workType === "Independiente" ? "Independiente" : profile.workType === "Organización" ? "Organización" : "Ind + Org"}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${S.border}, transparent)` }}/>

        {/* Content */}
        <div style={{ padding: "14px 18px 16px" }}>
          {/* Pitch */}
          <div style={{
            background: S.cardLight, borderRadius: "12px", padding: "10px 14px",
            marginBottom: "14px", borderLeft: `3px solid ${profile.color}40`,
          }}>
            <p style={{
              fontSize: "12px", color: S.text, fontStyle: "italic",
              margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif",
            }}>"{profile.pitch}"</p>
          </div>

          {/* Ofrece */}
          <div style={{ marginBottom: "10px" }}>
            <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Ofrece</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{(profile.offers || []).map(o => <Tag key={o} bg={S.greenBg} color={S.green}>{o}</Tag>)}</div>
          </div>

          {/* Busca */}
          <div style={{ marginBottom: "6px" }}>
            <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Busca</p>
            <div style={{ display: "flex", flexWrap: "wrap" }}>{(profile.seeks || []).map(s => <Tag key={s} bg={S.redBg} color={S.red}>{s}</Tag>)}</div>
          </div>

          {/* Expandable */}
          {expanded && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Domina</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{(profile.expertise || []).map(e => <Tag key={e} bg={S.blueBg} color={S.blue}>{e}</Tag>)}</div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Quiere aprender</p>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{(Array.isArray(profile.wantsToLearn) ? profile.wantsToLearn : [profile.wantsToLearn]).filter(Boolean).map(w => <Tag key={w} bg={S.yellowBg} color={S.yellowText}>{w}</Tag>)}</div>
              </div>
              {profile.sectors?.length > 0 && (
                <div style={{ marginBottom: "6px" }}>
                  <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: S.textTer, margin: "0 0 5px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Sectores</p>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>{profile.sectors.map(s => <Tag key={s}>{s}</Tag>)}</div>
                </div>
              )}
            </div>
          )}

          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} style={{
            width: "100%", padding: "8px", marginTop: "8px",
            background: "transparent", border: `1px solid ${S.border}`,
            borderRadius: "10px", color: S.textSec, fontSize: "11px",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            transition: "all 0.2s",
          }}>
            {expanded ? "Menos detalles ↑" : "Mas detalles ↓"}
          </button>
        </div>
      </div>

      {/* Action buttons - fixed at bottom */}
      <div style={{
        position: "fixed", bottom: "70px", left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: "20px", padding: "12px 0",
        background: "linear-gradient(transparent, rgba(250,251,252,0.95) 20%)",
        zIndex: 50,
      }}>
        <button onClick={onLeft} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
          background: "none", border: "none", cursor: "pointer", padding: "6px",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `linear-gradient(145deg, #fff, ${S.redBg})`,
            border: `2px solid ${S.red}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: S.red,
            boxShadow: "0 2px 8px rgba(225,29,72,0.15)",
            transition: "all 0.2s",
          }}><X size={20}/></div>
          <span style={{ fontSize: "10px", color: S.red, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>Pasar</span>
        </button>

        <button onClick={onRight} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
          background: "none", border: "none", cursor: "pointer", padding: "6px",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: hasMatch ? `linear-gradient(145deg, #fff, ${S.blueBg})` : `linear-gradient(145deg, #fff, ${S.greenBg})`,
            border: `2px solid ${rightColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: rightColor,
            boxShadow: `0 2px 8px ${rightColor}25`,
            transition: "all 0.2s",
          }}>{hasMatch ? <MessageCircle size={20}/> : <Check size={20}/>}</div>
          <span style={{ fontSize: "10px", color: rightColor, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{hasMatch ? "Mensaje" : "Conectar"}</span>
        </button>
      </div>
    </div>
  );
}
