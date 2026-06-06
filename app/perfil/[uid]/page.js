"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import { checarSeguindo, seguir, deixarDeSeguir } from "@/lib/social";
import AppShell from "@/components/AppShell";
import Link from "next/link";

export default function PerfilPage() {
  return (
    <AppShell>
      <Perfil />
    </AppShell>
  );
}

function Perfil() {
  const { uid } = useParams();
  const { user } = useAuth();
  const ehMeu = user && user.uid === uid;

  const [perfil, setPerfil] = useState(null);
  const [posts, setPosts] = useState([]);
  const [seguindo, setSeguindo] = useState(false);
  const [carregandoSeguir, setCarregandoSeguir] = useState(false);

  // campos de edição (só usados no próprio perfil)
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [bio, setBio] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDoc(doc(db, "usuarios", uid));
      const dados = snap.exists() ? snap.data() : {};
      setPerfil(dados);
      setNome(dados.nome || "");
      setCidade(dados.cidade || "");
      setBio(dados.bio || "");

      // posts desse usuário (ordena no cliente pra não precisar de índice)
      const q = query(collection(db, "posts"), where("autorUid", "==", uid));
      const ps = await getDocs(q);
      const lista = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
      setPosts(lista);

      if (user && user.uid !== uid) {
        setSeguindo(await checarSeguindo(user.uid, uid));
      }
    })();
  }, [uid, user]);

  async function salvar() {
    const dados = { nome: nome.trim(), cidade: cidade.trim(), bio: bio.trim() };
    try {
      await updateDoc(doc(db, "usuarios", uid), dados);
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
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const url = await uploadCloudinary(file);
      await updateDoc(doc(db, "usuarios", uid), { fotoURL: url });
      setPerfil((p) => ({ ...p, fotoURL: url }));
    } catch (err) {
      console.error(err);
      alert("não consegui enviar a foto. tenta de novo.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function alternarSeguir() {
    if (!user || carregandoSeguir) return;
    setCarregandoSeguir(true);
    try {
      if (seguindo) {
        await deixarDeSeguir(user.uid, uid);
        setSeguindo(false);
        setPerfil((p) => ({ ...p, seguidoresCount: (p.seguidoresCount || 1) - 1 }));
      } else {
        await seguir(user.uid, uid);
        setSeguindo(true);
        setPerfil((p) => ({ ...p, seguidoresCount: (p.seguidoresCount || 0) + 1 }));
      }
    } catch (e) {
      console.error(e);
      alert("algo deu errado. tenta de novo.");
    } finally {
      setCarregandoSeguir(false);
    }
  }

  if (!perfil) return <p className="vazio">carregando...</p>;

  const nomeMostrado = perfil.nome || "sem nome";
  const local = perfil.cidade ? perfil.cidade : "Brasil";

  return (
    <>
      <section className="card">
        <div className="perfil-cabecalho">
          <div
            className="avatar"
            onClick={ehMeu ? abrirSeletor : undefined}
            title={ehMeu ? "trocar foto" : ""}
            style={{ cursor: ehMeu ? "pointer" : "default" }}
          >
            {perfil.fotoURL ? (
              <img src={perfil.fotoURL} alt="foto de perfil" className="avatar-img" />
            ) : (
              nomeMostrado.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p className="perfil-nome">{nomeMostrado}</p>
            <p className="perfil-local">{local} · online agora</p>
            {ehMeu ? (
              <button className="link-foto" onClick={abrirSeletor} disabled={enviandoFoto}>
                {enviandoFoto ? "enviando..." : "trocar foto"}
              </button>
            ) : (
              <div className="perfil-botoes">
                <button
                  className={"btn-seguir" + (seguindo ? " seguindo" : "")}
                  onClick={alternarSeguir}
                  disabled={carregandoSeguir}
                >
                  {seguindo ? "seguindo" : "seguir"}
                </button>
                <Link href={`/mensagens/${uid}`} className="btn-msg">
                  mensagem
                </Link>
              </div>
            )}
          </div>
        </div>

        {perfil.bio && <p className="perfil-bio">{perfil.bio}</p>}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onSelecionarFoto}
        />

        <div className="stats">
          <div className="stat">
            <strong>{posts.length}</strong>
            <span>posts</span>
          </div>
          <div className="stat">
            <strong>{perfil.seguidoresCount || 0}</strong>
            <span>seguidores</span>
          </div>
          <div className="stat">
            <strong>{perfil.seguindoCount || 0}</strong>
            <span>seguindo</span>
          </div>
        </div>
      </section>

      {ehMeu && (
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
      )}

      <p className="card-titulo" style={{ padding: "0 4px" }}>posts</p>
      {posts.length === 0 && <p className="vazio">nenhum post ainda.</p>}
      {posts.map((post) => (
        <article key={post.id} className="card post">
          {post.texto && <p className="post-texto">{post.texto}</p>}
          {post.fotoURL && <img src={post.fotoURL} alt="" className="post-imagem" />}
          <div className="post-acoes">
            <span className="post-btn">{(post.curtidasPor || []).length} curtidas</span>
            <span className="post-btn">{post.comentariosCount || 0} comentários</span>
          </div>
        </article>
      ))}

      {ehMeu && (
        <button className="btn-sair" onClick={() => signOut(auth)}>
          sair da conta
        </button>
      )}
    </>
  );
}
