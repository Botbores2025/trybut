"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { idConversa } from "@/lib/chat";
import AppShell from "@/components/AppShell";
import { ArrowLeft, Send } from "lucide-react";

export default function ChatPage() {
  return (
    <AppShell>
      <Chat />
    </AppShell>
  );
}

function Chat() {
  const { uid } = useParams(); // o outro usuário
  const { user } = useAuth();
  const [alvo, setAlvo] = useState(null);
  const [eu, setEu] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef(null);

  const cid = user && uid ? idConversa(user.uid, uid) : null;

  useEffect(() => {
    if (!uid || !user) return;
    getDoc(doc(db, "usuarios", uid)).then((s) => setAlvo(s.exists() ? s.data() : {}));
    getDoc(doc(db, "usuarios", user.uid)).then((s) => setEu(s.exists() ? s.data() : {}));
  }, [uid, user]);

  useEffect(() => {
    if (!cid) return;
    const q = query(
      collection(db, "conversas", cid, "mensagens"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [cid]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviar() {
    const t = texto.trim();
    if (!t || !cid || !user) return;
    setTexto("");
    try {
      await setDoc(
        doc(db, "conversas", cid),
        {
          participantes: [user.uid, uid],
          participantesInfo: {
            [user.uid]: { nome: eu?.nome || "eu", foto: eu?.fotoURL || "" },
            [uid]: { nome: alvo?.nome || "", foto: alvo?.fotoURL || "" },
          },
          ultimaMensagem: t,
          ultimoAutor: user.uid,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
      await addDoc(collection(db, "conversas", cid, "mensagens"), {
        texto: t,
        autorUid: user.uid,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("não consegui enviar. tenta de novo.");
    }
  }

  if (!alvo) return <p className="vazio">carregando...</p>;

  return (
    <div className="chat">
      <Link href={`/perfil/${uid}`} className="chat-topo">
        <ArrowLeft size={20} />
        <div className="avatar-mini">
          {alvo.fotoURL ? (
            <img src={alvo.fotoURL} className="avatar-img" alt="" />
          ) : (
            (alvo.nome || "?").charAt(0).toUpperCase()
          )}
        </div>
        <span className="chat-nome">{alvo.nome || "usuário"}</span>
      </Link>

      <div className="chat-msgs">
        {msgs.length === 0 && (
          <p className="vazio">nenhuma mensagem ainda. manda a primeira!</p>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={"msg " + (m.autorUid === user.uid ? "msg-minha" : "msg-dele")}
          >
            {m.texto}
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="mensagem..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviar();
          }}
        />
        <button className="chat-enviar" onClick={enviar} aria-label="enviar">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
