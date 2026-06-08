"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, setDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { idConversa } from "@/lib/chat";
import AppShell from "@/components/AppShell";
import StickerPicker from "@/components/StickerPicker";
import { ArrowLeft, Send, Smile } from "lucide-react";

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
  const fimRef = useRef(null);

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
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviarMsg(t, tipo) {
    if (!t || !cid || !user) return;
    setTexto("");
    setPickerAberto(false);
    try {
      await setDoc(doc(db, "conversas", cid), {
        participantes: [user.uid, uid],
        participantesInfo: {
          [user.uid]: { nome: eu?.nome || "eu", foto: eu?.fotoURL || "" },
          [uid]: { nome: alvo?.nome || "", foto: alvo?.fotoURL || "" },
        },
        ultimaMensagem: tipo === "figurinha" ? "enviou uma figurinha" : t,
        ultimoAutor: user.uid,
        timestamp: serverTimestamp(),
      }, { merge: true });
      await addDoc(collection(db, "conversas", cid, "mensagens"), {
        texto: t, tipo: tipo || "texto", autorUid: user.uid, timestamp: serverTimestamp(),
      });
      // notificar
      await setDoc(doc(db, "notificacoes", `msg_${user.uid}_${uid}`), {
        tipo: "mensagem",
        deUid: user.uid,
        deNome: eu?.nome || "alguém",
        deFoto: eu?.fotoURL || "",
        paraUid: uid,
        previa: tipo === "figurinha" ? "enviou uma figurinha" : (t.length > 50 ? t.slice(0, 50) + "..." : t),
        timestamp: serverTimestamp(),
        lida: false,
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
          {msgs.map((m) => {
            const minha = m.autorUid === user.uid;
            if (m.tipo === "figurinha") {
              return (
                <div key={m.id} className={"msg-figurinha " + (minha ? "msg-minha" : "msg-dele")}>
                  <span className="figurinha">{m.texto}</span>
                </div>
              );
            }
            return (
              <div key={m.id} className={"msg " + (minha ? "msg-minha" : "msg-dele")}>
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
