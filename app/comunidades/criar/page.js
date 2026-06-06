"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

export default function CriarGrupoPage() {
  return (
    <AppShell>
      <CriarGrupo />
    </AppShell>
  );
}

function CriarGrupo() {
  const { user } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "usuarios"), limit(200)));
        setUsuarios(
          snap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u) => u.uid !== user?.uid)
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  function alternar(uid) {
    setSelecionados((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  }

  async function criar() {
    if (!nome.trim()) {
      alert("dá um nome pro grupo!");
      return;
    }
    if (selecionados.length === 0) {
      alert("adiciona pelo menos 1 pessoa!");
      return;
    }
    setCriando(true);
    try {
      const membros = [user.uid, ...selecionados];
      const ref = await addDoc(collection(db, "grupos"), {
        nome: nome.trim(),
        criadoPor: user.uid,
        membros,
        ultimaMensagem: "",
        timestamp: serverTimestamp(),
        criadoEm: serverTimestamp(),
      });
      router.push(`/comunidades/${ref.id}`);
    } catch (e) {
      console.error(e);
      alert("não consegui criar o grupo. tenta de novo.");
      setCriando(false);
    }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px" }}>criar grupo</p>
      <section className="card">
        <div className="campo">
          <label>nome do grupo</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: galera do trybut"
          />
        </div>

        <p className="card-titulo" style={{ marginTop: 14 }}>
          adicionar membros ({selecionados.length})
        </p>

        {usuarios.length === 0 && <p className="vazio">nenhum usuário encontrado.</p>}

        {usuarios.map((u) => (
          <div key={u.uid} className="membro-item" onClick={() => alternar(u.uid)}>
            <div className="avatar-mini">
              {u.fotoURL ? (
                <img src={u.fotoURL} className="avatar-img" alt="" />
              ) : (
                (u.nome || "?").charAt(0).toUpperCase()
              )}
            </div>
            <span style={{ flex: 1 }}>{u.nome || "sem nome"}</span>
            <div className={"membro-check" + (selecionados.includes(u.uid) ? " ativo" : "")} />
          </div>
        ))}

        <button
          className="btn-primario"
          style={{ marginTop: 16 }}
          onClick={criar}
          disabled={criando}
        >
          {criando ? "criando..." : "criar grupo"}
        </button>
      </section>
    </>
  );
}
