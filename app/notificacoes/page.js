"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  collection, query, where, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  buscarSolicitacoesPendentes, aceitarSolicitacao, recusarSolicitacao,
} from "@/lib/social";
import AppShell from "@/components/AppShell";

export default function NotificacoesPage() {
  return <AppShell><Notificacoes /></AppShell>;
}

function Notificacoes() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [postNotifs, setPostNotifs] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [sols, postsSnap] = await Promise.all([
          buscarSolicitacoesPendentes(user.uid),
          getDocs(query(collection(db, "notificacoes"), where("paraUid", "==", user.uid))),
        ]);
        setSolicitacoes(sols);
        const pn = postsSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
        pn.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setPostNotifs(pn.slice(0, 30));

        // marcar como lidas
        const naoLidas = postsSnap.docs.filter((d) => !d.data().lida);
        if (naoLidas.length > 0) {
          const batch = writeBatch(db);
          for (const d of naoLidas) batch.update(d.ref, { lida: true });
          await batch.commit();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, [user]);

  async function aceitar(outroUid) {
    try {
      await aceitarSolicitacao(user.uid, outroUid);
      setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
    } catch (e) { console.error(e); }
  }

  async function recusar(outroUid) {
    try {
      await recusarSolicitacao(user.uid, outroUid);
      setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
    } catch (e) { console.error(e); }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px" }}>notificações</p>
      {carregando && <p className="vazio">carregando...</p>}

      {solicitacoes.length > 0 && (
        <>
          <p className="card-titulo" style={{ padding: "0 4px", marginTop: 8 }}>
            solicitações de amizade
          </p>
          {solicitacoes.map((s) => (
            <div key={s.id} className="card notif-item">
              <Link href={`/perfil/${s.de}`} className="notif-pessoa">
                <div className="avatar-mini">
                  {s.deFoto ? <img src={s.deFoto} className="avatar-img" alt="" />
                    : (s.deNome || "?").charAt(0).toUpperCase()}
                </div>
                <p className="notif-texto"><strong>{s.deNome || "alguém"}</strong> quer ser seu amigo</p>
              </Link>
              <div className="notif-btns">
                <button className="btn-seguir" onClick={() => aceitar(s.de)}>aceitar</button>
                <button className="btn-msg" onClick={() => recusar(s.de)}>recusar</button>
              </div>
            </div>
          ))}
        </>
      )}

      {postNotifs.length > 0 && (
        <>
          <p className="card-titulo" style={{ padding: "0 4px", marginTop: 14 }}>
            atividade dos amigos
          </p>
          {postNotifs.map((n) => (
            <Link key={n.id} href="/" className="card notif-item notif-pessoa">
              <div className="avatar-mini">
                {n.deFoto ? <img src={n.deFoto} className="avatar-img" alt="" />
                  : (n.deNome || "?").charAt(0).toUpperCase()}
              </div>
              <p className="notif-texto">
                <strong>{n.deNome || "alguém"}</strong>{" "}
                {n.temFoto ? "compartilhou uma foto" : "publicou no feed"}
                {n.previa && !n.temFoto ? `: "${n.previa}"` : ""}
              </p>
            </Link>
          ))}
        </>
      )}

      {!carregando && solicitacoes.length === 0 && postNotifs.length === 0 && (
        <p className="vazio">nenhuma notificação no momento.</p>
      )}
    </>
  );
}
