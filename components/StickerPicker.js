"use client";

import { useState } from "react";
import { pacotes } from "@/lib/figurinhas";

export default function StickerPicker({ onSelect }) {
  const [aba, setAba] = useState(0);

  return (
    <div className="sticker-picker">
      <div className="sticker-tabs">
        {pacotes.map((p, i) => (
          <button
            key={i}
            className={"sticker-tab" + (i === aba ? " ativo" : "")}
            onClick={() => setAba(i)}
            title={p.nome}
          >
            {p.stickers[0]}
          </button>
        ))}
      </div>
      <div className="sticker-grid">
        {pacotes[aba].stickers.map((s, i) => (
          <button key={i} className="sticker-item" onClick={() => onSelect(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
