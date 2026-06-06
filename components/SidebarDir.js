"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function SidebarDir() {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "usuarios"), limit(10)));
        const lista = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) => u.uid !== user?.uid)
          .slice(0, 5);
        setPessoas(lista);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  return (
    <aside className="sidebar sidebar-dir">
      <p className="side-titulo">pessoas no trybut</p>
      {pessoas.length === 0 && <p className="side-vazio">ninguém ainda.</p>}
      {pessoas.map((p) => (
        <Link key={p.uid} href={`/perfil/${p.uid}`} className="side-pessoa">
          <div className="avatar-mini">
            {p.fotoURL ? (
              <img src={p.fotoURL} className="avatar-img" alt="" />
            ) : (
              (p.nome || "?").charAt(0).toUpperCase()
            )}
          </div>
          <span>{p.nome || "sem nome"}</span>
        </Link>
      ))}
    </aside>
  );
}
