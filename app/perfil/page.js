"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";

export default function PerfilPage() {
  return (
    <AppShell>
      <Perfil />
    </AppShell>
  );
}

function Perfil() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [bio, setBio] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef(null);

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

  function abrirSeletor() {
    if (!enviandoFoto) fileRef.current?.click();
  }

  async function onSelecionarFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setEnviandoFoto(true);
    try {
      const url = await uploadCloudinary(file);
      await updateDoc(doc(db, "usuarios", user.uid), { fotoURL: url });
      setPerfil((p) => ({ ...p, fotoURL: url }));
    } catch (err) {
      console.error(err);
      alert("não consegui enviar a foto. tenta de novo.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  if (!perfil) return <p className="vazio">carregando...</p>;

  const nomeMostrado = perfil.nome || "sem nome";
  const local = perfil.cidade ? perfil.cidade : "Brasil";

  return (
    <>
      <section className="card">
        <div className="perfil-cabecalho">
          <div className="avatar" onClick={abrirSeletor} title="trocar foto">
            {perfil.fotoURL ? (
              <img src={perfil.fotoURL} alt="foto de perfil" className="avatar-img" />
            ) : (
              nomeMostrado.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="perfil-nome">{nomeMostrado}</p>
            <p className="perfil-local">{local} · online agora</p>
            <button className="link-foto" onClick={abrirSeletor} disabled={enviandoFoto}>
              {enviandoFoto ? "enviando..." : "trocar foto"}
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onSelecionarFoto}
        />

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

      <button className="btn-sair" onClick={() => signOut(auth)}>
        sair da conta
      </button>
    </>
  );
}