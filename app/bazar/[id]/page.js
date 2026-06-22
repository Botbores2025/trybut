"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

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

function tempoRelativo(ts) {
  if (!ts) return "";
  const agora = Date.now();
  const data = ts.toDate ? ts.toDate().getTime() : ts;
  const diff = Math.floor((agora - data) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}

function formatarPreco(preco) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preco);
}

export default function DetalheAnuncioPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [anuncio, setAnuncio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDoc(doc(db, "anuncios", id));
        if (snap.exists()) {
          setAnuncio({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  async function marcarVendido() {
    if (processando) return;
    setProcessando(true);
    try {
      await updateDoc(doc(db, "anuncios", id), { ativo: false });
      setAnuncio((prev) => ({ ...prev, ativo: false }));
    } catch (e) {
      alert("erro ao atualizar anúncio");
    } finally {
      setProcessando(false);
    }
  }

  async function excluirAnuncio() {
    if (!confirm("excluir este anúncio?")) return;
    if (processando) return;
    setProcessando(true);
    try {
      await deleteDoc(doc(db, "anuncios", id));
      router.push("/bazar");
    } catch (e) {
      alert("erro ao excluir anúncio");
      setProcessando(false);
    }
  }

  if (carregando) {
    return (
      <AppShell>
        <p className="vazio">carregando...</p>
      </AppShell>
    );
  }

  if (!anuncio) {
    return (
      <AppShell>
        <p className="vazio">anúncio não encontrado</p>
      </AppShell>
    );
  }

  const cat = CATEGORIAS.find((c) => c.id === anuncio.categoria);
  const ehDono = user?.uid === anuncio.autorUid;
  const fotos = anuncio.fotos || [];

  return (
    <AppShell>
      <Link
        href="/bazar"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--texto-fraco)", textDecoration: "none", fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}
      >
        <ArrowLeft size={18} /> voltar ao bazar
      </Link>

      <div className="detalhe-fotos">
        {fotos.length > 0 ? (
          <>
            <div style={{ position: "relative" }}>
              <img
                className="detalhe-foto-principal"
                src={fotos[fotoIdx]}
                alt={anuncio.titulo}
              />
              {!anuncio.ativo && (
                <div className="badge-vendido">vendido</div>
              )}
              {fotos.length > 1 && (
                <>
                  <button
                    onClick={() => setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)}
                    style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setFotoIdx((i) => (i + 1) % fotos.length)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {fotos.length > 1 && (
              <div className="detalhe-dots">
                {fotos.map((_, i) => (
                  <button
                    key={i}
                    className={`detalhe-dot${fotoIdx === i ? " ativo" : ""}`}
                    onClick={() => setFotoIdx(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: "100%", height: 240, background: "var(--laranja-claro)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, position: "relative" }}>
            {cat?.emoji || "📦"}
            {!anuncio.ativo && (
              <div className="badge-vendido">vendido</div>
            )}
          </div>
        )}
      </div>

      <div className={anuncio.preco === 0 ? "detalhe-preco detalhe-preco-gratis" : "detalhe-preco"}>
        {anuncio.preco === 0 ? "grátis" : formatarPreco(anuncio.preco)}
      </div>

      <h2 className="detalhe-titulo">{anuncio.titulo}</h2>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
        <span className="detalhe-condicao">{anuncio.condicao}</span>
        {cat && <span className="detalhe-cat">{cat.emoji} {cat.nome}</span>}
      </div>

      {anuncio.descricao ? (
        <p className="detalhe-desc">{anuncio.descricao}</p>
      ) : null}

      {anuncio.cidade ? (
        <p className="detalhe-local">
          <MapPin size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
          {anuncio.cidade}
        </p>
      ) : null}

      <p className="detalhe-tempo">publicado {tempoRelativo(anuncio.criadoEm)}</p>

      <div className="vendedor-card">
        <Link href={`/perfil/${anuncio.autorUid}`} style={{ textDecoration: "none", flexShrink: 0 }}>
          <div className="avatar-mini" style={{ width: 46, height: 46, fontSize: 20 }}>
            {anuncio.autorFoto ? (
              <img src={anuncio.autorFoto} className="avatar-img" alt="" />
            ) : (
              (anuncio.autorNome || "?").charAt(0).toUpperCase()
            )}
          </div>
        </Link>
        <div className="vendedor-info">
          <Link href={`/perfil/${anuncio.autorUid}`} className="vendedor-nome">
            {anuncio.autorNome}
          </Link>
        </div>
        {!ehDono && (
          <div className="vendedor-btn">
            <Link
              href={`/mensagens/${anuncio.autorUid}`}
              className="btn-primario"
              style={{ width: "auto", padding: "9px 16px", fontSize: "14px", display: "inline-block", textDecoration: "none" }}
            >
              enviar mensagem
            </Link>
          </div>
        )}
      </div>

      {ehDono && (
        <div className="detalhe-acoes">
          {anuncio.ativo && (
            <button
              className="btn-vendido"
              onClick={marcarVendido}
              disabled={processando}
            >
              marcar como vendido
            </button>
          )}
          <button
            className="btn-excluir"
            onClick={excluirAnuncio}
            disabled={processando}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Trash2 size={16} /> excluir
          </button>
        </div>
      )}
    </AppShell>
  );
}
