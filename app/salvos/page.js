"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  collection, query, orderBy, getDocs, getDoc, doc, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { Bookmark } from "lucide-react";

function tempoRelativo(ts) {
  if (!ts?.seconds) return "";
  const seg = Math.floor(Date.now() / 1000 - ts.seconds);
  if (seg < 60) return "agora";
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  return `há ${Math.floor(seg / 86400)} d`;
}

export default function SalvosPage() {
  return (
    <AppShell>
      <Salvos />
    </AppShell>
  );
}

function Salvos() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(
          collection(db, "usuarios", user.uid, "salvos"),
          orderBy("criadoEm", "desc")
        );
        const snap = await getDocs(q);
        const resultados = await Promise.all(
          snap.docs.map(async (d) => {
            const postSnap = await getDoc(doc(db, "posts", d.id));
            if (!postSnap.exists()) return null;
            return { id: d.id, ...postSnap.data() };
          })
        );
        setPosts(resultados.filter(Boolean));
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, [user]);

  async function remover(postId) {
    try {
      await deleteDoc(doc(db, "usuarios", user.uid, "salvos", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
      alert("não consegui remover. tenta de novo.");
    }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px", fontSize: 18, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Bookmark size={20} /> posts salvos
      </p>

      {carregando ? (
        <p className="vazio">carregando...</p>
      ) : posts.length === 0 ? (
        <p className="vazio">você não salvou nenhum post ainda. use o 🔖 nos posts pra salvar!</p>
      ) : (
        <section className="card" style={{ padding: 0 }}>
          {posts.map((post) => (
            <div key={post.id} className="salvos-card">
              <div className="salvos-topo">
                <div className="avatar-mini" style={{ flexShrink: 0 }}>
                  {post.autorFoto
                    ? <img src={post.autorFoto} className="avatar-img" alt="" />
                    : (post.autorNome || "?").charAt(0).toUpperCase()}
                </div>
                <Link href={`/perfil/${post.autorUid}`} className="salvos-autor">
                  {post.autorNome || "alguém"}
                </Link>
                <span className="salvos-tempo">{tempoRelativo(post.criadoEm)}</span>
              </div>

              {post.texto && <p className="salvos-texto">{post.texto}</p>}
              {post.fotoURL && post.tipo !== "enquete" && (
                <img src={post.fotoURL} alt="" className="salvos-imagem" />
              )}
              {post.tipo === "enquete" && (
                <p className="salvos-texto" style={{ color: "var(--texto-fraco)", fontStyle: "italic" }}>
                  📊 enquete: {post.texto}
                </p>
              )}

              <div className="salvos-acoes">
                <button className="salvos-remover" onClick={() => remover(post.id)}>
                  remover
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
