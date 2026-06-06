"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { Search } from "lucide-react";

export default function BuscarPage() {
  return (
    <AppShell>
      <Buscar />
    </AppShell>
  );
}

function Buscar() {
  const { user } = useAuth();
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "usuarios"), limit(200)));
        setUsuarios(
          snap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u) => u.uid !== user?.uid)
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  const t = termo.trim().toLowerCase();
  const filtrados = t.length >= 2
    ? usuarios.filter((u) => (u.nome || "").toLowerCase().includes(t))
    : [];

  return (
    <>
      <div className="busca-barra">
        <Search size={18} />
        <input
          className="busca-input"
          placeholder="buscar pessoas pelo nome..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </div>

      {t.length === 0 && (
        <p className="vazio">digite o nome de alguém para encontrar.</p>
      )}

      {t.length === 1 && (
        <p className="vazio">continue digitando...</p>
      )}

      {t.length >= 2 && filtrados.length === 0 && (
        <p className="vazio">ninguém encontrado com esse nome.</p>
      )}

      {filtrados.map((u) => (
        <Link key={u.uid} href={`/perfil/${u.uid}`} className="card pessoa-item">
          <div className="avatar-mini">
            {u.fotoURL ? (
              <img src={u.fotoURL} alt="" className="avatar-img" />
            ) : (
              (u.nome || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="pessoa-nome">{u.nome || "sem nome"}</p>
            <p className="pessoa-cidade">{u.cidade || "Brasil"}</p>
          </div>
        </Link>
      ))}
    </>
  );
}
