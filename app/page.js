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
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import { buscarAmigosUids } from "@/lib/social";
import AppShell from "@/components/AppShell";
import Link from "next/link";
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
  const [amigosUids, setAmigosUids] = useState(null);
  const [stories, setStories] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "usuarios", user.uid)).then((s) =>
      setPerfil(s.exists() ? s.data() : {})
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    buscarAmigosUids(user.uid).then((uids) => setAmigosUids(uids));
  }, [user]);

  // carregar stories das últimas 24h (amigos + eu)
  useEffect(() => {
    if (!user || amigosUids === null) return;
    const uids = [user.uid, ...amigosUids];
    (async () => {
      try {
        const snap = await getDocs(collection(db, "stories"));
        const agora = Date.now() / 1000;
        const recentes = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.criadoEm?.seconds > agora - 86400 && uids.includes(s.autorUid));
        const porAutor = {};
        recentes.forEach((s) => {
          if (!porAutor[s.autorUid] || s.criadoEm.seconds > porAutor[s.autorUid].criadoEm.seconds) {
            porAutor[s.autorUid] = s;
          }
        });
        const lista = Object.values(porAutor).sort((a, b) => {
          if (a.autorUid === user.uid) return -1;
          if (b.autorUid === user.uid) return 1;
          return (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0);
        });
        setStories(lista);
      } catch (e) { console.error(e); }
    })();
  }, [user, amigosUids]);

  useEffect(() => {
    if (!user || amigosUids === null) return;
    const uids = [user.uid, ...amigosUids].slice(0, 30);
    let q;
    if (uids.length === 1) {
      q = query(collection(db, "posts"), where("autorUid", "==", uids[0]));
    } else {
      q = query(collection(db, "posts"), where("autorUid", "in", uids));
    }
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
      setPosts(lista);
    });
    return () => unsub();
  }, [user, amigosUids]);

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
      // notificar amigos
      if (amigosUids && amigosUids.length > 0) {
        const nBatch = writeBatch(db);
        const previa = t ? (t.length > 50 ? t.slice(0, 50) + "..." : t) : "compartilhou uma foto";
        for (const aUid of amigosUids.slice(0, 100)) {
          nBatch.set(doc(collection(db, "notificacoes")), {
            tipo: "post",
            deUid: user.uid,
            deNome: perfil?.nome || "alguém",
            deFoto: perfil?.fotoURL || "",
            paraUid: aUid,
            previa,
            temFoto: !!fotoURL,
            timestamp: serverTimestamp(),
            lida: false,
          });
        }
        await nBatch.commit();
      }
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
      {/* barra de stories */}
      <div className="stories-bar">
        <Link href="/stories/criar" className="story-item">
          <div className="story-circle story-criar">
            <Inicial nome={perfil?.nome} foto={perfil?.fotoURL} />
          </div>
          <p className="story-nome">criar</p>
        </Link>
        {stories.filter((s) => s.autorUid !== user.uid).map((s) => (
          <Link key={s.autorUid} href={`/stories/${s.autorUid}`} className="story-item">
            <div className="story-circle">
              <Inicial nome={s.autorNome} foto={s.autorFoto} />
            </div>
            <p className="story-nome">{(s.autorNome || "amigo").split(" ")[0]}</p>
          </Link>
        ))}
        {stories.find((s) => s.autorUid === user.uid) && (
          <Link href={`/stories/${user.uid}`} className="story-item">
            <div className="story-circle story-meu">
              <Inicial nome={perfil?.nome} foto={perfil?.fotoURL} />
            </div>
            <p className="story-nome">meu story</p>
          </Link>
        )}
      </div>

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
      <Link href={`/perfil/${post.autorUid}`} className="post-cabecalho post-cabecalho-link">
        <Inicial nome={post.autorNome} foto={post.autorFoto} />
        <div>
          <p className="post-autor">{post.autorNome}</p>
          <p className="post-tempo">{tempoRelativo(post.criadoEm)}</p>
        </div>
      </Link>
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
