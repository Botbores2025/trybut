"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, getDocs, updateDoc, addDoc, collection, query, orderBy,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove, where, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import AppShell from "@/components/AppShell";
import StickerPicker from "@/components/StickerPicker";
import { ArrowLeft, Send, Smile, Image as ImageIcon, X, Mic, Square, Pencil, UserPlus, LogOut } from "lucide-react";

export default function GrupoChatPage() {
  return <AppShell><GrupoChat /></AppShell>;
}

function GrupoChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [grupo, setGrupo] = useState(null);
  const [eu, setEu] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [pickerAberto, setPickerAberto] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [painelConfig, setPainelConfig] = useState(false);
  const [membrosInfo, setMembrosInfo] = useState([]);
  const [adicionandoMembro, setAdicionandoMembro] = useState(false);
  const [buscaMembro, setBuscaMembro] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const fimRef = useRef(null);
  const fotoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (!id || !user) return;
    const unsubGrupo = onSnapshot(doc(db, "grupos", id), (s) =>
      setGrupo(s.exists() ? { id: s.id, ...s.data() } : null)
    );
    getDoc(doc(db, "usuarios", user.uid)).then((s) => setEu(s.exists() ? s.data() : {}));
    return () => unsubGrupo();
  }, [id, user]);

  useEffect(() => {
    if (!grupo?.membros?.length) { setMembrosInfo([]); return; }
    Promise.all(
      grupo.membros.map((uid) =>
        getDoc(doc(db, "usuarios", uid)).then((s) => s.exists() ? { uid, ...s.data() } : { uid, nome: "usuário" })
      )
    ).then(setMembrosInfo);
  }, [grupo]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "grupos", id, "mensagens"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => { setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [id]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function enviarMsg(t, tipo, fotoURL, audioURL) {
    if (!id || !user) return;
    setTexto(""); setPickerAberto(false);
    try {
      const msgData = { texto: t || "", tipo: tipo || "texto", autorUid: user.uid, autorNome: eu?.nome || "eu", timestamp: serverTimestamp() };
      if (fotoURL) msgData.fotoURL = fotoURL;
      if (audioURL) msgData.audioURL = audioURL;
      await addDoc(collection(db, "grupos", id, "mensagens"), msgData);
      const previa = tipo === "figurinha" ? "enviou uma figurinha" : tipo === "foto" ? "enviou uma foto" : tipo === "audio" ? "enviou um áudio" : t;
      await updateDoc(doc(db, "grupos", id), { ultimaMensagem: previa, ultimoAutor: user.uid, timestamp: serverTimestamp() });
    } catch (e) { console.error(e); alert("não consegui enviar."); }
  }

  function enviar() { const t = texto.trim(); if (t) enviarMsg(t, "texto"); }
  function enviarFigurinha(emoji) { enviarMsg(emoji, "figurinha"); }

  async function enviarFoto(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setEnviandoFoto(true);
    try { const url = await uploadCloudinary(file); await enviarMsg("", "foto", url); }
    catch (err) { console.error(err); alert("não consegui enviar a foto."); }
    finally { setEnviandoFoto(false); }
  }

  async function toggleGravar() {
    if (gravando) { mediaRecorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setGravando(false); setEnviandoAudio(true);
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await enviarMsg("", "audio", null, dataUrl);
        } catch (e) { console.error(e); alert("não consegui enviar o áudio."); }
        finally { setEnviandoAudio(false); }
      };
      mr.start(); setGravando(true);
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 60000);
    } catch (e) { console.error(e); alert("não consegui acessar o microfone."); }
  }

  async function salvarNome() {
    const nome = novoNome.trim();
    if (!nome) return;
    try {
      await updateDoc(doc(db, "grupos", id), { nome });
      setEditandoNome(false);
    } catch (e) { console.error(e); alert("não consegui salvar o nome."); }
  }

  async function buscarUsuarios(texto) {
    if (!texto.trim()) { setResultadosBusca([]); return; }
    try {
      const snap = await getDocs(
        query(collection(db, "usuarios"), where("nome", ">=", texto), where("nome", "<=", texto + ""), limit(5))
      );
      setResultadosBusca(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }

  async function adicionarMembro(uid) {
    try {
      await updateDoc(doc(db, "grupos", id), { membros: arrayUnion(uid) });
      setResultadosBusca([]);
      setBuscaMembro("");
    } catch (e) { console.error(e); alert("não consegui adicionar."); }
  }

  async function removerMembro(uid) {
    try {
      await updateDoc(doc(db, "grupos", id), { membros: arrayRemove(uid) });
    } catch (e) { console.error(e); alert("não consegui remover."); }
  }

  async function sairDoGrupo() {
    if (!window.confirm("tem certeza que quer sair do grupo?")) return;
    try {
      await updateDoc(doc(db, "grupos", id), { membros: arrayRemove(user.uid) });
      router.push("/comunidades");
    } catch (e) { console.error(e); alert("não consegui sair do grupo."); }
  }

  if (!grupo) return <p className="vazio">carregando...</p>;

  const ehCriador = grupo.criadoPor === user?.uid;

  return (
    <div className="chat">
      <div className="chat-topo" style={{ cursor: "default" }}>
        <Link href="/comunidades" style={{ color: "inherit", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={20} />
        </Link>
        <div className="avatar-mini grupo-avatar">{grupo.nome ? grupo.nome.charAt(0).toUpperCase() : "G"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {editandoNome ? (
              <>
                <input
                  className="chat-input"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarNome();
                    if (e.key === "Escape") { setEditandoNome(false); setNovoNome(grupo.nome); }
                  }}
                  style={{ height: 28, fontSize: 14, fontWeight: 700, padding: "2px 8px", maxWidth: 140 }}
                  autoFocus
                />
                <button onClick={salvarNome} style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 6, background: "var(--primaria)", color: "#fff", cursor: "pointer" }}>ok</button>
                <button onClick={() => { setEditandoNome(false); setNovoNome(grupo.nome); }} style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 6, background: "var(--borda)", cursor: "pointer", color: "var(--texto)" }}>✕</button>
              </>
            ) : (
              <>
                <span className="chat-nome">{grupo.nome}</span>
                {ehCriador && (
                  <button
                    onClick={() => { setEditandoNome(true); setNovoNome(grupo.nome); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--texto-fraco)", padding: 2, display: "flex", alignItems: "center" }}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--texto-fraco)" }}>{(grupo.membros || []).length} membros</p>
        </div>
        <button
          onClick={() => setPainelConfig(!painelConfig)}
          style={{ background: "none", border: "none", cursor: "pointer", color: painelConfig ? "var(--primaria)" : "var(--texto-fraco)", padding: 4, display: "flex", alignItems: "center" }}
          aria-label="gerenciar grupo"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {painelConfig && (
        <div className="grupo-config">
          {ehCriador && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => setAdicionandoMembro(!adicionandoMembro)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--borda)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--texto)", fontSize: 13, fontFamily: "inherit" }}
              >
                <UserPlus size={14} /> adicionar membro
              </button>
              {adicionandoMembro && (
                <div style={{ marginTop: 8 }}>
                  <input
                    className="chat-input"
                    placeholder="buscar usuário..."
                    value={buscaMembro}
                    onChange={(e) => { setBuscaMembro(e.target.value); buscarUsuarios(e.target.value); }}
                    style={{ marginBottom: 6, width: "100%", boxSizing: "border-box" }}
                  />
                  {resultadosBusca.map((u) => (
                    <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <div className="avatar-mini" style={{ width: 28, height: 28, fontSize: 13, flexShrink: 0 }}>
                        {u.fotoURL ? <img src={u.fotoURL} className="avatar-img" alt="" /> : (u.nome || "?").charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 13 }}>{u.nome}</span>
                      {(grupo.membros || []).includes(u.uid)
                        ? <span style={{ fontSize: 11, color: "var(--texto-fraco)" }}>já membro</span>
                        : <button onClick={() => adicionarMembro(u.uid)} style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 6, background: "var(--primaria)", color: "#fff", cursor: "pointer" }}>adicionar</button>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            {membrosInfo.map((m) => (
              <div key={m.uid} className="grupo-membro">
                <Link href={`/perfil/${m.uid}`} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, textDecoration: "none", color: "inherit" }}>
                  <div className="avatar-mini" style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}>
                    {m.fotoURL ? <img src={m.fotoURL} className="avatar-img" alt="" /> : (m.nome || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="grupo-membro-nome">
                    {m.nome}{m.uid === grupo.criadoPor ? " 👑" : ""}
                  </span>
                </Link>
                {ehCriador && m.uid !== user.uid && (
                  <button className="grupo-membro-rm" onClick={() => removerMembro(m.uid)}>remover</button>
                )}
              </div>
            ))}
          </div>

          <button className="grupo-sair" onClick={sairDoGrupo}>
            <LogOut size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            sair do grupo
          </button>
        </div>
      )}

      <div className="chat-msgs">
        <div className="chat-msgs-inner">
          {msgs.length === 0 && <p className="vazio">grupo criado! manda a primeira mensagem.</p>}
          {(enviandoFoto || enviandoAudio) && <p className="vazio">{enviandoAudio ? "enviando áudio..." : "enviando foto..."}</p>}
          {msgs.map((m) => {
            const minha = m.autorUid === user.uid;
            if (m.tipo === "figurinha") return <div key={m.id} className={"msg-figurinha " + (minha ? "msg-minha" : "msg-dele")}>{!minha && <p className="msg-autor">{m.autorNome}</p>}<span className="figurinha">{m.texto}</span></div>;
            if (m.tipo === "foto") return (
              <div key={m.id} className={"msg msg-foto-wrap " + (minha ? "msg-minha" : "msg-dele")}>
                {!minha && <p className="msg-autor">{m.autorNome}</p>}
                <img src={m.fotoURL} alt="" className="msg-foto" onClick={() => setFotoAmpliada(m.fotoURL)} />
              </div>
            );
            if (m.tipo === "audio" && m.audioURL) return (
              <div key={m.id} className={"msg msg-audio-wrap " + (minha ? "msg-minha" : "msg-dele")}>
                {!minha && <p className="msg-autor">{m.autorNome}</p>}
                <audio src={m.audioURL} controls preload="metadata" className="msg-audio" />
              </div>
            );
            return <div key={m.id} className={"msg " + (minha ? "msg-minha" : "msg-dele")}>{!minha && <p className="msg-autor">{m.autorNome}</p>}{m.texto}</div>;
          })}
          <div ref={fimRef} />
        </div>
      </div>

      {pickerAberto && <StickerPicker onSelect={enviarFigurinha} />}
      <div className="chat-input-bar">
        <button className="chat-sticker-btn" onClick={() => setPickerAberto(!pickerAberto)} aria-label="figurinhas"><Smile size={22} /></button>
        <button className="chat-sticker-btn" onClick={() => fotoRef.current?.click()} disabled={enviandoFoto} aria-label="foto"><ImageIcon size={22} /></button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={enviarFoto} />
        <input className="chat-input" placeholder="mensagem..." value={texto}
          onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          onFocus={() => setPickerAberto(false)} />
        <button className={"chat-mic-btn" + (gravando ? " gravando" : "")} onClick={toggleGravar}
          disabled={enviandoAudio} aria-label={gravando ? "parar" : "gravar"}>{gravando ? <Square size={18} /> : <Mic size={20} />}</button>
        <button className="chat-enviar" onClick={enviar} aria-label="enviar"><Send size={20} /></button>
      </div>
      {fotoAmpliada && (
        <div className="foto-overlay" onClick={() => setFotoAmpliada(null)}>
          <button className="foto-fechar" onClick={() => setFotoAmpliada(null)}><X size={24} /></button>
          <img src={fotoAmpliada} alt="" className="foto-ampliada" />
        </div>
      )}
    </div>
  );
}
