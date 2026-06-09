"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { uploadCloudinary } from "@/lib/cloudinary";
import {
  checarRelacao, enviarSolicitacao, aceitarSolicitacao, recusarSolicitacao,
  desfazerAmizade, bloquear, desbloquear,
} from "@/lib/social";
import AppShell from "@/components/AppShell";
import ConfirmModal from "@/components/ConfirmModal";
import { Share2 } from "lucide-react";

export default function PerfilPage() {
  return <AppShell><Perfil /></AppShell>;
}

function Perfil() {
  const { uid } = useParams();
  const { user } = useAuth();
  const ehMeu = user && user.uid === uid;

  const [perfil, setPerfil] = useState(null);
  const [meuPerfil, setMeuPerfil] = useState(null);
  const [posts, setPosts] = useState([]);
  const [relacao, setRelacao] = useState(null);
  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [mostraAmigos, setMostraAmigos] = useState(false);
  const [listaAmigos, setListaAmigos] = useState([]);

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [bio, setBio] = useState("");
  const [trabalho, setTrabalho] = useState("");
  const [escola, setEscola] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [relacionamento, setRelacionamento] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef(null);
  const capaRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDoc(doc(db, "usuarios", uid));
      const dados = snap.exists() ? snap.data() : {};
      setPerfil(dados);
      setNome(dados.nome || "");
      setCidade(dados.cidade || "");
      setBio(dados.bio || "");
      setTrabalho(dados.trabalho || "");
      setEscola(dados.escola || "");
      setNascimento(dados.nascimento || "");
      setRelacionamento(dados.relacionamento || "");

      const q = query(collection(db, "posts"), where("autorUid", "==", uid));
      const ps = await getDocs(q);
      const lista = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
      setPosts(lista);

      if (user && user.uid !== uid) {
        setRelacao(await checarRelacao(user.uid, uid));
        const mSnap = await getDoc(doc(db, "usuarios", user.uid));
        setMeuPerfil(mSnap.exists() ? mSnap.data() : {});
      }
    })();
  }, [uid, user]);

  async function salvar() {
    const dados = {
      nome: nome.trim(),
      cidade: cidade.trim(),
      bio: bio.trim(),
      trabalho: trabalho.trim(),
      escola: escola.trim(),
      nascimento: nascimento,
      relacionamento: relacionamento,
    };
    try {
      await updateDoc(doc(db, "usuarios", uid), dados);
      setPerfil((p) => ({ ...p, ...dados }));
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (e) { console.error(e); alert("não consegui salvar."); }
  }

  function formatarNascimento(dateStr) {
    if (!dateStr) return "";
    const [ano, mes, dia] = dateStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function abrirSeletor() { if (!enviandoFoto) fileRef.current?.click(); }

  async function onSelecionarFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const url = await uploadCloudinary(file);
      await updateDoc(doc(db, "usuarios", uid), { fotoURL: url });
      setPerfil((p) => ({ ...p, fotoURL: url }));
    } catch (err) { console.error(err); alert("não consegui enviar a foto."); }
    finally { setEnviandoFoto(false); }
  }

  async function onSelecionarCapa(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const url = await uploadCloudinary(file);
      await updateDoc(doc(db, "usuarios", uid), { capaURL: url });
      setPerfil((p) => ({ ...p, capaURL: url }));
    } catch (err) { console.error(err); alert("não consegui enviar a capa."); }
    finally { setEnviandoFoto(false); }
  }

  async function acaoAmizade(tipo) {
    if (!user || carregandoAcao) return;
    setCarregandoAcao(true);
    try {
      if (tipo === "adicionar") {
        await enviarSolicitacao(user.uid, meuPerfil?.nome, meuPerfil?.fotoURL, uid, perfil?.nome, perfil?.fotoURL);
        setRelacao("enviada");
      } else if (tipo === "aceitar") {
        await aceitarSolicitacao(user.uid, uid);
        setRelacao("amigos");
        setPerfil((p) => ({ ...p, amigosCount: (p.amigosCount || 0) + 1 }));
      } else if (tipo === "recusar") {
        await recusarSolicitacao(user.uid, uid);
        setRelacao("nenhuma");
      } else if (tipo === "desfazer") {
        setConfirmacao("desfazer");
        setCarregandoAcao(false);
        return;
      } else if (tipo === "bloquear") {
        setConfirmacao("bloquear");
        setCarregandoAcao(false);
        return;
      } else if (tipo === "confirmar-desfazer") {
        setConfirmacao(null);
        await desfazerAmizade(user.uid, uid);
        setRelacao("nenhuma");
        setPerfil((p) => ({ ...p, amigosCount: Math.max((p.amigosCount || 1) - 1, 0) }));
      } else if (tipo === "confirmar-bloquear") {
        setConfirmacao(null);
        await bloquear(user.uid, uid);
        setRelacao("bloqueado");
      } else if (tipo === "desbloquear") {
        await desbloquear(user.uid, uid);
        setRelacao("nenhuma");
      }
    } catch (e) {
      console.error(e);
      alert("algo deu errado. tenta de novo.");
    } finally { setCarregandoAcao(false); }
  }

  if (!perfil) return <p className="vazio">carregando...</p>;
  const nomeMostrado = perfil.nome || "sem nome";
  const local = perfil.cidade ? perfil.cidade : "Brasil";

  function statusTexto() {
    if (ehMeu) return "";
    if (perfil.online) return "online agora";
    if (!perfil.ultimoAcesso?.seconds) return "";
    const diff = Date.now() / 1000 - perfil.ultimoAcesso.seconds;
    if (diff < 120) return "online agora";
    if (diff < 3600) return `visto há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `visto há ${Math.floor(diff / 3600)}h`;
    return `visto há ${Math.floor(diff / 86400)}d`;
  }

  return (
    <>
      <section className="card perfil-card">
        {/* foto de capa */}
        <div
          className="perfil-capa"
          onClick={ehMeu ? () => capaRef.current?.click() : undefined}
          style={perfil.capaURL ? { backgroundImage: `url(${perfil.capaURL})` } : undefined}
        >
          {ehMeu && <span className="capa-editar">{perfil.capaURL ? "trocar capa" : "adicionar capa"}</span>}
        </div>
        <input ref={capaRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onSelecionarCapa} />

        <div className="perfil-cabecalho perfil-cabecalho-v2">
          <div className="avatar" onClick={ehMeu ? abrirSeletor : undefined}
            title={ehMeu ? "trocar foto" : ""} style={{ cursor: ehMeu ? "pointer" : "default", position: "relative" }}>
            {perfil.fotoURL
              ? <img src={perfil.fotoURL} alt="foto de perfil" className="avatar-img" />
              : nomeMostrado.charAt(0).toUpperCase()}
            {!ehMeu && perfil.online && <span className="online-dot online-dot-perfil" />}
          </div>
          <div style={{ flex: 1 }}>
            <p className="perfil-nome">{nomeMostrado}</p>
            <p className="perfil-local">{local}{statusTexto() ? ` · ${statusTexto()}` : ""}</p>
            {ehMeu ? (
              <button className="link-foto" onClick={abrirSeletor} disabled={enviandoFoto}>
                {enviandoFoto ? "enviando..." : "trocar foto"}
              </button>
            ) : relacao === "bloqueado" ? (
              <div className="perfil-botoes">
                <span className="badge-bloqueado">bloqueado</span>
                <button className="link-acao" onClick={() => acaoAmizade("desbloquear")} disabled={carregandoAcao}>
                  desbloquear
                </button>
              </div>
            ) : (
              <>
                <div className="perfil-botoes">
                  {relacao === "nenhuma" && (
                    <button className="btn-seguir" onClick={() => acaoAmizade("adicionar")} disabled={carregandoAcao}>
                      adicionar
                    </button>
                  )}
                  {relacao === "enviada" && (
                    <button className="btn-seguir seguindo" disabled>solicitação enviada</button>
                  )}
                  {relacao === "recebida" && (
                    <>
                      <button className="btn-seguir" onClick={() => acaoAmizade("aceitar")} disabled={carregandoAcao}>aceitar</button>
                      <button className="btn-msg" onClick={() => acaoAmizade("recusar")} disabled={carregandoAcao}>recusar</button>
                    </>
                  )}
                  {relacao === "amigos" && (
                    <span className="badge-amigos">amigos</span>
                  )}
                  {relacao !== "bloqueado" && (
                    <Link href={`/mensagens/${uid}`} className="btn-msg">mensagem</Link>
                  )}
                </div>
                <div className="perfil-acoes-extra">
                  {relacao === "amigos" && (
                    <button className="link-acao" onClick={() => acaoAmizade("desfazer")} disabled={carregandoAcao}>
                      desfazer amizade
                    </button>
                  )}
                  <button className="link-acao link-perigo" onClick={() => acaoAmizade("bloquear")} disabled={carregandoAcao}>
                    bloquear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {perfil.bio && <p className="perfil-bio">{perfil.bio}</p>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onSelecionarFoto} />

        {(perfil.trabalho || perfil.escola || perfil.nascimento || perfil.relacionamento) && (
          <div className="perfil-info-extra">
            {perfil.trabalho && <p className="perfil-info-item">💼 Trabalha na <strong>{perfil.trabalho}</strong></p>}
            {perfil.escola && <p className="perfil-info-item">🎓 Estuda/estudou na <strong>{perfil.escola}</strong></p>}
            {perfil.nascimento && <p className="perfil-info-item">🎂 Nascido em <strong>{formatarNascimento(perfil.nascimento)}</strong></p>}
            {perfil.relacionamento && <p className="perfil-info-item">💕 <strong>{perfil.relacionamento}</strong></p>}
          </div>
        )}

        <div className="stats">
          <div className="stat"><strong>{posts.length}</strong><span>posts</span></div>
          <div className="stat stat-clicavel" onClick={async () => {
            if (mostraAmigos) { setMostraAmigos(false); return; }
            const snap = await getDocs(collection(db, "usuarios", uid, "amigos"));
            setListaAmigos(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
            setMostraAmigos(true);
          }}>
            <strong>{perfil.amigosCount || 0}</strong><span>amigos</span>
          </div>
        </div>

        {mostraAmigos && (
          <div className="amigos-lista">
            <p className="card-titulo">amigos</p>
            {listaAmigos.length === 0 && <p className="vazio">nenhum amigo ainda.</p>}
            {listaAmigos.map(a => (
              <Link key={a.uid} href={`/perfil/${a.uid}`} className="amigo-item">
                <div className="avatar-mini">
                  {a.foto ? <img src={a.foto} className="avatar-img" alt="" /> : (a.nome || "?").charAt(0).toUpperCase()}
                </div>
                <span className="amigo-nome">{a.nome || "amigo"}</span>
              </Link>
            ))}
          </div>
        )}
        {ehMeu && (
          <button className="btn-convite" onClick={async () => {
            const dados = { title: "trybut", text: "Entra no trybut comigo! sua tribo, do seu jeito", url: "https://trybut.vercel.app" };
            if (navigator.share) { try { await navigator.share(dados); } catch(e){} }
            else { try { await navigator.clipboard.writeText(`${dados.text} ${dados.url}`); alert("link copiado!"); } catch(e){ alert("trybut.vercel.app"); } }
          }}>
            <Share2 size={16} /> convide amigos pro trybut
          </button>
        )}
      </section>

      {ehMeu && (
        <section className="card">
          <p className="card-titulo">editar perfil</p>
          <div className="campo"><label>nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="seu nome" /></div>
          <div className="campo"><label>cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="sua cidade" /></div>
          <div className="campo"><label>quem sou eu</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="escreva algo sobre você..." /></div>
          <div className="campo"><label>trabalho</label>
            <input value={trabalho} onChange={(e) => setTrabalho(e.target.value)} placeholder="onde você trabalha?" /></div>
          <div className="campo"><label>escola</label>
            <input value={escola} onChange={(e) => setEscola(e.target.value)} placeholder="onde você estuda/estudou?" /></div>
          <div className="campo"><label>data de nascimento</label>
            <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} /></div>
          <div className="campo"><label>relacionamento</label>
            <select value={relacionamento} onChange={(e) => setRelacionamento(e.target.value)}>
              <option value="">não informado</option>
              <option value="solteiro(a)">solteiro(a)</option>
              <option value="namorando">namorando</option>
              <option value="casado(a)">casado(a)</option>
              <option value="é complicado">é complicado</option>
            </select>
          </div>
          <button className="btn-primario" onClick={salvar}>salvar</button>
          {salvo && <p className="salvo">salvo!</p>}
        </section>
      )}

      {relacao !== "bloqueado" && (
        <>
          <p className="card-titulo" style={{ padding: "0 4px" }}>posts</p>
          {posts.length === 0 && <p className="vazio">nenhum post ainda.</p>}
          {posts.map((post) => (
            <article key={post.id} className="card post">
              {post.texto && <p className="post-texto">{post.texto}</p>}
              {post.fotoURL && <img src={post.fotoURL} alt="" className="post-imagem" />}
              <div className="post-acoes">
                <span className="post-btn">{(post.curtidasPor || []).length} curtidas</span>
                <span className="post-btn">{post.comentariosCount || 0} comentários</span>
              </div>
            </article>
          ))}
        </>
      )}

      {ehMeu && (
        <button className="btn-sair" onClick={() => signOut(auth)}>sair da conta</button>
      )}

      {confirmacao && (
        <ConfirmModal
          mensagem={confirmacao === "desfazer"
            ? "tem certeza que quer desfazer a amizade?"
            : "tem certeza que quer bloquear essa pessoa?"}
          onConfirmar={() => acaoAmizade(`confirmar-${confirmacao}`)}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </>
  );
}
