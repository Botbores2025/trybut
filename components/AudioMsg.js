"use client";

import { useRef, useState } from "react";

export default function AudioMsg({ src, minha, timestamp, check }) {
  const audioRef = useRef(null);
  const [tocando, setTocando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const intervaloRef = useRef(null);
  const [barras] = useState(() => Array.from({ length: 30 }, () => 4 + Math.random() * 16));

  function formatTempo(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function formatHora(ts) {
    if (!ts?.seconds) return "";
    const d = new Date(ts.seconds * 1000);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function toggle() {
    if (!src) { alert("áudio indisponível"); return; }
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
          setDuracao(audioRef.current.duration);
        }
      };
      audioRef.current.onended = () => {
        setTocando(false);
        setProgresso(0);
        clearInterval(intervaloRef.current);
      };
    }
    if (tocando) {
      audioRef.current.pause();
      setTocando(false);
      clearInterval(intervaloRef.current);
    } else {
      audioRef.current.play().catch(() => setTocando(false));
      setTocando(true);
      intervaloRef.current = setInterval(() => {
        if (audioRef.current && audioRef.current.duration) {
          setProgresso(audioRef.current.currentTime / audioRef.current.duration);
        }
      }, 100);
    }
  }

  return (
    <div className={"msg msg-audio-v2 " + (minha ? "msg-minha" : "msg-dele")}>
      <button className="audio-play-v2" onClick={toggle}>
        {tocando ? "⏸" : "▶"}
      </button>
      <div className="audio-meio">
        <div className="audio-barras">
          {barras.map((h, i) => (
            <div key={i} className="audio-barra" style={{
              height: `${h}px`,
              opacity: i / barras.length <= progresso ? 1 : 0.35,
            }} />
          ))}
        </div>
        <div className="audio-meta">
          <span className="audio-duracao">
            {tocando && audioRef.current
              ? formatTempo(audioRef.current.currentTime)
              : duracao > 0 ? formatTempo(duracao) : "0:00"}
          </span>
          <span className="audio-hora">{formatHora(timestamp)}</span>
        </div>
      </div>
      {check}
    </div>
  );
}
