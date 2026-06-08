"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import StickerPicker from "@/components/StickerPicker";
import { ArrowLeft, Send, Smile } from "lucide-react";

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
  const fimRef = useRef(null);

  useEffect(() => {
    if (!id || !user) return;
    getDoc(doc(db, "grupos", id)).then((s) =>
      setGrupo(s.exists() ? { id: s.id, ...s.data() } : null)
    );
    getDoc(doc(db, "usuarios", user.uid)).then((s) =>
      setEu(s.exists() ? s.data() : {})
    );
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "grupos", id, "mensagens"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviarMsg(t, tipo) {
    if (!t || !id || !user) return;
    setTexto("");
    setPickerAberto(false);
    try {
      await addDoc(collection(db, "grupos", id, "mensagens"), {
        texto: t, tipo: tipo || "texto",
        autorUid: user.uid, autorNome: eu?.nome || "eu",
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, "grupos", id), {
        ultimaMensagem: tipo === "figurinha" ? "enviou uma figurinha" : t,
        ultimoAutor: user.uid,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("não consegui enviar. tenta de novo.");
    }
  }

  function enviar() {
    const t = texto.trim();
    if (t) enviarMsg(t, "texto");
  }

  function enviarFigurinha(emoji) {
    enviarMsg(emoji, "figurinha");
  }

  if (!grupo) return <p className="vazio">carregando...</p>;

  return (
    <div className="chat">
      <Link href="/comunidades" className="chat-topo">
        <ArrowLeft size={20} />
        <div className="avatar-mini grupo-avatar">
          {grupo.nome ? grupo.nome.charAt(0).toUpperCase() : "G"}
        </div>
        <div>
          <span className="chat-nome">{grupo.nome}</span>
          <p style={{ margin: 0, fontSize: 12, color: "var(--texto-fraco)" }}>
            {(grupo.membros || []).length} membros
          </p>
        </div>
      </Link>

      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {msgs.length === 0 && <p className="vazio">grupo criado! manda a primeira mensagem.</p>}
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
        <button className="chat-sticker-btn" onClick={() => setPickerAberto(!pickerAberto)}
          aria-label="figurinhas">
          <Smile size={22} />
        </button>
        <input className="chat-input" placeholder="mensagem..." value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          onFocus={() => setPickerAberto(false)} />
        <button className="chat-enviar" onClick={enviar} aria-label="enviar">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
