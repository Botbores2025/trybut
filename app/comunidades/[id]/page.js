"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";
import StickerPicker from "@/components/StickerPicker";
import { ArrowLeft, Send, Smile, Image as ImageIcon, X } from "lucide-react";

export default function GrupoChatPage() {
  return <AppShell><GrupoChat /></AppShell>;
}

function GrupoChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const [grupo, setGrupo] = useState(null);
  const [eu, setEu] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [pickerAberto, setPickerAberto] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const fimRef = useRef(null);
  const fotoRef = useRef(null);

  useEffect(() => {
    if (!id || !user) return;
    getDoc(doc(db, "grupos", id)).then((s) => setGrupo(s.exists() ? { id: s.id, ...s.data() } : null));
    getDoc(doc(db, "usuarios", user.uid)).then((s) => setEu(s.exists() ? s.data() : {}));
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "grupos", id, "mensagens"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => { setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [id]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function enviarMsg(t, tipo, fotoURL) {
    if (!id || !user) return;
    setTexto("");
    setPickerAberto(false);
    try {
      const msgData = { texto: t || "", tipo: tipo || "texto", autorUid: user.uid, autorNome: eu?.nome || "eu", timestamp: serverTimestamp() };
      if (fotoURL) msgData.fotoURL = fotoURL;
      await addDoc(collection(db, "grupos", id, "mensagens"), msgData);
      const previa = tipo === "figurinha" ? "enviou uma figurinha" : tipo === "foto" ? "enviou uma foto" : t;
      await updateDoc(doc(db, "grupos", id), { ultimaMensagem: previa, ultimoAutor: user.uid, timestamp: serverTimestamp() });
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

  if (!grupo) return <p className="vazio">carregando...</p>;

  return (
    <div className="chat">
      <Link href="/comunidades" className="chat-topo">
        <ArrowLeft size={20} />
        <div className="avatar-mini grupo-avatar">{grupo.nome ? grupo.nome.charAt(0).toUpperCase() : "G"}</div>
        <div>
          <span className="chat-nome">{grupo.nome}</span>
          <p style={{ margin: 0, fontSize: 12, color: "var(--texto-fraco)" }}>{(grupo.membros || []).length} membros</p>
        </div>
      </Link>

      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {msgs.length === 0 && <p className="vazio">grupo criado! manda a primeira mensagem.</p>}
          {enviandoFoto && <p className="vazio">enviando foto...</p>}
          {msgs.map((m) => {
            const minha = m.autorUid === user.uid;
            if (m.tipo === "figurinha") {
              return (
                <div key={m.id} className={"msg-figurinha " + (minha ? "msg-minha" : "msg-dele")}>
                  {!minha && <p className="msg-autor">{m.autorNome || "alguém"}</p>}
                  <span className="figurinha">{m.texto}</span>
                </div>
              );
            }
            if (m.tipo === "foto") {
              return (
                <div key={m.id} className={"msg msg-foto-wrap " + (minha ? "msg-minha" : "msg-dele")}>
                  {!minha && <p className="msg-autor">{m.autorNome || "alguém"}</p>}
                  <img src={m.fotoURL} alt="" className="msg-foto" onClick={() => setFotoAmpliada(m.fotoURL)} />
                  {m.texto && <p className="msg-foto-legenda">{m.texto}</p>}
                </div>
              );
            }
            return (
              <div key={m.id} className={"msg " + (minha ? "msg-minha" : "msg-dele")}>
                {!minha && <p className="msg-autor">{m.autorNome || "alguém"}</p>}
                {m.texto}
              </div>
            );
          })}
          <div ref={fimRef} />
        </div>
      </div>

      {pickerAberto && <StickerPicker onSelect={enviarFigurinha} />}

      <div className="chat-input-bar">
        <button className="chat-sticker-btn" onClick={() => setPickerAberto(!pickerAberto)} aria-label="figurinhas"><Smile size={22} /></button>
        <button className="chat-sticker-btn" onClick={() => fotoRef.current?.click()} disabled={enviandoFoto} aria-label="enviar foto"><ImageIcon size={22} /></button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={enviarFoto} />
        <input className="chat-input" placeholder="mensagem..." value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          onFocus={() => setPickerAberto(false)} />
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
