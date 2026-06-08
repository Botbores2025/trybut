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
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const fimRef = useRef(null);
  const fotoRef = useRef(null);
  const digitandoTimeout = useRef(null);
  const ultimoDigitando = useRef(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const cid = user && uid ? idConversa(user.uid, uid) : null;

  useEffect(() => {
    if (!uid || !user) return;
    getDoc(doc(db, "usuarios", uid)).then((s) => setAlvo(s.exists() ? s.data() : {}));
    getDoc(doc(db, "usuarios", user.uid)).then((s) => setEu(s.exists() ? s.data() : {}));
  }, [uid, user]);

  useEffect(() => {
    if (!cid) return;
    const q = query(collection(db, "conversas", cid, "mensagens"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [cid]);

  useEffect(() => {
    if (!cid || !uid) return;
    const unsub = onSnapshot(doc(db, "conversas", cid), (snap) => {
      if (!snap.exists()) return;
      const dig = snap.data().digitando || {};
      const ts = dig[uid];
      setOutroDigitando(ts?.seconds ? Date.now() / 1000 - ts.seconds < 5 : false);
    });
    return () => unsub();
  }, [cid, uid]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, outroDigitando]);

  useEffect(() => {
    return () => {
      if (cid && user) updateDoc(doc(db, "conversas", cid), { [`digitando.${user.uid}`]: deleteField() }).catch(() => {});
    };
  }, [cid, user]);

  function aoDigitar(e) {
    setTexto(e.target.value);
    if (!cid || !user) return;
    const agora = Date.now();
    if (agora - ultimoDigitando.current > 2000) {
      ultimoDigitando.current = agora;
      setDoc(doc(db, "conversas", cid), { digitando: { [user.uid]: serverTimestamp() } }, { merge: true }).catch(() => {});
    }
    clearTimeout(digitandoTimeout.current);
    digitandoTimeout.current = setTimeout(() => {
      updateDoc(doc(db, "conversas", cid), { [`digitando.${user.uid}`]: deleteField() }).catch(() => {});
    }, 3000);
  }

  async function enviarMsg(t, tipo, fotoURL, audioURL) {
    if (!cid || !user) return;
    setTexto("");
    setPickerAberto(false);
    clearTimeout(digitandoTimeout.current);
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
        [`digitando.${user.uid}`]: deleteField(),
      }, { merge: true });
      const msgData = { texto: t || "", tipo: tipo || "texto", autorUid: user.uid, timestamp: serverTimestamp() };
      if (fotoURL) msgData.fotoURL = fotoURL;
      if (audioURL) msgData.audioURL = audioURL;
      await addDoc(collection(db, "conversas", cid, "mensagens"), msgData);
      await setDoc(doc(db, "notificacoes", `msg_${user.uid}_${uid}`), {
        tipo: "mensagem", deUid: user.uid, deNome: eu?.nome || "alguém",
        deFoto: eu?.fotoURL || "", paraUid: uid, previa,
        timestamp: serverTimestamp(), lida: false,
      });
    } catch (e) { console.error(e); alert("não consegui enviar. tenta de novo."); }
  }

  function enviar() { const t = texto.trim(); if (t) enviarMsg(t, "texto"); }
  function enviarFigurinha(emoji) { enviarMsg(emoji, "figurinha"); }

  async function enviarFoto(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setEnviandoFoto(true);
    try { const url = await uploadCloudinary(file); await enviarMsg("", "foto", url); }
    catch (err) { console.error(err); alert("não consegui enviar a foto."); }
    finally { setEnviandoFoto(false); }
  }

  async function toggleGravar() {
    if (gravando) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const file = new File([blob], "audio.webm", { type: blob.type });
        setGravando(false);
        setEnviandoAudio(true);
        try {
          const url = await uploadCloudinary(file, "video");
          await enviarMsg("", "audio", null, url);
        } catch (e) { console.error(e); alert("não consegui enviar o áudio."); }
        finally { setEnviandoAudio(false); }
      };
      mr.start();
      setGravando(true);
    } catch (e) {
      console.error(e);
      alert("não consegui acessar o microfone. permita o acesso.");
    }
  }

  if (!alvo) return <p className="vazio">carregando...</p>;

  return (
    <div className="chat">
      <Link href={`/perfil/${uid}`} className="chat-topo">
        <ArrowLeft size={20} />
        <div className="avatar-mini">
          {alvo.fotoURL ? <img src={alvo.fotoURL} className="avatar-img" alt="" />
            : (alvo.nome || "?").charAt(0).toUpperCase()}
        </div>
        <span className="chat-nome">{alvo.nome || "usuário"}</span>
      </Link>

      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {msgs.length === 0 && <p className="vazio">nenhuma mensagem ainda. manda a primeira!</p>}
          {(enviandoFoto || enviandoAudio) && (
            <p className="vazio">{enviandoAudio ? "enviando áudio..." : "enviando foto..."}</p>
          )}
          {msgs.map((m) => {
            const minha = m.autorUid === user.uid;
            if (m.tipo === "figurinha") {
              return <div key={m.id} className={"msg-figurinha " + (minha ? "msg-minha" : "msg-dele")}><span className="figurinha">{m.texto}</span></div>;
            }
            if (m.tipo === "foto") {
              return (
                <div key={m.id} className={"msg msg-foto-wrap " + (minha ? "msg-minha" : "msg-dele")}>
                  <img src={m.fotoURL} alt="" className="msg-foto" onClick={() => setFotoAmpliada(m.fotoURL)} />
                  {m.texto && <p className="msg-foto-legenda">{m.texto}</p>}
                </div>
              );
            }
            if (m.tipo === "audio") {
              return (
                <div key={m.id} className={"msg msg-audio-wrap " + (minha ? "msg-minha" : "msg-dele")}>
                  <audio src={m.audioURL} controls className="msg-audio" />
                </div>
              );
            }
            return <div key={m.id} className={"msg " + (minha ? "msg-minha" : "msg-dele")}>{m.texto}</div>;
          })}
          {outroDigitando && <p className="digitando-indicator">digitando...</p>}
          <div ref={fimRef} />
        </div>
      </div>

      {pickerAberto && <StickerPicker onSelect={enviarFigurinha} />}

      <div className="chat-input-bar">
        <button className="chat-sticker-btn" onClick={() => setPickerAberto(!pickerAberto)} aria-label="figurinhas"><Smile size={22} /></button>
        <button className="chat-sticker-btn" onClick={() => fotoRef.current?.click()} disabled={enviandoFoto} aria-label="enviar foto"><ImageIcon size={22} /></button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={enviarFoto} />
        <input className="chat-input" placeholder="mensagem..." value={texto}
          onChange={aoDigitar} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          onFocus={() => setPickerAberto(false)} />
        <button className={"chat-mic-btn" + (gravando ? " gravando" : "")} onClick={toggleGravar}
          disabled={enviandoAudio} aria-label={gravando ? "parar" : "gravar áudio"}>
          {gravando ? <Square size={18} /> : <Mic size={20} />}
        </button>
        <button className="chat-enviar" onClick={enviar} aria-label="enviar"><Send size={20} /></button>
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
