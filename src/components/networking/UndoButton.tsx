// @ts-nocheck
import { useState } from "react";
import { S } from "./styles";

export default function UndoButton({ canUndo, onUndo }) {
  const [undoing, setUndoing] = useState(false);

  if (!canUndo) return null;

  const handleUndo = async () => {
    setUndoing(true);
    await onUndo();
    setUndoing(false);
  };

  return (
    <button
      onClick={handleUndo}
      disabled={undoing}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 20px",
        borderRadius: "12px",
        background: S.yellowBg,
        border: `2px solid ${S.yellow}50`,
        color: S.yellowText,
        fontSize: "13px",
        fontWeight: 700,
        cursor: undoing ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: "16px",
        opacity: undoing ? 0.6 : 1,
        transition: "all 0.2s"
      }}
    >
      <span>↩️</span>
      {undoing ? "Deshaciendo..." : "Deshacer ultimo swipe"}
    </button>
  );
}
