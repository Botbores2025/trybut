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
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import { buscarAmigosUids } from "@/lib/social";
import AppShell from "@/components/AppShell";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { Heart, MessageCircle, Image as ImageIcon, Trash2 } from "lucide-react";

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

const REACOES = [
  { tipo: "amei", emoji: "❤️" },
  { tipo: "haha", emoji: "😂" },
  { tipo: "uau", emoji: "😮" },
  { tipo: "triste", emoji: "😢" },
  { tipo: "grr", emoji: "😡" },
];

function Post({ post, user, meuPerfil }) {
  const reacoes = post.reacoes || {};
  const minhaReacao = reacoes[user.uid] || null;
  const legacyCurtidas = (post.curtidasPor || []).length;

  // contar reações por tipo
  const contagem = {};
  Object.values(reacoes).forEach((tipo) => {
    contagem[tipo] = (contagem[tipo] || 0) + 1;
  });
  // fallback: posts antigos sem reacoes mostram curtidas como amei
  if (Object.keys(reacoes).length === 0 && legacyCurtidas > 0) {
    contagem["amei"] = legacyCurtidas;
  }
  const totalReacoes = Object.values(contagem).reduce((a, b) => a + b, 0);

  const [pickerAberto, setPickerAberto] = useState(false);
  const [confirmApagar, setConfirmApagar] = useState(false);
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

  async function reagir(tipo) {
    setPickerAberto(false);
    try {
      if (minhaReacao === tipo) {
        await updateDoc(doc(db, "posts", post.id), {
          [`reacoes.${user.uid}`]: deleteField(),
        });
      } else {
        await updateDoc(doc(db, "posts", post.id), {
          [`reacoes.${user.uid}`]: tipo,
        });
      }
    } catch (e) {
      console.error(e);
    }
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

  async function apagar() {
    setConfirmApagar(false);
    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (e) {
      console.error(e);
      alert("não consegui apagar. tenta de novo.");
    }
  }

  return (
    <article className="card post">
      <div className="post-topo">
        <Link href={`/perfil/${post.autorUid}`} className="post-cabecalho post-cabecalho-link">
          <Inicial nome={post.autorNome} foto={post.autorFoto} />
          <div>
            <p className="post-autor">{post.autorNome}</p>
            <p className="post-tempo">{tempoRelativo(post.criadoEm)}</p>
          </div>
        </Link>
        {post.autorUid === user.uid && (
          <button className="post-apagar" onClick={() => setConfirmApagar(true)} title="apagar post">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {confirmApagar && (
        <ConfirmModal
          mensagem="tem certeza que quer apagar esse post?"
          onConfirmar={apagar}
          onCancelar={() => setConfirmApagar(false)}
        />
      )}
      {post.texto && <p className="post-texto">{post.texto}</p>}
      {post.fotoURL && <img src={post.fotoURL} alt="" className="post-imagem" />}

      {totalReacoes > 0 && (
        <div className="reacoes-resumo">
          {Object.entries(contagem).map(([tipo, count]) => {
            const r = REACOES.find((x) => x.tipo === tipo);
            return r ? (
              <span key={tipo} className="reacao-count">{r.emoji} {count}</span>
            ) : null;
          })}
        </div>
      )}

      {pickerAberto && (
        <div className="reacoes-picker">
          {REACOES.map((r) => (
            <button
              key={r.tipo}
              className={"reacao-opcao" + (minhaReacao === r.tipo ? " ativo" : "")}
              onClick={() => reagir(r.tipo)}
              title={r.tipo}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      <div className="post-acoes">
        <button
          className={"post-btn" + (minhaReacao ? " curtido" : "")}
          onClick={() => setPickerAberto((p) => !p)}
        >
          {minhaReacao
            ? REACOES.find((r) => r.tipo === minhaReacao)?.emoji
            : <Heart size={18} />}{" "}
          reagir
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
