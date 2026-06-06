"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

export default function MensagensPage() {
  return (
    <AppShell>
      <Mensagens />
    </AppShell>
  );
}

function Mensagens() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversas"),
      where("participantes", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setConversas(lista);
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setCarregando(false);
      }
    );
    return () => unsub();
  }, [user]);

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px" }}>mensagens</p>
      {carregando && <p className="vazio">carregando...</p>}
      {!carregando && conversas.length === 0 && (
        <p className="vazio">nenhuma conversa ainda. visite um perfil e mande um oi.</p>
      )}
      {conversas.map((c) => {
        const outroUid = (c.participantes || []).find((p) => p !== user.uid);
        const info = (c.participantesInfo || {})[outroUid] || {};
        return (
          <Link key={c.id} href={`/mensagens/${outroUid}`} className="card pessoa-item">
            <div className="avatar-mini">
              {info.foto ? (
                <img src={info.foto} className="avatar-img" alt="" />
              ) : (
                (info.nome || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="pessoa-nome">{info.nome || "usuário"}</p>
              <p className="pessoa-cidade conversa-previa">{c.ultimaMensagem || ""}</p>
            </div>
          </Link>
        );
      })}
    </>
  );
}
