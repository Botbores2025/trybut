"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { Plus } from "lucide-react";

export default function ComunidadesPage() {
  return (
    <AppShell>
      <Comunidades />
    </AppShell>
  );
}

function Comunidades() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "grupos"),
      where("membros", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setGrupos(lista);
        setCarregando(false);
      },
      () => setCarregando(false)
    );
    return () => unsub();
  }, [user]);

  return (
    <>
      <div className="grupos-topo">
        <p className="card-titulo">grupos</p>
        <Link href="/comunidades/criar" className="btn-criar-grupo">
          <Plus size={18} /> criar grupo
        </Link>
      </div>

      {carregando && <p className="vazio">carregando...</p>}

      {!carregando && grupos.length === 0 && (
        <p className="vazio">nenhum grupo ainda. crie o primeiro!</p>
      )}

      {grupos.map((g) => (
        <Link key={g.id} href={`/comunidades/${g.id}`} className="card pessoa-item">
          <div className="avatar-mini grupo-avatar">
            {g.nome ? g.nome.charAt(0).toUpperCase() : "G"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="pessoa-nome">{g.nome || "grupo"}</p>
            <p className="pessoa-cidade conversa-previa">
              {g.ultimaMensagem
                ? g.ultimaMensagem
                : `${(g.membros || []).length} membros`}
            </p>
          </div>
        </Link>
      ))}
    </>
  );
}
