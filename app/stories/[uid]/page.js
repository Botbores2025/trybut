"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AppShell from "@/components/AppShell";
import { X } from "lucide-react";

export default function StoryViewerPage() {
  return <AppShell><StoryViewer /></AppShell>;
}

function StoryViewer() {
  const { uid } = useParams();
  const router = useRouter();
  const [story, setStory] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "stories"), where("autorUid", "==", uid));
        const snap = await getDocs(q);
        const agora = Date.now() / 1000;
        const recentes = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.criadoEm?.seconds > agora - 86400)
          .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setStory(recentes[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, [uid]);

  if (carregando) return <p className="vazio">carregando...</p>;
  if (!story) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <p className="vazio">nenhum story ativo.</p>
        <button className="btn-primario" style={{ marginTop: 16, width: "auto", padding: "10px 24px" }}
          onClick={() => router.push("/")}>voltar pro feed</button>
      </div>
    );
  }

  return (
    <div className="story-viewer">
      <button className="story-fechar" onClick={() => router.push("/")}>
        <X size={24} />
      </button>
      <div className="story-header">
        <div className="avatar-mini">
          {story.autorFoto ? (
            <img src={story.autorFoto} className="avatar-img" alt="" />
          ) : (
            (story.autorNome || "?").charAt(0).toUpperCase()
          )}
        </div>
        <span className="story-autor">{story.autorNome || "alguém"}</span>
      </div>
      {story.fotoURL ? (
        <img src={story.fotoURL} alt="" className="story-imagem" />
      ) : (
        <div className="story-texto-bg">
          <p className="story-texto-conteudo">{story.texto}</p>
        </div>
      )}
      {story.fotoURL && story.texto && (
        <p className="story-legenda">{story.texto}</p>
      )}
    </div>
  );
}
