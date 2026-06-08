"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Home, MessageCircle, Users, Search, Share2 } from "lucide-react";

async function convidarAmigos() {
  const dados = {
    title: "trybut",
    text: "Entra no trybut comigo! sua tribo, do seu jeito",
    url: "https://trybut.vercel.app",
  };
  if (navigator.share) {
    try { await navigator.share(dados); } catch (e) { /* cancelou */ }
  } else {
    try {
      await navigator.clipboard.writeText(`${dados.text} ${dados.url}`);
      alert("link copiado! cole no WhatsApp e mande pros amigos.");
    } catch (e) {
      alert("trybut.vercel.app — copia e manda pros amigos!");
    }
  }
}

export default function SidebarEsq() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "usuarios", user.uid)).then((s) =>
      setPerfil(s.exists() ? s.data() : {})
    );
  }, [user]);

  return (
    <aside className="sidebar sidebar-esq">
      {user && (
        <Link href={`/perfil/${user.uid}`} className="side-perfil">
          <div className="avatar-mini">
            {perfil?.fotoURL ? (
              <img src={perfil.fotoURL} className="avatar-img" alt="" />
            ) : (
              (perfil?.nome || "?").charAt(0).toUpperCase()
            )}
          </div>
          <span>{perfil?.nome || "meu perfil"}</span>
        </Link>
      )}
      <Link href="/" className="side-link"><Home size={22} /> início</Link>
      <Link href="/mensagens" className="side-link"><MessageCircle size={22} /> mensagens</Link>
      <Link href="/comunidades" className="side-link"><Users size={22} /> comunidades</Link>
      <Link href="/buscar" className="side-link"><Search size={22} /> buscar pessoas</Link>
      <div className="side-divisor" />
      <button className="side-link side-convite" onClick={convidarAmigos}>
        <Share2 size={22} /> convide amigos
      </button>
    </aside>
  );
}
