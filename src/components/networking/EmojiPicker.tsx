// @ts-nocheck
import EmojiPickerReact, { Theme, EmojiStyle } from 'emoji-picker-react';
import { S } from "./styles";
import { X } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const handleEmojiClick = (emojiData: any) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <div style={{
      background: S.card,
      borderRadius: "12px",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
      overflow: "hidden",
      border: `1px solid ${S.border}`,
      maxHeight: "min(320px, 50vh)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: `1px solid ${S.border}`,
        background: S.cardLight,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "12px",
          fontWeight: 600,
          color: S.text,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Emojis
        </span>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: "8px",
            border: "none",
            background: "transparent",
            color: S.textTer,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <EmojiPickerReact
          onEmojiClick={handleEmojiClick}
          theme={Theme.LIGHT}
          emojiStyle={EmojiStyle.NATIVE}
          height={280}
          width="100%"
          searchPlaceholder="Buscar..."
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          lazyLoadEmojis
        />
      </div>
    </div>
  );
}
