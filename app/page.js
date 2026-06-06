"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";
import { Heart, MessageCircle, Image as ImageIcon } from "lucide-react";

export default function FeedPage() {
  return (
    <AppShell>
      <Feed />
    </AppShell>
  );
}

function tempoRelativo(ts) {
  if (!ts?.toDate) return "agora";
  const seg = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (seg < 60) return "agora";
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  return `há ${Math.floor(seg / 86400)} d`;
}

function Inicial({ nome, foto, classe = "avatar-mini" }) {
  return (
    <div className={classe}>
      {foto ? (
        <img src={foto} alt="" className="avatar-img" />
      ) : (
        (nome || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}

function Feed() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState(null);
  const [posts, setPosts] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "usuarios", user.uid)).then((s) =>
      setPerfil(s.exists() ? s.data() : {})
    );
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("criadoEm", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function publicar() {
    if (!user) return;
    const t = texto.trim();
    if (!t && !foto) return;
    setEnviando(true);
    try {
      let fotoURL = "";
      if (foto) fotoURL = await uploadCloudinary(foto);
      await addDoc(collection(db, "posts"), {
        autorUid: user.uid,
        autorNome: perfil?.nome || "alguém",
        autorFoto: perfil?.fotoURL || "",
        texto: t,
        fotoURL,
        curtidasPor: [],
        comentariosCount: 0,
        criadoEm: serverTimestamp(),
      });
      setTexto("");
      setFoto(null);
    } catch (e) {
      console.error(e);
      alert("não consegui publicar agora. tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="card composer">
        <div className="composer-top">
          <Inicial nome={perfil?.nome} foto={perfil?.fotoURL} />
          <textarea
            className="composer-input"
            rows={2}
            placeholder="compartilhe algo com sua tribo..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        {foto && <p className="composer-foto-aviso">foto selecionada: {foto.name}</p>}
        <div className="composer-acoes">
          <button className="btn-foto" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={18} /> foto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setFoto(e.target.files?.[0] || null)}
          />
          <button
            className="btn-primario btn-publicar"
            onClick={publicar}
            disabled={enviando}
          >
            {enviando ? "publicando..." : "publicar"}
          </button>
        </div>
      </section>

      {posts.length === 0 && (
        <p className="vazio">ainda não tem nada por aqui. seja o primeiro a postar!</p>
      )}

      {posts.map((post) => (
        <Post key={post.id} post={post} user={user} meuPerfil={perfil} />
      ))}
    </>
  );
}

function Post({ post, user, meuPerfil }) {
  const curtiu = (post.curtidasPor || []).includes(user.uid);
  const [aberto, setAberto] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [novo, setNovo] = useState("");
  const [enviandoCom, setEnviandoCom] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const q = query(
      collection(db, "posts", post.id, "comentarios"),
      orderBy("criadoEm", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [aberto, post.id]);

  async function curtir() {
    await updateDoc(doc(db, "posts", post.id), {
      curtidasPor: curtiu ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  }

  async function comentar() {
    const t = novo.trim();
    if (!t) return;
    setEnviandoCom(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comentarios"), {
        autorUid: user.uid,
        autorNome: meuPerfil?.nome || "alguém",
        autorFoto: meuPerfil?.fotoURL || "",
        texto: t,
        criadoEm: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), {
        comentariosCount: increment(1),
      });
      setNovo("");
    } catch (e) {
      console.error(e);
      alert("não consegui comentar agora. tenta de novo.");
    } finally {
      setEnviandoCom(false);
    }
  }

  return (
    <article className="card post">
      <div className="post-cabecalho">
        <Inicial nome={post.autorNome} foto={post.autorFoto} />
        <div>
          <p className="post-autor">{post.autorNome}</p>
          <p className="post-tempo">{tempoRelativo(post.criadoEm)}</p>
        </div>
      </div>
      {post.texto && <p className="post-texto">{post.texto}</p>}
      {post.fotoURL && <img src={post.fotoURL} alt="" className="post-imagem" />}

      <div className="post-acoes">
        <button className={"post-btn" + (curtiu ? " curtido" : "")} onClick={curtir}>
          <Heart size={18} fill={curtiu ? "currentColor" : "none"} />{" "}
          {(post.curtidasPor || []).length}
        </button>
        <button className="post-btn" onClick={() => setAberto((a) => !a)}>
          <MessageCircle size={18} /> {post.comentariosCount || 0}
        </button>
      </div>

      {aberto && (
        <div className="comentarios">
          {comentarios.map((c) => (
            <div key={c.id} className="comentario">
              <Inicial nome={c.autorNome} foto={c.autorFoto} classe="avatar-mini avatar-comentario" />
              <div className="comentario-bolha">
                <p className="comentario-autor">{c.autorNome}</p>
                <p className="comentario-texto">{c.texto}</p>
              </div>
            </div>
          ))}
          <div className="comentario-novo">
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="escreva um comentário..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !enviandoCom) comentar();
              }}
            />
            <button className="btn-comentar" onClick={comentar} disabled={enviandoCom}>
              enviar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}