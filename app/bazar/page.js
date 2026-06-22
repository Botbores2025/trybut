"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AppShell from "@/components/AppShell";
import { ShoppingBag, Plus } from "lucide-react";

const CATEGORIAS = [
  { id: "eletronicos", nome: "eletrônicos", emoji: "📱" },
  { id: "roupas", nome: "roupas & acessórios", emoji: "👕" },
  { id: "casa", nome: "casa & decoração", emoji: "🏠" },
  { id: "esportes", nome: "esportes & lazer", emoji: "⚽" },
  { id: "veiculos", nome: "veículos", emoji: "🚗" },
  { id: "livros", nome: "livros & games", emoji: "📚" },
  { id: "musica", nome: "instrumentos musicais", emoji: "🎸" },
  { id: "pets", nome: "pets & animais", emoji: "🐾" },
  { id: "servicos", nome: "serviços", emoji: "🔧" },
  { id: "outros", nome: "outros", emoji: "📦" },
];

function formatarPreco(preco) {
  if (preco === 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preco);
}

function CardAnuncio({ anuncio }) {
  const cat = CATEGORIAS.find((c) => c.id === anuncio.categoria);
  const precoFormatado = formatarPreco(anuncio.preco);

  return (
    <Link href={`/bazar/${anuncio.id}`} className="bazar-card">
      <div className="bazar-card-foto">
        {anuncio.fotos && anuncio.fotos[0] ? (
          <img src={anuncio.fotos[0]} alt={anuncio.titulo} />
        ) : (
          <span className="bazar-emoji-placeholder">{cat?.emoji || "📦"}</span>
        )}
        <span className={`bazar-badge-preco${anuncio.preco === 0 ? " bazar-badge-gratis" : ""}`}>
          {anuncio.preco === 0 ? "grátis" : precoFormatado}
        </span>
      </div>
      <div className="bazar-card-info">
        <p className="bazar-card-titulo">{anuncio.titulo}</p>
        <p className="bazar-card-cidade">{anuncio.cidade}</p>
      </div>
    </Link>
  );
}

export default function BazarPage() {
  const [anuncios, setAnuncios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const q = query(
          collection(db, "anuncios"),
          orderBy("criadoEm", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const ativos = todos.filter((a) => a.ativo !== false);
        const filtrados = categoriaAtiva === "todos"
          ? ativos
          : ativos.filter((a) => a.categoria === categoriaAtiva);
        setAnuncios(filtrados);
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [categoriaAtiva]);

  const anunciosFiltrados = busca.trim()
    ? anuncios.filter((a) =>
        a.titulo.toLowerCase().includes(busca.toLowerCase())
      )
    : anuncios;

  return (
    <AppShell>
      <div className="bazar-topo">
        <h1 className="bazar-titulo">
          <ShoppingBag size={22} /> bazar
        </h1>
        <Link href="/bazar/criar" className="btn-primario" style={{ width: "auto", padding: "9px 18px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
          <Plus size={16} /> anunciar
        </Link>
      </div>

      <div className="bazar-filtros">
        <button
          className={`bazar-chip${categoriaAtiva === "todos" ? " ativo" : ""}`}
          onClick={() => setCategoriaAtiva("todos")}
        >
          todos
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.id}
            className={`bazar-chip${categoriaAtiva === cat.id ? " ativo" : ""}`}
            onClick={() => setCategoriaAtiva(cat.id)}
          >
            {cat.emoji} {cat.nome}
          </button>
        ))}
      </div>

      <input
        className="bazar-busca"
        type="text"
        placeholder="buscar no bazar..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {carregando ? (
        <p className="vazio">carregando anúncios...</p>
      ) : anunciosFiltrados.length === 0 ? (
        <p className="vazio">nenhum anúncio encontrado</p>
      ) : (
        <div className="bazar-grid">
          {anunciosFiltrados.map((a) => (
            <CardAnuncio key={a.id} anuncio={a} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
