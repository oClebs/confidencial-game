import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png'; 

// 🟣 SEU CLIENT ID
const TWITCH_CLIENT_ID = 'hoevm6fscw93d5c01d7ermgu6nbhk7'; 

const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : '/');

// --- ESTILOS "TOP SECRET ANALOG" ---
const styles = {
  // Fundo estilo "Mesa de Detetive"
  mainWrapper: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
    minHeight: '100vh', width: '100%', 
    fontFamily: "'Courier Prime', 'Courier New', monospace", 
    color: '#1a1a1a', 
    backgroundColor: '#111', 
    backgroundImage: 'radial-gradient(circle at center, #2a2a2a 0%, #000 85%)', // Luz dramática
    boxSizing: 'border-box', padding: '20px' 
  },

  // O "Dossiê" (Pasta Manila)
  paper: { 
    backgroundColor: '#f0e6d2', 
    backgroundImage: `linear-gradient(to bottom, #fdfbf7 0%, #f0e6d2 100%)`, 
    padding: '40px', 
    boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 0 60px rgba(160, 140, 100, 0.2)', 
    maxWidth: '550px', width: '100%', margin: '40px auto', 
    border: '1px solid #c0b090', 
    position: 'relative', 
    transform: 'rotate(-0.5deg)', 
    borderRadius: '4px'
  },

  // Aba da Pasta
  folderTab: {
    position: 'absolute', top: '-35px', left: '0',
    width: '200px', height: '36px',
    backgroundColor: '#f0e6d2',
    borderTop: '1px solid #e0d0b0', borderLeft: '1px solid #e0d0b0', borderRight: '1px solid #b0a080',
    borderRadius: '8px 8px 0 0',
    display: 'flex', alignItems: 'center', paddingLeft: '20px',
    fontSize: '14px', fontWeight: 'bold', color: '#8a7a60', letterSpacing: '2px',
    boxShadow: 'inset 0 10px 10px -10px rgba(255,255,255,0.8)'
  },

  // Inputs estilo "Formulário Datilografado"
  input: { 
    padding: '12px', margin: '10px 0', fontSize: '20px', 
    color: '#222', 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    border: 'none', borderBottom: '2px dashed #666', 
    width: '100%', fontFamily: "inherit", fontWeight: 'bold', 
    boxSizing: 'border-box', outline: 'none',
    transition: 'background 0.3s'
  },

  // Botões estilo "Carimbo" ou "Etiqueta"
  btn: { 
    padding: '18px', 
    background: '#222', 
    color: '#f0e6d2', 
    border: '2px solid #222', 
    marginTop: '20px', fontSize: '1.1rem', fontFamily: "inherit", fontWeight: '900', 
    cursor: 'pointer', width: '100%', textTransform: 'uppercase', letterSpacing: '2px',
    boxShadow: '0 5px 0 #000', 
    transition: 'all 0.1s',
    position: 'relative', top: '0'
  },

  // Cards Polaroid
  agentCard: { 
    backgroundColor: '#fff', color: '#111', padding: '12px 12px 35px 12px', 
    width: '150px', 
    boxShadow: '5px 5px 15px rgba(0,0,0,0.5)', 
    display: 'flex', flexDirection: 'column', alignItems: 'center', 
    transform: 'rotate(2deg)',
    border: '1px solid #ddd'
  },

  stamp: { 
    border: '4px double', padding: '5px 8px', textTransform: 'uppercase', fontWeight: 'bold', 
    fontSize: '11px', transform: 'rotate(-10deg)', opacity: 0.8, marginTop: '5px', 
    letterSpacing: '1px', textAlign: 'center', color: '#b91c1c', borderColor: '#b91c1c' 
  },

  // Botões flutuantes (Regras, Sair)
  floatBtn: { position: 'fixed', borderRadius: '50%', width: '50px', height: '50px', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 2000, fontWeight: 'bold', fontSize: '24px' },
  
  rulesBox: { position: 'fixed', bottom: '90px', right: '20px', width: '300px', backgroundColor: '#f4e4bc', color: '#1c1917', padding: '20px', border: '4px solid #1c1917', borderRadius: '2px', boxShadow: '-10px 10px 30px rgba(0,0,0,0.8)', zIndex: 1999, fontFamily: "'Courier New', Courier, monospace", transformOrigin: 'bottom right', transition: 'transform 0.2s ease-out' },
  
  menuBan: { position: 'fixed', backgroundColor: '#111', color: '#ef4444', border: '1px solid #ef4444', padding: '15px', zIndex: 99999, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', fontWeight: 'bold' }
};

const JanelaExterna = ({ children, onClose }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);
  useEffect(() => {
    const win = window.open('', '', 'width=600,height=500,left=200,top=200');
    if (!win) { alert("Permita pop-ups!"); onClose(); return; }
    externalWindow.current = win;
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.style.backgroundColor = '#1c1917';
    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);
    win.onbeforeunload = () => { onClose(); };
    return () => { win.close(); };
  }, []); 
  return container ? createPortal(children, container) : null;
};

