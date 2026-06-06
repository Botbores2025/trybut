"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  buscarSolicitacoesPendentes,
  aceitarSolicitacao,
  recusarSolicitacao,
} from "@/lib/social";
import AppShell from "@/components/AppShell";

export default function NotificacoesPage() {
  return (
    <AppShell>
      <Notificacoes />
    </AppShell>
  );
}

function Notificacoes() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    buscarSolicitacoesPendentes(user.uid).then((lista) => {
      setSolicitacoes(lista);
      setCarregando(false);
    });
  }, [user]);

  async function aceitar(outroUid) {
    try {
      await aceitarSolicitacao(user.uid, outroUid);
      setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
    } catch (e) {
      console.error(e);
      alert("não consegui aceitar. tenta de novo.");
    }
  }

  async function recusar(outroUid) {
    try {
      await recusarSolicitacao(user.uid, outroUid);
      setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
    } catch (e) {
      console.error(e);
      alert("não consegui recusar. tenta de novo.");
    }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px" }}>notificações</p>

      {carregando && <p className="vazio">carregando...</p>}

      {!carregando && solicitacoes.length === 0 && (
        <p className="vazio">nenhuma notificação no momento.</p>
      )}

      {solicitacoes.map((s) => (
        <div key={s.id} className="card notif-item">
          <Link href={`/perfil/${s.de}`} className="notif-pessoa">
            <div className="avatar-mini">
              {s.deFoto ? (
                <img src={s.deFoto} className="avatar-img" alt="" />
              ) : (
                (s.deNome || "?").charAt(0).toUpperCase()
              )}
            </div>
            <p className="notif-texto">
              <strong>{s.deNome || "alguém"}</strong> quer ser seu amigo
            </p>
          </Link>
          <div className="notif-btns">
            <button className="btn-seguir" onClick={() => aceitar(s.de)}>
              aceitar
            </button>
            <button className="btn-msg" onClick={() => recusar(s.de)}>
              recusar
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
