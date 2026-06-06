"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, carregando } = useAuth();
  const router = useRouter();

  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [bio, setBio] = useState("");
  const [salvo, setSalvo] = useState(false);

  // manda pro login se não estiver logado
  useEffect(() => {
    if (!carregando && !user) router.push("/login");
  }, [carregando, user, router]);

  // carrega o perfil do Firestore
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const dados = snap.exists() ? snap.data() : {};
      setPerfil(dados);
      setNome(dados.nome || "");
      setCidade(dados.cidade || "");
      setBio(dados.bio || "");
    })();
  }, [user]);

  async function salvar() {
    if (!user) return;
    const dados = { nome: nome.trim(), cidade: cidade.trim(), bio: bio.trim() };
    try {
      await updateDoc(doc(db, "usuarios", user.uid), dados);
      setPerfil((p) => ({ ...p, ...dados }));
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (e) {
      console.error(e);
      alert("não consegui salvar agora. tenta de novo.");
    }
  }

  if (carregando || !user || !perfil) {
    return <div className="tela-centro"><p className="carregando">carregando...</p></div>;
  }

  const nomeMostrado = perfil.nome || "sem nome";
  const local = perfil.cidade ? perfil.cidade : "Brasil";

  return (
    <>
      <header className="topo">
        <span className="logo logo-topo">trybut</span>
        <button className="btn-icone" onClick={() => signOut(auth)}>
          sair
        </button>
      </header>

      <main className="conteudo">
        {/* Card do perfil */}
        <section className="card">
          <div className="perfil-cabecalho">
            <div className="avatar">{nomeMostrado.charAt(0).toUpperCase()}</div>
            <div>
              <p className="perfil-nome">{nomeMostrado}</p>
              <p className="perfil-local">{local} · online agora</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <strong>{perfil.recadosCount || 0}</strong>
              <span>recados</span>
            </div>
            <div className="stat">
              <strong>{perfil.fasCount || 0}</strong>
              <span>fãs</span>
            </div>
            <div className="stat">
              <strong>{perfil.comunidadesCount || 0}</strong>
              <span>comunidades</span>
            </div>
          </div>
        </section>

        {/* Editar perfil */}
        <section className="card">
          <p className="card-titulo">editar perfil</p>
          <div className="campo">
            <label>nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="seu nome" />
          </div>
          <div className="campo">
            <label>cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="sua cidade" />
          </div>
          <div className="campo">
            <label>quem sou eu</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="escreva algo sobre você..."
            />
          </div>
          <button className="btn-primario" onClick={salvar}>salvar</button>
          {salvo && <p className="salvo">salvo!</p>}
        </section>
      </main>
    </>
  );
}
