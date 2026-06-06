"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";
import { Image as ImageIcon } from "lucide-react";

export default function CriarStoryPage() {
  return <AppShell><CriarStory /></AppShell>;
}

function CriarStory() {
  const { user } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "usuarios", user.uid)).then((s) =>
      setPerfil(s.exists() ? s.data() : {})
    );
  }, [user]);

  async function publicar() {
    if (!user) return;
    const t = texto.trim();
    if (!t && !foto) return;
    setEnviando(true);
    try {
      let fotoURL = "";
      if (foto) fotoURL = await uploadCloudinary(foto);
      await addDoc(collection(db, "stories"), {
        autorUid: user.uid,
        autorNome: perfil?.nome || "alguém",
        autorFoto: perfil?.fotoURL || "",
        texto: t,
        fotoURL,
        criadoEm: serverTimestamp(),
      });
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("não consegui publicar o story.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px" }}>criar story</p>
      <section className="card">
        <textarea
          className="composer-input"
          rows={3}
          placeholder="escreva algo ou adicione uma foto..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        {foto && (
          <p className="composer-foto-aviso">foto selecionada: {foto.name}</p>
        )}
        <div className="composer-acoes">
          <button className="btn-foto" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={18} /> foto
          </button>
          <button
            className="btn-primario btn-publicar"
            onClick={publicar}
            disabled={enviando}
          >
            {enviando ? "publicando..." : "publicar story"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { setFoto(e.target.files?.[0] || null); e.target.value = ""; }}
        />
        <p style={{ fontSize: 12, color: "var(--texto-fraco)", marginTop: 10 }}>
          o story fica visível por 24 horas.
        </p>
      </section>
    </>
  );
}
