"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadCloudinary } from "@/lib/cloudinary";
import { adicionarXp, XP_ACOES } from "@/lib/xp";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { ArrowLeft, X, Plus } from "lucide-react";

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

export default function CriarAnuncioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef(null);

  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [preco, setPreco] = useState("");
  const [doacao, setDoacao] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [condicao, setCondicao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file || fotos.length >= 5) return;
    setFotos((prev) => [...prev, file]);
    const url = URL.createObjectURL(file);
    setPreviews((prev) => [...prev, url]);
    e.target.value = "";
  }

  function removerFoto(idx) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function publicar() {
    if (!titulo.trim()) { alert("informe o título do anúncio"); return; }
    if (!categoria) { alert("selecione uma categoria"); return; }
    if (!condicao) { alert("selecione a condição do produto"); return; }

    setEnviando(true);
    try {
      const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
      const perfil = perfilSnap.exists() ? perfilSnap.data() : {};

      const urlsFotos = await Promise.all(fotos.map((f) => uploadCloudinary(f)));

      await addDoc(collection(db, "anuncios"), {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco: doacao ? 0 : Number(preco) || 0,
        categoria,
        condicao,
        fotos: urlsFotos,
        autorUid: user.uid,
        autorNome: perfil.nome || "usuário",
        autorFoto: perfil.fotoURL || "",
        cidade: perfil.cidade || "",
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      adicionarXp(user.uid, XP_ACOES.ANUNCIO);

      router.push("/bazar");
    } catch (e) {
      console.error(e);
      alert("erro ao publicar anúncio. tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <div className="bazar-topo">
        <Link href="/bazar" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--texto-fraco)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          <ArrowLeft size={18} /> voltar
        </Link>
        <h1 className="bazar-titulo" style={{ fontSize: "18px" }}>novo anúncio</h1>
      </div>

      <div className="campo">
        <label>fotos (até 5)</label>
        <div className="fotos-grid">
          {previews.map((url, i) => (
            <div key={i} className="foto-slot">
              <img src={url} alt="" />
              <button className="foto-slot-rm" onClick={() => removerFoto(i)} type="button">
                <X size={12} />
              </button>
            </div>
          ))}
          {fotos.length < 5 && (
            <div className="foto-slot" onClick={() => fileRef.current?.click()}>
              <span className="foto-slot-add"><Plus size={28} /></span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFotoChange}
        />
      </div>

      <div className="campo">
        <label>título</label>
        <input
          type="text"
          placeholder="o que você está vendendo?"
          maxLength={80}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>preço</label>
        <input
          type="number"
          placeholder="preço em R$"
          min={0}
          step={0.01}
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          disabled={doacao}
        />
        <div className="doacao-check" style={{ marginTop: "10px", marginBottom: 0 }}>
          <input
            type="checkbox"
            id="doacao"
            checked={doacao}
            onChange={(e) => {
              setDoacao(e.target.checked);
              if (e.target.checked) setPreco("0");
            }}
          />
          <label htmlFor="doacao" style={{ margin: 0, fontSize: "14px", color: "var(--texto-fraco)", fontWeight: 600 }}>
            estou doando (grátis)
          </label>
        </div>
      </div>

      <div className="campo">
        <label>categoria</label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">selecione uma categoria</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>condição</label>
        <div className="condicao-btns">
          {["novo", "seminovo", "usado"].map((op) => (
            <button
              key={op}
              type="button"
              className={`condicao-btn${condicao === op ? " ativo" : ""}`}
              onClick={() => setCondicao(op)}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <label>descrição</label>
        <textarea
          placeholder="descreva seu produto..."
          maxLength={500}
          rows={4}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <button
        className="btn-primario"
        onClick={publicar}
        disabled={enviando}
        style={{ marginTop: "8px" }}
      >
        {enviando ? "publicando..." : "publicar anúncio"}
      </button>
    </AppShell>
  );
}
