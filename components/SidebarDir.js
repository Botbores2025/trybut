"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { buscarSolicitacoesPendentes, aceitarSolicitacao, recusarSolicitacao } from "@/lib/social";

export default function SidebarDir() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [amigos, setAmigos] = useState([]);

  useEffect(() => {
    if (!user) return;
    buscarSolicitacoesPendentes(user.uid).then(setSolicitacoes);
    getDocs(collection(db, "usuarios", user.uid, "amigos")).then((snap) =>
      setAmigos(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    );
  }, [user]);

  async function aceitar(outroUid) {
    await aceitarSolicitacao(user.uid, outroUid);
    setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
    const sol = solicitacoes.find((s) => s.de === outroUid);
    if (sol) setAmigos((prev) => [...prev, { uid: outroUid, nome: sol.deNome, foto: sol.deFoto }]);
  }

  async function recusar(outroUid) {
    await recusarSolicitacao(user.uid, outroUid);
    setSolicitacoes((prev) => prev.filter((s) => s.de !== outroUid));
  }

  return (
    <aside className="sidebar sidebar-dir">
      {solicitacoes.length > 0 && (
        <>
          <p className="side-titulo">solicitações de amizade</p>
          {solicitacoes.map((s) => (
            <div key={s.id} className="side-solicitacao">
              <Link href={`/perfil/${s.de}`} className="side-pessoa">
                <div className="avatar-mini">
                  {s.deFoto ? <img src={s.deFoto} className="avatar-img" alt="" /> : (s.deNome || "?").charAt(0).toUpperCase()}
                </div>
                <span>{s.deNome || "alguém"}</span>
              </Link>
              <div className="side-sol-btns">
                <button className="side-btn-aceitar" onClick={() => aceitar(s.de)}>aceitar</button>
                <button className="side-btn-recusar" onClick={() => recusar(s.de)}>recusar</button>
              </div>
            </div>
          ))}
        </>
      )}

      <p className="side-titulo" style={{ marginTop: solicitacoes.length > 0 ? 16 : 0 }}>
        seus amigos
      </p>
      {amigos.length === 0 && (
        <p className="side-vazio">busque pessoas pelo nome e adicione como amigo.</p>
      )}
      {amigos.map((a) => (
        <Link key={a.uid} href={`/perfil/${a.uid}`} className="side-pessoa">
          <div className="avatar-mini">
            {a.foto ? <img src={a.foto} className="avatar-img" alt="" /> : (a.nome || "?").charAt(0).toUpperCase()}
          </div>
          <span>{a.nome || "amigo"}</span>
        </Link>
      ))}
    </aside>
  );
}
