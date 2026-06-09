"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteField,
  collection, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { idConversa } from "@/lib/chat";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";
import StickerPicker from "@/components/StickerPicker";
import { ArrowLeft, Send, Smile, Image as ImageIcon, X, Mic, Square } from "lucide-react";

export default function ChatPage() {
  return <AppShell><Chat /></AppShell>;
}

function AudioMsg({ src, minha, timestamp }) {
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
    </div>
  );
}

function Chat() {
  const { uid } = useParams();
  const { user } = useAuth();
  const [alvo, setAlvo] = useState(null);
  const [eu, setEu] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [pickerAberto, setPickerAberto] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [outroDigitando, setOutroDigitando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [tempoGravando, setTempoGravando] = useState(0);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const [respondendoA, setRespondendoA] = useState(null);
  const [menuMsgId, setMenuMsgId] = useState(null);
  const fimRef = useRef(null);
  const fotoRef = useRef(null);
  const digitandoTimeout = useRef(null);
  const ultimoDigitando = useRef(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const cid = user && uid ? idConversa(user.uid, uid) : null;

  useEffect(() => {
    if (!uid || !user) return;
    // perfil do alvo em tempo real (pra pegar online/offline)
    const unsub = onSnapshot(doc(db, "usuarios", uid), (snap) => {
      setAlvo(snap.exists() ? snap.data() : {});
    });
    getDoc(doc(db, "usuarios", user.uid)).then((s) => setEu(s.exists() ? s.data() : {}));
    return () => unsub();
  }, [uid, user]);

  useEffect(() => {
    if (!cid) return;
    const q = query(collection(db, "conversas", cid, "mensagens"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => { setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
  }, [cid]);

  useEffect(() => {
    if (!cid || !uid) return;
    return onSnapshot(doc(db, "conversas", cid), (snap) => {
      if (!snap.exists()) return;
      const ts = (snap.data().digitando || {})[uid];
      setOutroDigitando(ts?.seconds ? Date.now() / 1000 - ts.seconds < 5 : false);
    });
  }, [cid, uid]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, outroDigitando]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (cid && user) updateDoc(doc(db, "conversas", cid), { [`digitando.${user.uid}`]: deleteField() }).catch(() => {});
    };
  }, [cid, user]);

  function aoDigitar(e) {
    setTexto(e.target.value);
    if (!cid || !user) return;
    if (Date.now() - ultimoDigitando.current > 2000) {
      ultimoDigitando.current = Date.now();
      setDoc(doc(db, "conversas", cid), { digitando: { [user.uid]: serverTimestamp() } }, { merge: true }).catch(() => {});
    }
    clearTimeout(digitandoTimeout.current);
    digitandoTimeout.current = setTimeout(() => {
      updateDoc(doc(db, "conversas", cid), { [`digitando.${user.uid}`]: deleteField() }).catch(() => {});
    }, 3000);
  }

  async function enviarMsg(t, tipo, fotoURL, audioURL) {
    if (!cid || !user) return;
    setTexto(""); setPickerAberto(false);
    clearTimeout(digitandoTimeout.current);
    const resposta = respondendoA;
    setRespondendoA(null);
    try {
      const previa = tipo === "figurinha" ? "enviou uma figurinha"
        : tipo === "foto" ? "enviou uma foto"
        : tipo === "audio" ? "enviou um áudio"
        : (t.length > 50 ? t.slice(0, 50) + "..." : t);
      await setDoc(doc(db, "conversas", cid), {
        participantes: [user.uid, uid],
        participantesInfo: {
          [user.uid]: { nome: eu?.nome || "eu", foto: eu?.fotoURL || "" },
          [uid]: { nome: alvo?.nome || "", foto: alvo?.fotoURL || "" },
        },
        ultimaMensagem: previa, ultimoAutor: user.uid, timestamp: serverTimestamp(),
      }, { merge: true });
      const msgData = { texto: t || "", tipo: tipo || "texto", autorUid: user.uid, timestamp: serverTimestamp() };
      if (fotoURL) msgData.fotoURL = fotoURL;
      if (audioURL) msgData.audioURL = audioURL;
      if (resposta) {
        msgData.respostaA = {
          autorNome: resposta.autorUid === user.uid ? (eu?.nome || "você") : (alvo?.nome || "alguém"),
          texto: resposta.texto || "",
          tipo: resposta.tipo || "texto",
        };
      }
      await addDoc(collection(db, "conversas", cid, "mensagens"), msgData);
      await setDoc(doc(db, "notificacoes", `msg_${user.uid}_${uid}`), {
        tipo: "mensagem", deUid: user.uid, deNome: eu?.nome || "alguém",
        deFoto: eu?.fotoURL || "", paraUid: uid, previa,
        timestamp: serverTimestamp(), lida: false,
      });
    } catch (e) { console.error("erro ao enviar:", e); alert("não consegui enviar. tenta de novo."); }
  }

  function enviar() { const t = texto.trim(); if (t) enviarMsg(t, "texto"); }
  function enviarFigurinha(emoji) { enviarMsg(emoji, "figurinha"); }

  function clickMsg(m) {
    setMenuMsgId(menuMsgId === m.id ? null : m.id);
  }

  async function apagarMsg(msgId) {
    setMenuMsgId(null);
    try {
      await updateDoc(doc(db, "conversas", cid, "mensagens", msgId), {
        tipo: "apagada", texto: "", fotoURL: "", audioURL: "",
      });
    } catch (e) { console.error(e); alert("não consegui apagar."); }
  }

  async function enviarFoto(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setEnviandoFoto(true);
    try { await enviarMsg("", "foto", await uploadCloudinary(file)); }
    catch (err) { console.error(err); alert("não consegui enviar a foto."); }
    finally { setEnviandoFoto(false); }
  }

  async function toggleGravar() {
    if (gravando) {
      mediaRecorderRef.current?.stop();
      clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setTempoGravando(0);
        setGravando(false);

        if (chunksRef.current.length === 0) {
          alert("nenhum áudio gravado. tenta de novo.");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("audio blob:", blob.size, "bytes, type:", blob.type);

        if (blob.size < 100) {
          alert("áudio muito curto. tenta de novo.");
          return;
        }

        setEnviandoAudio(true);
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("erro ao converter áudio"));
            reader.readAsDataURL(blob);
          });

          console.log("audio dataUrl length:", dataUrl.length);

          if (!dataUrl || !dataUrl.startsWith("data:")) {
            throw new Error("conversão do áudio falhou");
          }

          await enviarMsg("", "audio", null, dataUrl);
        } catch (e) {
          console.error("erro audio:", e);
          alert("não consegui enviar o áudio. tenta de novo.");
        } finally {
          setEnviandoAudio(false);
        }
      };

      mr.start(100); // coleta dados a cada 100ms
      setGravando(true);
      setTempoGravando(0);
      timerRef.current = setInterval(() => setTempoGravando((t) => t + 1), 1000);

      // limite de 60 segundos
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 60000);
    } catch (e) {
      console.error("mic erro:", e);
      alert("não consegui acessar o microfone. permita o acesso nas configurações do navegador.");
    }
  }

  function statusTexto() {
    if (!alvo) return "";
    if (alvo.online) return "online agora";
    if (!alvo.ultimoAcesso?.seconds) return "";
    const diff = Date.now() / 1000 - alvo.ultimoAcesso.seconds;
    if (diff < 120) return "online agora";
    if (diff < 3600) return `visto há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `visto há ${Math.floor(diff / 3600)}h`;
    return `visto há ${Math.floor(diff / 86400)}d`;
  }

  if (!alvo) return <p className="vazio">carregando...</p>;

  return (
    <div className="chat">
      <Link href={`/perfil/${uid}`} className="chat-topo">
        <ArrowLeft size={20} />
        <div className="avatar-mini" style={{ position: "relative" }}>
          {alvo.fotoURL ? <img src={alvo.fotoURL} className="avatar-img" alt="" /> : (alvo.nome || "?").charAt(0).toUpperCase()}
          {alvo.online && <span className="online-dot" />}
        </div>
        <div>
          <span className="chat-nome">{alvo.nome || "usuário"}</span>
          <p className="chat-status">{statusTexto()}</p>
        </div>
      </Link>

      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {msgs.length === 0 && <p className="vazio">nenhuma mensagem ainda. manda a primeira!</p>}
          {(enviandoFoto || enviandoAudio) && <p className="vazio">{enviandoAudio ? "enviando áudio..." : "enviando foto..."}</p>}
          {msgs.map((m) => {
            const minha = m.autorUid === user.uid;
            const menuAberto = menuMsgId === m.id;
            const quote = m.respostaA ? (
              <div className="msg-quote" onClick={(e) => e.stopPropagation()}>
                <span className="msg-quote-nome">{m.respostaA.autorNome}</span>
                <span className="msg-quote-texto">
                  {m.respostaA.tipo === "foto" ? "foto" : m.respostaA.tipo === "audio" ? "áudio" : m.respostaA.tipo === "figurinha" ? m.respostaA.texto : (m.respostaA.texto || "").slice(0, 50)}
                </span>
              </div>
            ) : null;
            const menu = menuAberto ? (
              <div className={"msg-menu " + (minha ? "msg-menu-dir" : "msg-menu-esq")}>
                <button onClick={() => { setRespondendoA(m); setMenuMsgId(null); }}>responder</button>
                {minha && m.tipo !== "apagada" && <button className="msg-menu-apagar" onClick={() => apagarMsg(m.id)}>apagar</button>}
              </div>
            ) : null;
            if (m.tipo === "apagada") return (
              <div key={m.id} className={"msg msg-apagada " + (minha ? "msg-minha" : "msg-dele")}>
                mensagem apagada
              </div>
            );
            if (m.tipo === "figurinha") return (
              <div key={m.id} style={{ alignSelf: minha ? "flex-end" : "flex-start" }}>
                <div className={"msg-figurinha " + (minha ? "msg-minha" : "msg-dele")} onClick={() => clickMsg(m)}>
                  {quote}<span className="figurinha">{m.texto}</span>
                </div>
                {menu}
              </div>
            );
            if (m.tipo === "foto" && m.fotoURL) return (
              <div key={m.id} style={{ alignSelf: minha ? "flex-end" : "flex-start" }}>
                <div className={"msg msg-foto-wrap " + (minha ? "msg-minha" : "msg-dele")} onClick={() => clickMsg(m)}>
                  {quote}<img src={m.fotoURL} alt="" className="msg-foto" onClick={(e) => { e.stopPropagation(); setFotoAmpliada(m.fotoURL); }} />
                </div>
                {menu}
              </div>
            );
            if (m.tipo === "audio") return (
              <div key={m.id} onClick={() => clickMsg(m)} style={{ alignSelf: minha ? "flex-end" : "flex-start" }}>
                {quote && <div className={"msg " + (minha ? "msg-minha" : "msg-dele")} style={{marginBottom:2, padding:"6px 10px"}}>{quote}</div>}
                <AudioMsg src={m.audioURL} minha={minha} timestamp={m.timestamp} />
                {menu}
              </div>
            );
            if (m.texto) return (
              <div key={m.id} style={{ alignSelf: minha ? "flex-end" : "flex-start" }}>
                <div className={"msg " + (minha ? "msg-minha" : "msg-dele")} onClick={() => clickMsg(m)}>
                  {quote}{m.texto}
                </div>
                {menu}
              </div>
            );
            return null;
          })}
          {outroDigitando && <p className="digitando-indicator">digitando...</p>}
          <div ref={fimRef} />
        </div>
      </div>

      {pickerAberto && <StickerPicker onSelect={enviarFigurinha} />}

      {respondendoA && (
        <div className="resposta-preview">
          <div className="resposta-preview-info">
            <span className="resposta-preview-nome">
              {respondendoA.autorUid === user.uid ? "você" : (alvo?.nome || "alguém")}
            </span>
            <span className="resposta-preview-texto">
              {respondendoA.tipo === "foto" ? "foto" : respondendoA.tipo === "audio" ? "áudio" : respondendoA.tipo === "figurinha" ? respondendoA.texto : (respondendoA.texto || "").slice(0, 60)}
            </span>
          </div>
          <button className="resposta-preview-x" onClick={() => setRespondendoA(null)}>✕</button>
        </div>
      )}

      <div className="chat-input-bar">
        <button className="chat-sticker-btn" onClick={() => setPickerAberto(!pickerAberto)} aria-label="figurinhas"><Smile size={22} /></button>
        <button className="chat-sticker-btn" onClick={() => fotoRef.current?.click()} disabled={enviandoFoto} aria-label="foto"><ImageIcon size={22} /></button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={enviarFoto} />
        {gravando ? (
          <div className="gravando-info">
            <span className="gravando-dot" />
            <span className="gravando-tempo">{tempoGravando}s</span>
          </div>
        ) : (
          <input className="chat-input" placeholder="mensagem..." value={texto} onChange={aoDigitar}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} onFocus={() => setPickerAberto(false)} />
        )}
        <button className={"chat-mic-btn" + (gravando ? " gravando" : "")} onClick={toggleGravar}
          disabled={enviandoAudio} aria-label={gravando ? "parar" : "gravar"}>{gravando ? <Square size={18} /> : <Mic size={20} />}</button>
        {!gravando && <button className="chat-enviar" onClick={enviar} aria-label="enviar"><Send size={20} /></button>}
      </div>

      {fotoAmpliada && (
        <div className="foto-overlay" onClick={() => setFotoAmpliada(null)}>
          <button className="foto-fechar" onClick={() => setFotoAmpliada(null)}><X size={24} /></button>
          <img src={fotoAmpliada} alt="" className="foto-ampliada" />
        </div>
      )}
    </div>
  );
}