function App() {
  // Lógica Pop-up
  useEffect(() => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token') && window.opener) {
          window.opener.postMessage({ type: 'TWITCH_LOGIN_SUCCESS', hash: hash }, window.location.origin);
          window.close();
      }
  }, []);

  const [entrou, setEntrou] = useState(false);
  const [nome, setNome] = useState("");
  const [sala, setSala] = useState("");
  const [senha, setSenha] = useState("");
  const [modoLogin, setModoLogin] = useState('MENU');
  const [erroLogin, setErroLogin] = useState("");
  const [jogadores, setJogadores] = useState([]);
  const [fase, setFase] = useState('LOBBY'); 
  const [meuPapel, setMeuPapel] = useState(null); 
  const [dadosRodada, setDadosRodada] = useState({ palavra: null }); 
  const [souHost, setSouHost] = useState(false);
  const [infoRodada, setInfoRodada] = useState({ atual: 0, total: 0 });
  const [minhaPalavraInicial, setMinhaPalavraInicial] = useState("");
  const [textoPreparacao, setTextoPreparacao] = useState("");
  const [jaEnvieiPreparacao, setJaEnvieiPreparacao] = useState(false);
  const [statusPreparacao, setStatusPreparacao] = useState({ prontos: 0, total: 0 });
  const [descricaoRecebida, setDescricaoRecebida] = useState("");
  const [textoCensurado, setTextoCensurado] = useState("");
  const [inputsSabotagem, setInputsSabotagem] = useState(Array(10).fill(""));
  const [sabotagemEnviada, setSabotagemEnviada] = useState(false);
  const [tentativaDecifrador, setTentativaDecifrador] = useState("");
  const [resultadoRodada, setResultadoRodada] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [sessaoSalva, setSessaoSalva] = useState(null);
  const [exibirRegras, setExibirRegras] = useState(false);
  const [protagonistas, setProtagonistas] = useState(null);
  const [alvoLocal, setAlvoLocal] = useState(0);
  const [modoStreamerLocal, setModoStreamerLocal] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  
  const [salaEhTwitch, setSalaEhTwitch] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState(null);

  const [configSala, setConfigSala] = useState({ twitchAuth: false, streamerMode: false, numCiclos: 1, tempos: { preparacao: 120, sabotagem: 30, decifracao: 45 } });
  const [configRecebida, setConfigRecebida] = useState(null); 
  const [janelaExternaAberta, setJanelaExternaAberta] = useState(false);
  const [menuBan, setMenuBan] = useState({ visivel: false, x: 0, y: 0, jogadorId: null, jogadorNome: "" });
  const [logsSistema, setLogsSistema] = useState([]);
  const [palavrasSabotadasRodada, setPalavrasSabotadasRodada] = useState([]);

  const audioSuccess = useRef(null);
  const audioError = useRef(null);

  useEffect(() => {
      audioSuccess.current = new Audio('/success.mp3');
      audioError.current = new Audio('/error.mp3');
      audioSuccess.current.volume = 0.5; audioError.current.volume = 0.5;
  }, []);

  const adicionarLog = (dados) => {
      const id = Date.now();
      setLogsSistema(prev => [...prev, { ...dados, id }]);
      setTimeout(() => { setLogsSistema(prev => prev.filter(log => log.id !== id)); }, 4000);
  };

  useEffect(() => {
      if (sala.length === 4) socket.emit('verificar_sala', sala);
      else setSalaEhTwitch(false);
  }, [sala]);

  useEffect(() => {
      const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return;
          if (event.data.type === 'TWITCH_LOGIN_SUCCESS') {
              const params = new URLSearchParams(event.data.hash.replace('#', '?'));
              processarTokenTwitch(params.get('access_token'));
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [acaoPendente, configSala, sala]);

  const processarTokenTwitch = async (accessToken) => {
      if (!accessToken) return;
      try {
          const response = await fetch('https://api.twitch.tv/helix/users', { headers: { 'Authorization': `Bearer ${accessToken}`, 'Client-Id': TWITCH_CLIENT_ID } });
          const data = await response.json();
          if (data.data && data.data.length > 0) {
              const userTwitch = data.data[0];
              if (acaoPendente === 'CRIAR') {
                  setNome(userTwitch.display_name);
                  socket.emit('criar_sala', { nomeJogador: userTwitch.display_name, senha: "", config: configSala, twitchData: { id: userTwitch.id, login: userTwitch.login, token: accessToken, foto: userTwitch.profile_image_url } });
              } else if (acaoPendente === 'ENTRAR') {
                  setNome(userTwitch.display_name);
                  socket.emit('entrar_sala', { nomeJogador: userTwitch.display_name, roomId: sala, senha: "", token: null, twitchData: { id: userTwitch.id, login: userTwitch.login, token: accessToken, foto: userTwitch.profile_image_url } });
              }
          }
      } catch (error) { setErroLogin("Erro Auth Twitch"); }
  };

  const abrirPopupTwitch = (acao) => {
      setAcaoPendente(acao);
      const redirectUri = window.location.origin;
      const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
      const w = 500, h = 700;
      const left = (window.screen.width/2)-(w/2); const top = (window.screen.height/2)-(h/2);
      window.open(authUrl, 'Twitch Auth', `width=${w},height=${h},top=${top},left=${left}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) { setSala(roomParam); setModoLogin('ENTRAR'); socket.emit('verificar_sala', roomParam); window.history.replaceState({}, document.title, "/"); }

    const saved = localStorage.getItem('censorizador_session');
    if (saved) {
      const parsed = JSON.parse(saved); setSessaoSalva(parsed);
      if (parsed.roomId) socket.emit('verificar_sala', parsed.roomId);
    }

    socket.on('info_sala_retorno', (dados) => { setSalaEhTwitch(dados.twitchAuth); });

    socket.on('sala_criada_sucesso', (dados) => { 
      const sessionData = { roomId: dados.roomId, token: dados.userToken, nome: dados.jogadores[0].nome, senha: senha }; 
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData)); 
      setSala(dados.roomId); setJogadores(dados.jogadores); setConfigRecebida(dados.config); 
      setEntrou(true); setFase('LOBBY'); 
      setErroLogin(""); setNome(dados.jogadores[0].nome);
    });
    
    socket.on('entrada_sucesso', (dados) => { 
      const tokenSalvo = localStorage.getItem('censorizador_session') ? JSON.parse(localStorage.getItem('censorizador_session')).token : null; 
      const eu = dados.jogadores.find(j=>j.id===socket.id);
      const sessionData = { roomId: dados.roomId, token: tokenSalvo, nome: eu?eu.nome:nome, senha: senha }; 
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData)); 
      setSala(dados.roomId); setJogadores(dados.jogadores); setFase(dados.fase); setConfigRecebida(dados.config); 
      setEntrou(true); setErroLogin(""); 
    });

    socket.on('sessao_invalida', () => { localStorage.removeItem('censorizador_session'); setSessaoSalva(null); setSalaEhTwitch(false); });
    socket.on('banido_da_sala', (msg) => { localStorage.removeItem('censorizador_session'); alert("⛔ " + msg); window.location.reload(); });
    socket.on('log_evento', (d) => { setLogsSistema(p => [...p, {...d, id: Date.now()}]); });
    socket.on('erro_login', (msg) => { setErroLogin(msg); });
    socket.on('atualizar_sala', (l) => { setJogadores(l); const eu=l.find(j=>j.id===socket.id); if(eu) setSouHost(eu.isHost); });
    socket.on('sala_encerrada', () => { localStorage.removeItem('censorizador_session'); window.location.reload(); });
    socket.on('aviso_sala', (d) => setAviso(d));
    socket.on('inicio_preparacao', (d) => { setFase('PREPARACAO'); setMinhaPalavraInicial(d.palavra); setJaEnvieiPreparacao(false); setTextoPreparacao(""); });
    socket.on('status_preparacao', (d) => setStatusPreparacao(d));
    socket.on('nova_rodada', (d) => { setFase('SABOTAGEM'); setMeuPapel(d.meuPapel); setInfoRodada({atual: d.rodadaAtual, total: d.totalRodadas}); setInputsSabotagem(Array(10).fill("")); setSabotagemEnviada(false); setTentativaDecifrador(""); setDescricaoRecebida(d.descricao||""); if(d.protagonistas) setProtagonistas(d.protagonistas); if(d.palavraRevelada) setDadosRodada({palavra: d.palavraRevelada}); });
    socket.on('fase_decifrar', (d) => { setFase('DECIFRANDO'); setTextoCensurado(d.textoCensurado); setPalavrasSabotadasRodada(d.palavrasEfetivas||[]); if(d.segundosRestantes) setAlvoLocal(Date.now()+(d.segundosRestantes*1000)); });
    socket.on('sincronizar_tempo', ({segundosRestantes}) => setAlvoLocal(Date.now()+(segundosRestantes*1000)));
    socket.on('resultado_rodada', (d) => { setFase('RESULTADO'); setResultadoRodada(d); setJogadores(d.ranking); setAlvoLocal(0); });
    socket.on('fim_de_jogo', () => setFase('FIM'));

    return () => { socket.offAny(); }; 
  }, [nome, senha, sala]);

  useEffect(() => { if(alvoLocal===0)return; const i=setInterval(()=>{const d=Math.ceil((alvoLocal-Date.now())/1000); setTempoRestante(d>0?d:0); if(d<=0)setAlvoLocal(0);},200); return ()=>clearInterval(i); }, [alvoLocal]);
  useEffect(() => { if(fase==='PREPARACAO'&&tempoRestante===1&&!jaEnvieiPreparacao) { if(textoPreparacao.length>0) enviarTextoPreparacao(); else { socket.emit('enviar_preparacao', {nomeSala:sala, texto:"..."}); setJaEnvieiPreparacao(true); setJanelaExternaAberta(false); } } }, [tempoRestante, fase, jaEnvieiPreparacao, textoPreparacao]);

  const acaoReconectar = () => { if (sessaoSalva) { setNome(sessaoSalva.nome); setSala(sessaoSalva.roomId); setSenha(sessaoSalva.senha); socket.emit('entrar_sala', { nomeJogador: sessaoSalva.nome, roomId: sessaoSalva.roomId, senha: sessaoSalva.senha, token: sessaoSalva.token }); } };
  const acaoCriarSala = () => { if(configSala.twitchAuth) abrirPopupTwitch('CRIAR'); else { if(nome&&senha) socket.emit('criar_sala', {nomeJogador:nome, senha, config:configSala}); else setErroLogin("Preencha tudo!"); } };
  const acaoEntrarSala = () => { if(salaEhTwitch) abrirPopupTwitch('ENTRAR'); else { if(nome&&sala&&senha) socket.emit('entrar_sala', {nomeJogador:nome, roomId:sala, senha, token:sessaoSalva?.token}); else setErroLogin("Preencha tudo!"); } };
  const copiarLinkConvite = () => { navigator.clipboard.writeText(`${window.location.origin}?room=${sala}`).then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000); }); };
  const iniciarJogo = () => socket.emit('iniciar_jogo', sala);
  const proximaRodada = () => socket.emit('proxima_rodada', sala);
  const enviarTextoPreparacao = () => { socket.emit('enviar_preparacao', {nomeSala:sala, texto:textoPreparacao}); setJaEnvieiPreparacao(true); setJanelaExternaAberta(false); };
  const enviarSabotagem = () => { socket.emit('sabotador_envia', {nomeSala:sala, previsoes:inputsSabotagem.filter(p=>p.trim()!=="")}); setSabotagemEnviada(true); };
  const atualizarInputSabotagem = (i,v) => { const n=[...inputsSabotagem]; n[i]=v; setInputsSabotagem(n); };
  const enviarDecifracao = () => socket.emit('decifrador_chuta', {nomeSala:sala, tentativa:tentativaDecifrador});
  const sairDaSala = () => { if(confirm("Sair?")) { localStorage.removeItem('censorizador_session'); window.location.reload(); } };
  const handleContextMenuJogador = (e, jogador) => { if(!souHost) return; if(jogador.id === socket.id) return; e.preventDefault(); setMenuBan({ visivel: true, x: e.clientX, y: e.clientY, jogadorId: jogador.id, jogadorNome: jogador.nome }); };
  const confirmarBan = () => { if(menuBan.jogadorId) { socket.emit('banir_jogador', { roomId: sala, targetId: menuBan.jogadorId }); } setMenuBan({ ...menuBan, visivel: false }); };

  const TimerDisplay = () => (<div style={{ position: 'fixed', top: 20, right: 20, background: tempoRestante < 10 ? '#b91c1c' : '#111', color: '#f0e6d2', padding: '10px 20px', borderRadius: '4px', fontSize: '24px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.8)', border: '1px solid #c0b090' }}>⏱️ {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}</div>);
  const HeaderDebug = () => ( fase !== 'LOBBY' && fase !== 'PREPARACAO' && fase !== 'FIM' && <div style={{ width: '100%', background: '#111', color: '#eab308', padding: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eab308', borderTop: '1px solid #eab308', boxSizing: 'border-box', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '14px' }}><span>ARQUIVO: <strong>{meuPapel}</strong></span><span>RODADA: {infoRodada.atual}/{infoRodada.total}</span></div> );
  const AvisoToast = () => { if (!aviso) return null; const bg = aviso.tipo === 'perigo' ? '#b91c1c' : '#15803d'; return (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: bg, color: 'white', padding: '15px', textAlign: 'center', zIndex: 9999, fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', animation: aviso.tipo === 'perigo' ? 'pulse 1s infinite' : 'none' }}>{aviso.msg}</div>); };
  const RulesWidget = () => ( <><button onClick={() => setExibirRegras(!exibirRegras)} style={{...styles.floatBtn, bottom: '20px', right: '20px', background: '#d97706', color: '#fff'}} title="Protocolos">?</button><div style={{...styles.rulesBox, transform: exibirRegras ? 'scale(1)' : 'scale(0)'}}><div style={{ borderBottom: '2px dashed #1c1917', paddingBottom: '10px', marginBottom: '10px' }}><h3 style={{ margin: 0, textTransform: 'uppercase' }}>📂 Protocolos</h3></div><ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.4em' }}><li style={{ marginBottom: '8px' }}><strong>1. O SEGREDO:</strong> Cada um recebe uma palavra secreta.</li><li style={{ marginBottom: '8px' }}><strong>2. 🕵️ CIFRADOR:</strong> Escreve um texto para descrever sua palavra (sem usar a palavra!).</li><li style={{ marginBottom: '8px' }}><strong>3. ✂️ SABOTADOR:</strong> Censura palavras do texto para atrapalhar.</li><li style={{ marginBottom: '8px' }}><strong>4. 🧩 DECIFRADOR:</strong> Tenta adivinhar qual era a palavra original.</li></ul><div style={{ marginTop: '10px', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', color: '#b91c1c' }}>"Confie em ninguém."</div></div></> );
  const SidebarJogadores = () => ( <div style={{ position: 'fixed', top: '50%', left: '20px', transform: 'translateY(-50%)', width: '80px', background: 'transparent', padding: '10px 5px', zIndex: 500, display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}><div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textAlign: 'center', width: '100%', paddingBottom: '5px' }}>AGENTS</div>{jogadores.map(j => (<div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost && j.id !== socket.id ? "Botão Direito para BANIR" : j.nome} style={{ width: '50px', height: '50px', background: j.id === socket.id ? '#d97706' : '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: j.isHost ? '3px solid #b91c1c' : '2px solid #333', fontSize: '24px', cursor: souHost ? 'context-menu' : 'default', position: 'relative', overflow: 'hidden', boxShadow: '5px 5px 10px rgba(0,0,0,0.5)' }}>{j.foto ? <img src={j.foto} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span>🕵️‍♂️</span>}</div>))}</div> );
  const SystemLogs = () => ( <div style={{ position: 'fixed', bottom: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999, pointerEvents: 'none' }}>{logsSistema.map(log => (<div key={log.id} style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderLeft: `4px solid ${log.tipo === 'ban' ? '#ef4444' : (log.tipo === 'entrada' ? '#22c55e' : '#eab308')}`, color: '#fff', padding: '10px 15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px', boxShadow: '2px 2px 5px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease-out' }}>{log.msg}</div>))}<style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }`}</style></div> );
  const RoleDisplay = () => { if (!protagonistas) return null; return (<div style={{ background: '#111', color: '#fff', padding: '10px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-around', fontSize: '0.9rem', textTransform: 'uppercase', flexWrap: 'wrap', gap: '10px', width: '100%', boxSizing: 'border-box', marginTop: '60px' }}><div style={{ color: '#4ade80' }}>🕵️ CIFRADOR: <strong>{protagonistas.cifrador}</strong></div><div style={{ color: '#ef4444' }}>✂️ SABOTADORES: <strong>{protagonistas.sabotadores.join(", ")}</strong></div><div style={{ color: '#3b82f6' }}>🧩 DECIFRADOR: <strong>{protagonistas.decifrador}</strong></div></div>); };
  
  const commonRender = (content) => ( <> <AvisoToast /> <SystemLogs /> {entrou && (<button onClick={sairDaSala} style={{...styles.floatBtn, top:'20px', left:'20px', background:'transparent', color:'#ef4444', border:'2px solid #ef4444', fontSize:'14px', width:'auto', padding:'0 15px', borderRadius:'4px'}}>ABANDONAR</button>)} {entrou && (<button onClick={() => setModoStreamerLocal(!modoStreamerLocal)} style={{...styles.floatBtn, top: '20px', right: '20px', backgroundColor: modoStreamerLocal ? '#10b981' : '#333'}} title="Modo Streamer (Ocultar Segredos)">{modoStreamerLocal ? '🙈' : '👁️'}</button>)} {menuBan.visivel && (<div style={{...styles.menuBan, top: menuBan.y, left: menuBan.x}} onClick={confirmarBan}>🔨 BANIR AGENTE <br/> <span style={{color: 'white'}}>{menuBan.jogadorNome}</span></div>)} {entrou && fase !== 'LOBBY' && fase !== 'FIM' && <SidebarJogadores />} {content} </> );

  if (!entrou) {
    return (
      <div style={styles.mainWrapper}>
        <img src={logoImage} alt="Confidencial Logo" style={{ width: '100%', maxWidth: '450px', filter: 'drop-shadow(5px 5px 5px #000)', marginBottom: '30px' }} />
        
        {/* PASTA DE ARQUIVO */}
        <div style={styles.paper}>
          <div style={styles.folderTab}>CONFIDENCIAL //</div>

          <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
             <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '24px' }}>Acesso Restrito</h2>
             <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontStyle: 'italic', opacity: 0.7 }}>Apenas pessoal autorizado</p>
          </div>

          {sessaoSalva && modoLogin === 'MENU' && (<div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #333' }}><p style={{ fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>// SESSÃO ANTERIOR DETECTADA //</p><button onClick={acaoReconectar} style={{ ...styles.btn, background: '#d97706', border: '2px dashed #000', color: 'black' }}>VOLTAR PARA {sessaoSalva.roomId}</button></div>)}
          {modoLogin === 'MENU' && (<div style={{ marginTop: '10px' }}><button onClick={() => setModoLogin('CRIAR')} style={styles.btn}>INICIAR NOVA OPERAÇÃO</button><button onClick={() => setModoLogin('ENTRAR')} style={{...styles.btn, background: 'transparent', border: '2px solid #333', color: '#333'}}>ACESSAR OPERAÇÃO EXISTENTE</button></div>)}
          
          {modoLogin === 'CRIAR' && (
            <div style={{ marginTop: '10px' }}>
              <input placeholder="CODINOME (Seu Nome)" onChange={e => setNome(e.target.value)} style={styles.input} disabled={configSala.twitchAuth} value={configSala.twitchAuth ? "(Login via Twitch)" : nome} />
              <input placeholder={configSala.twitchAuth ? "🔒 AUTENTICAÇÃO TWITCH ATIVA" : "DEFINIR SENHA DE ACESSO"} type="text" disabled={configSala.twitchAuth} onChange={e => setSenha(e.target.value)} value={configSala.twitchAuth ? "" : senha} style={{ ...styles.input, opacity: configSala.twitchAuth ? 0.6 : 1, cursor: configSala.twitchAuth ? 'not-allowed' : 'text' }} />
              
              <div style={{ background: 'rgba(0,0,0,0.05)', padding: '15px', border: '1px solid #ccc', margin: '15px 0', textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ccc' }}>⚙️ PROTOCOLOS DA MISSÃO</h4>
                  <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '14px' }}>
                      <input type="checkbox" checked={configSala.twitchAuth} onChange={e => setConfigSala({...configSala, twitchAuth: e.target.checked})} style={{ marginRight: '10px' }} />
                      <span style={{ color: '#6441a5' }}>👾 Exigir Crachá Twitch</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '14px' }}>
                      <input type="checkbox" checked={configSala.streamerMode} onChange={e => setConfigSala({...configSala, streamerMode: e.target.checked})} style={{ marginRight: '10px' }} />
                      Modo Censura (Streamer)
                  </label>
                  <div style={{ margin: '15px 0' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block' }}>CICLOS DE RODADAS:</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                          <input type="range" min="1" max="5" value={configSala.numCiclos} onChange={e => setConfigSala({...configSala, numCiclos: parseInt(e.target.value)})} style={{ flex: 1, cursor: 'pointer', width: '100%' }} />
                          <span style={{ fontWeight: 'bold', fontSize: '18px', width: '30px' }}>{configSala.numCiclos}</span>
                      </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <div><label style={{ fontSize: '10px', fontWeight: 'bold' }}>PREPARAÇÃO (s):</label><input type="number" value={configSala.tempos.preparacao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, preparacao: e.target.value}})} style={{ ...styles.input, padding: '5px', margin: '0', fontSize: '14px' }} /></div>
                      <div><label style={{ fontSize: '10px', fontWeight: 'bold' }}>SABOTAGEM (s):</label><input type="number" value={configSala.tempos.sabotagem} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, sabotagem: e.target.value}})} style={{ ...styles.input, padding: '5px', margin: '0', fontSize: '14px' }} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '10px', fontWeight: 'bold' }}>DECIFRAÇÃO (s):</label><input type="number" value={configSala.tempos.decifracao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, decifracao: e.target.value}})} style={{ ...styles.input, padding: '5px', margin: '0', fontSize: '14px' }} /></div>
                  </div>
              </div>

              {erroLogin && <p style={{color: '#b91c1c', fontWeight: 'bold', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '5px'}}>{erroLogin}</p>}
              <button onClick={acaoCriarSala} style={{ ...styles.btn, background: configSala.twitchAuth ? '#6441a5' : '#b91c1c', border: 'none', color: '#fff' }}>
                {configSala.twitchAuth ? "LOGAR COM TWITCH & CRIAR" : "CRIAR SALA"}
              </button>
              <button onClick={() => {setModoLogin('MENU'); setErroLogin('');}} style={{ ...styles.btn, background: 'transparent', color: '#333', border: 'none', marginTop: '0', fontSize: '14px', textDecoration: 'underline' }}>CANCELAR</button>
            </div>
          )}
          {modoLogin === 'ENTRAR' && (
            <div style={{ marginTop: '10px' }}>
                <h3 style={{textAlign: 'center', fontSize: '18px'}}>// INSERIR CÓDIGO DA OPERAÇÃO //</h3>
                <input placeholder="Ex: AX7B" value={sala} onChange={e => setSala(e.target.value.toUpperCase())} style={{...styles.input, textTransform: 'uppercase', textAlign: 'center', fontSize: '30px', letterSpacing: '5px'}} />
                
                {salaEhTwitch ? (
                    <div style={{ margin: '20px 0', textAlign: 'center' }}>
                        <div style={{marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: '#6441a5'}}>🔒 ESTA OPERAÇÃO REQUER CREDENCIAIS TWITCH</div>
                        <button onClick={acaoEntrarSala} style={{ ...styles.btn, background: '#6441a5', border: 'none', color: '#fff' }}>
                            AUTENTICAR E ENTRAR
                        </button>
                    </div>
                ) : (
                    <>
                        <input placeholder="CODINOME DO AGENTE" onChange={e => setNome(e.target.value)} style={styles.input} />
                        <input placeholder="SENHA (SE HOUVER)" type="text" onChange={e => setSenha(e.target.value)} style={styles.input} />
                        <button onClick={acaoEntrarSala} style={{ ...styles.btn, background: '#15803d', border: 'none', color: '#fff' }}>SOLICITAR ACESSO</button>
                    </>
                )}
                
                {erroLogin && <p style={{color: '#b91c1c', fontWeight: 'bold', textAlign: 'center'}}>{erroLogin}</p>}
                <button onClick={() => {setModoLogin('MENU'); setErroLogin('');}} style={{ ...styles.btn, background: 'transparent', color: '#333', border: 'none', marginTop: '0', fontSize: '14px', textDecoration: 'underline' }}>CANCELAR</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (fase === 'LOBBY') {
    return commonRender(
      <div style={styles.mainWrapper}>
        <RulesWidget />
        <div style={{ borderBottom: '2px solid #eab308', paddingBottom: '20px', marginBottom: '30px', textAlign: 'center', width: '100%' }}>
          <img src={logoImage} alt="Confidencial Logo" style={{ width: '100%', maxWidth: '300px', filter: 'drop-shadow(0 0 10px #eab308)' }} />
          <p style={{ letterSpacing: '3px', marginTop: '10px', fontSize: '1rem', color: '#eab308', fontWeight: 'bold', textShadow: '0 0 10px #eab308' }}>// AGENTES ATIVOS NA REDE //</p>
          <div style={{...styles.paper, padding: '10px 30px', margin: '20px auto', width: 'auto', display: 'inline-block', transform: 'rotate(-2deg)'}}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>CÓDIGO DA MISSÃO:</span>
              <strong style={{ fontSize: '3rem', letterSpacing: '5px', color: '#b91c1c' }}>{sala}</strong>
          </div>
          <button onClick={copiarLinkConvite} style={{ display: 'block', margin: '15px auto', background: 'transparent', border: '1px solid #eab308', color: '#eab308', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>{linkCopiado ? "COPIADO! ✅" : "🔗 COPIAR LINK DE CONVITE"}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>{jogadores.map((j, i) => (<div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost && j.id !== socket.id ? "Botão Direito para BANIR" : ""} style={{ ...styles.agentCard, transform: `rotate(${i % 2 === 0 ? '2deg' : '-2deg'})`, cursor: souHost ? 'context-menu' : 'default' }}><div style={{ width: '100px', height: '100px', background: '#e2e8f0', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', overflow: 'hidden' }}>{j.foto ? <img src={j.foto} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span style={{fontSize: '50px'}}>🕵️‍♂️</span>}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #333', width: '100%', textAlign: 'center', paddingBottom: '5px', marginBottom: '5px' }}>{j.nome}</div><div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'sans-serif' }}>SCORE: {j.pontos}</div><div style={{ marginTop: 'auto', marginBottom: '5px' }}>{j.isHost ? (<div style={styles.stamp}>DIRETOR</div>) : (<div style={{ ...styles.stamp, borderColor: '#15803d', color: '#15803d', transform: 'rotate(-5deg)' }}>AGENTE</div>)}</div></div>))}</div>
        <div style={{ marginTop: 'auto', marginBottom: '40px', width: '100%', textAlign: 'center' }}>{souHost ? (<div style={{ display: 'inline-block' }}>{jogadores.length >= 3 ? (<button onClick={iniciarJogo} style={{...styles.btn, background: '#eab308', color: '#000', border: 'none', fontSize: '1.5rem', padding: '20px 60px', boxShadow: '0 0 20px #eab308'}}>INICIAR OPERAÇÃO</button>) : (<div style={{ color: '#fbbf24', border: '2px dashed #fbbf24', padding: '20px 40px', display: 'inline-block', fontSize: '1.2rem', letterSpacing: '1px' }}>// AGUARDANDO EQUIPE (MÍN. 3) //</div>)}</div>) : (<div style={{ color: '#fbbf24', border: '2px dashed #fbbf24', padding: '15px 30px', display: 'inline-block', fontSize: '1.2rem', letterSpacing: '1px' }}>// AGUARDANDO COMANDANTE INICIAR //</div>)}</div>
      </div>
    );
  }

  // (O resto das fases usa o novo estilo automaticamente através do styles.mainWrapper e styles.paper)
  if (fase === 'PREPARACAO') { const devoEsconder = (souHost && configRecebida?.streamerMode) || modoStreamerLocal; return commonRender(<div style={styles.mainWrapper}><TimerDisplay/>{janelaExternaAberta && (<JanelaExterna onClose={() => setJanelaExternaAberta(false)}><div style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e5e5e5', fontFamily: "'Courier New', Courier, monospace" }}><h2 style={{ color: '#4ade80', textTransform: 'uppercase', borderBottom: '2px solid #4ade80' }}>📂 DOSSIÊ SECRETO</h2><div style={{ background: '#000', padding: '20px', border: '1px solid #4ade80', margin: '20px 0', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}>SUA PALAVRA SECRETA: <span style={{ color: '#4ade80', fontSize: '40px', display: 'block', wordBreak: 'break-all' }}>{minhaPalavraInicial}</span></div><textarea rows="8" autoFocus style={{ width: '100%', background: '#111', color: '#4ade80', border: '2px solid #4ade80', padding: '10px', fontSize: '18px', fontFamily: 'monospace', resize: 'none' }} placeholder="Digite aqui sua descrição..." value={textoPreparacao} onChange={(e) => setTextoPreparacao(e.target.value)} /><button onClick={enviarTextoPreparacao} disabled={textoPreparacao.length === 0} style={{ width: '100%', marginTop: '20px', padding: '20px', background: '#4ade80', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', opacity: textoPreparacao.length > 0 ? 1 : 0.5 }}>ENVIAR ARQUIVO</button></div></JanelaExterna>)}<div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', textAlign: 'center' }}><h3 style={{ color: '#f0e6d2', textShadow: '0 0 10px #f0e6d2' }}>// FASE 0: PREPARAÇÃO DE DOCUMENTOS</h3>{!jaEnvieiPreparacao ? (<>{devoEsconder ? (<div style={{ border: '4px dashed #4ade80', padding: '50px', background: '#1c1917', color: '#4ade80', margin: '40px 0' }}><div style={{ fontSize: '50px' }}>🎥🔒</div><h2>MODO STREAMER ATIVO</h2><p>Os dados sensíveis estão ocultos nesta tela.</p>{!janelaExternaAberta ? (<button onClick={() => setJanelaExternaAberta(true)} style={{...styles.btn, background: '#4ade80', color: '#000'}}>ABRIR PAINEL SEGRETO (POP-UP) ↗</button>) : (<div style={{ marginTop: '20px', padding: '20px', border: '1px solid #4ade80', color: '#fff' }}><p>O PAINEL SEGRETO ESTÁ ABERTO EM OUTRA JANELA.</p></div>)}</div>) : (<><div style={{ background: '#000', padding: '20px', border: '1px solid #eab308', margin: '20px auto', maxWidth: '600px', boxShadow: '0 0 20px #eab308' }}>SUA PALAVRA SECRETA: <span style={{ color: '#eab308', fontSize: '40px', display: 'block' }}>{minhaPalavraInicial}</span></div><div style={styles.paper}><div style={styles.folderTab}>RELATÓRIO //</div><textarea rows="8" style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', outline: 'none', fontSize: '24px', fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.5em', color: '#000000', fontWeight: 'bold' }} placeholder="Descreva a palavra sem dizê-la..." value={textoPreparacao} onChange={(e) => setTextoPreparacao(e.target.value)} /></div><button onClick={enviarTextoPreparacao} style={{...styles.btn, background: '#eab308', color: '#000', border: 'none', fontSize: '1.5rem'}}>ARQUIVAR DOCUMENTO</button></>)}</>) : (<div style={{ marginTop: '50px', color: '#f0e6d2' }}><h2>// DOCUMENTO ARQUIVADO //</h2><div style={{ fontSize: '60px', margin: '20px' }}>📁</div><p>Aguardando outros agentes... ({statusPreparacao.prontos}/{statusPreparacao.total})</p></div>)}</div></div>); }
  if (fase === 'SABOTAGEM') return commonRender(<div style={styles.mainWrapper}><TimerDisplay/><RoleDisplay /><div style={{ padding: '20px', width: '100%' }}><HeaderDebug /></div><div style={{ textAlign: 'center', color: '#f0e6d2' }}><h2>INTERCEPTAÇÃO DE DOCUMENTO</h2></div>{meuPapel === 'DECIFRADOR' && (<div style={{ marginTop: '50px', textAlign: 'center' }}><h1 style={{ color: '#fca5a5', fontSize: '3rem', textShadow: '0 0 20px red' }}>ACESSO NEGADO</h1><div style={{ fontSize: '100px', margin: '20px' }}>🚫</div><p style={{color: '#fff'}}>Você é o Decifrador desta rodada.</p></div>)}{meuPapel === 'CIFRADOR' && (<div style={{...styles.paper, transform: 'none', margin: '20px auto', maxWidth: '600px'}}><div style={{...styles.stamp, transform: 'rotate(-5deg)', fontSize: '20px', marginBottom: '20px'}}>ALERTA DE SEGURANÇA</div><strong>SEU DOCUMENTO ESTÁ SENDO ATACADO:</strong><br/><br/>"{descricaoRecebida}"</div>)}{meuPapel === 'SABOTADOR' && (<div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', textAlign: 'center' }}><div style={{ background: '#1c1917', padding: '20px', border: '2px dashed #d97706', marginBottom: '30px' }}><p style={{ color: '#d97706', margin: 0 }}>PALAVRA-CHAVE:</p><h1 style={{ fontSize: '50px', color: '#fff', margin: '10px 0' }}>{dadosRodada?.palavra}</h1></div>{!sabotagemEnviada ? (<div style={styles.paper}><div style={styles.folderTab}>CENSURA //</div><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>{inputsSabotagem.map((valor, index) => (<input key={index} placeholder={`CENSURA #${index + 1}`} value={valor} onChange={(e) => atualizarInputSabotagem(index, e.target.value)} style={{ ...styles.input, textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)' }} />))}</div><button onClick={enviarSabotagem} style={{ ...styles.btn, background: '#b91c1c', color: 'white', border: 'none' }}>EXECUTAR CENSURA</button></div>) : (<div style={{ background: '#14532d', padding: '30px', border: '2px solid #22c55e', color: '#fff' }}><h3>// CENSURA APLICADA //</h3></div>)}</div>)}</div>);
  if (fase === 'DECIFRANDO') return commonRender(<div style={styles.mainWrapper}><TimerDisplay/><RoleDisplay /><div style={{ padding: '20px', width: '100%' }}><HeaderDebug /></div><div style={{ textAlign: 'center', color: '#f0e6d2', marginBottom: '30px' }}><h2>DECODIFICAÇÃO</h2></div><div style={styles.paper}><div style={{ position: 'absolute', bottom: '20px', right: '20px', border: '4px solid black', color: 'black', padding: '5px 15px', transform: 'rotate(-10deg)', fontSize: '24px', fontWeight: 'bold', opacity: 0.4, pointerEvents: 'none' }}>CLASSIFIED</div>{textoCensurado.split(/(\[CENSURADO\])/g).map((parte, i) => (parte === '[CENSURADO]' ? <span key={i} style={{backgroundColor: '#111', color: 'transparent', padding: '2px 5px', margin: '0 2px'}}>████</span> : <span key={i}>{parte}</span>))}</div>{meuPapel === 'SABOTADOR' && (<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '30px', padding: '20px', borderTop: '1px solid #444', width: '100%', maxWidth: '800px' }}><p style={{ width: '100%', color: '#999', textAlign: 'center', margin: '0 0 10px 0', fontSize: '12px' }}>TENTATIVAS DE SABOTAGEM DA EQUIPE:</p>{palavrasSabotadasRodada.map((p, i) => (<div key={i} style={{ backgroundColor: '#fef08a', color: '#000', padding: '5px 15px', fontFamily: "'Courier New', Courier, monospace", transform: `rotate(${Math.random() * 10 - 5}deg)`, boxShadow: '2px 2px 5px rgba(0,0,0,0.3)', fontSize: '14px', fontWeight: 'bold' }}>{((souHost && configRecebida?.streamerMode) || modoStreamerLocal) ? '█████' : p}</div>))}</div>)}{meuPapel === 'DECIFRADOR' ? (<div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '20px' }}><h3 style={{ color: '#fff', textAlign: 'center' }}>QUAL É A PALAVRA-CHAVE?</h3><input style={styles.input} placeholder="DIGITE SUA RESPOSTA..." value={tentativaDecifrador} onChange={(e) => setTentativaDecifrador(e.target.value)}/><button onClick={enviarDecifracao} style={{...styles.btn, background: '#2563eb', color: 'white', border: 'none'}}>ENVIAR DECODIFICAÇÃO</button></div>) : (<div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}><h3>// AGUARDANDO ANÁLISE DO DECIFRADOR //</h3></div>)}</div>);
  if (fase === 'RESULTADO' && resultadoRodada) return commonRender(<div style={styles.mainWrapper}><h1 style={{ textAlign: 'center', color: resultadoRodada.acertou ? '#4ade80' : '#f87171', fontSize: '3rem', textShadow: '0 0 20px currentColor' }}>{resultadoRodada.acertou ? "DECIFRAÇÃO BEM SUCEDIDA!" : "FALHA NA DECIFRAÇÃO"}</h1><div style={{ ...styles.paper, maxWidth: '800px' }}><div style={styles.folderTab}>RELATÓRIO FINAL //</div><p>A palavra era: <strong style={{ fontSize: '1.5em', color: '#b91c1c' }}>{resultadoRodada.palavraSecreta}</strong></p><p>O Decifrador chutou: <strong>{resultadoRodada.tentativa}</strong></p><hr style={{ borderColor: '#c0b090', margin: '20px 0' }} /><h3>Pontuação da Rodada:</h3><ul>{resultadoRodada.resumo.map((linha, i) => <li key={i} style={{ margin: '5px 0', fontSize: '18px' }}>{linha}</li>)}</ul></div>{souHost ? (<div style={{ textAlign: 'center', marginTop: '40px' }}><button onClick={proximaRodada} style={{...styles.btn, background: '#fff', color: '#000', border: 'none', width: 'auto', padding: '20px 50px'}}>PRÓXIMA RODADA ➡️</button></div>) : <p style={{ textAlign: 'center', marginTop: '40px', color: '#fff' }}>Aguardando Host avançar...</p>}</div>);
  if (fase === 'FIM') return commonRender(<div style={styles.mainWrapper}><h1 style={{ fontSize: '5rem', fontFamily: 'monospace', color: '#4ade80', textShadow: '0 0 30px #4ade80' }}>MISSÃO CUMPRIDA</h1><h2>RANKING FINAL</h2><div style={{ border: '2px solid #4ade80', padding: '40px', minWidth: '300px', background: '#000' }}>{jogadores.map((j, i) => (<div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', margin: '10px 0', color: '#4ade80', borderBottom: '1px dashed #4ade80' }}><span>{i+1}. {j.nome}</span><span>{j.pontos} PTS</span></div>))}</div><button onClick={() => window.location.reload()} style={{ padding: '20px', background: 'transparent', border: '2px solid #4ade80', color: '#4ade80', fontSize: '24px', cursor: 'pointer', marginTop: '50px' }}>NOVA MISSÃO</button></div>);

  return (
      <div style={{...styles.mainWrapper, color: '#f87171'}}>
          <h1>⚠️ ERRO DE ESTADO ⚠️</h1>
          <p>STATUS: Entrou = {entrou ? "SIM" : "NÃO"}</p>
          <p>FASE ATUAL: "{fase}"</p>
          <button onClick={() => { localStorage.removeItem('censorizador_session'); window.location.reload(); }} style={styles.btn}>
              RESETAR SISTEMA (F5)
          </button>
      </div>
  );
}

export default App;