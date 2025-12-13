import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png';

// 🟣 SEU CLIENT ID
const TWITCH_CLIENT_ID = 'hoevm6fscw93d5c01d7ermgu6nbhk7';

const socket = io(
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '/',
);

// --- ESTILOS ---
const styles = {
  mainWrapper: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    color: '#e0e0e0',
    backgroundColor: '#0a0a0a', 
    backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #000 90%)',
    overflowX: 'hidden',
    overflowY: 'auto', 
  },

  contentContainer: {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    padding: '40px 20px',
    position: 'relative',
    zIndex: 5, 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh', 
    justifyContent: 'center' 
  },

  // EFEITOS CRT
  scanlines: {
    pointerEvents: 'none',
    position: 'fixed',
    top: 0, left: 0, width: '100%', height: '100%',
    background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
    backgroundSize: '100% 4px',
    zIndex: 10,
    opacity: 0.6 
  },

  vignette: {
    pointerEvents: 'none',
    position: 'fixed',
    top: 0, left: 0, width: '100%', height: '100%',
    background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)',
    zIndex: 11,
  },

  // --- UI ELEMENTS ---
  logoHero: {
    width: '100%', 
    maxWidth: '450px', 
    marginBottom: '30px',
    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3)) contrast(1.1) brightness(1.1)',
    animation: 'float 6s ease-in-out infinite'
  },

  inputCRT: {
    padding: '15px', margin: '10px 0', fontSize: '18px', color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%', fontFamily: "'Courier Prime', monospace", fontWeight: 600,
    boxSizing: 'border-box', outline: 'none', textTransform: 'uppercase',
    letterSpacing: '1px', borderRadius: '4px', transition: 'all 0.3s ease'
  },

  inputCRT_Small: {
    padding: '8px', margin: '0', fontSize: '16px', color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    width: '100%', fontFamily: "inherit", fontWeight: 600,
    boxSizing: 'border-box', outline: 'none', textAlign: 'center', borderRadius: '4px'
  },

  btnPrimary: {
    padding: '18px 30px', width: '100%',
    background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)', 
    color: '#fff', border: '1px solid #60a5fa',
    fontFamily: "inherit", fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase',
    fontSize: '16px', cursor: 'pointer', marginTop: '20px',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)', borderRadius: '2px',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)', transition: 'transform 0.1s'
  },

  btnSecondary: {
    padding: '15px', width: '100%', background: 'transparent',
    color: '#aaa', border: '1px solid #444',
    fontFamily: "inherit", fontWeight: 700, textTransform: 'uppercase',
    fontSize: '14px', cursor: 'pointer', marginTop: '10px',
    borderRadius: '2px', transition: 'all 0.2s'
  },

  agentCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(5px)', 
    color: '#fff', padding: '15px', width: '120px', margin: '10px',
    border: '1px solid #333', display: 'flex', flexDirection: 'column',
    alignItems: 'center', fontSize: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
    borderRadius: '8px'
  },
  
  agentPhoto: {
    width:'60px', height:'60px', background:'#222', marginBottom:'10px', 
    overflow:'hidden', borderRadius:'50%', border:'2px solid #555'
  },

  paper: {
    backgroundColor: '#f0e6d2',
    backgroundImage: 'linear-gradient(to bottom, #fdfbf7 0%, #f0e6d2 100%)',
    padding: '40px 30px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    width: '100%', margin: '20px auto', position: 'relative',
    transform: 'rotate(-1deg)', borderRadius: '2px', color: '#1a1a1a', 
  },

  paperTextArea: {
    width: '100%', height: '350px', backgroundColor: 'transparent',
    border: 'none', resize: 'none', outline: 'none',
    fontFamily: "'Courier Prime', monospace", fontSize: '22px',
    fontWeight: 'bold', color: '#1a1a1a', lineHeight: '32px', 
    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #ccc 31px, #ccc 32px)',
    backgroundAttachment: 'local', marginTop: '10px'
  },

  inputPaper: {
    padding: '10px', margin: '8px 0', fontSize: '18px',
    color: '#1a1a1a', backgroundColor: 'rgba(255,255,255,0.5)',
    border: 'none', borderBottom: '2px dashed #666',
    width: '100%', fontFamily: "inherit", fontWeight: 'bold', outline: 'none'
  },

  folderTab: {
    position: 'absolute', top: '-25px', left: '0',
    width: '140px', height: '30px',
    backgroundColor: '#f0e6d2', borderRadius: '5px 5px 0 0',
    display: 'flex', alignItems: 'center', paddingLeft: '15px',
    fontSize: '10px', fontWeight: 'bold', color: '#666', letterSpacing: '1px',
  },

  navBar: {
    position: 'absolute', top: 0, left: 0, width: '100%',
    display: 'flex', justifyContent: 'space-between',
    padding: '15px 30px', boxSizing: 'border-box',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)', zIndex: 20
  },

  // BOTÃO DE AJUDA FLUTUANTE
  helpBtn: {
    position: 'fixed', bottom: '30px', right: '30px',
    width: '50px', height: '50px', borderRadius: '50%',
    background: '#eab308', color: '#000',
    border: '2px solid #fff', fontSize: '24px', fontWeight: 'bold',
    cursor: 'pointer', zIndex: 100, boxShadow: '0 0 15px rgba(234, 179, 8, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  // CAIXA DE REGRAS (Visual Terminal)
  rulesBox: {
    position: 'fixed', bottom: '100px', right: '30px',
    width: '300px', backgroundColor: 'rgba(10, 10, 10, 0.95)',
    color: '#afffbf', padding: '20px', border: '1px solid #afffbf',
    borderRadius: '4px', boxShadow: '0 0 20px rgba(0,0,0,0.8)',
    zIndex: 99, fontFamily: "'Courier New', monospace",
    transformOrigin: 'bottom right', transition: 'transform 0.2s ease-out'
  }
};

const GlobalCRT = ({ children }) => (
  <div style={styles.mainWrapper}>
    <div style={styles.scanlines} />
    <div style={styles.vignette} />
    <div style={styles.contentContainer}>{children}</div>
    <style>{`
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
      button:hover { opacity: 0.9; transform: translateY(-1px); }
      button:active { transform: translateY(1px); }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #111; }
      ::-webkit-scrollbar-thumb { background: #444; borderRadius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #666; }
    `}</style>
  </div>
);

const JanelaExterna = ({ children, onClose }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);
  useEffect(() => {
    const win = window.open('', '', 'width=600,height=500,left=200,top=200');
    if (!win) { alert('Permita pop-ups!'); onClose(); return; }
    externalWindow.current = win;
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.style.backgroundColor = '#1c1917';
    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);
    win.onbeforeunload = () => { onClose(); };
    return () => { win.close(); };
  }, [onClose]);
  return container ? createPortal(children, container) : null;
};

function App() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && window.opener) {
      window.opener.postMessage({ type: 'TWITCH_LOGIN_SUCCESS', hash }, window.location.origin);
      window.close();
    }
  }, []);

  // --- ESTADOS ---
  const [entrou, setEntrou] = useState(false);
  const [nome, setNome] = useState('');
  const [sala, setSala] = useState('');
  const [senha, setSenha] = useState('');
  const [modoLogin, setModoLogin] = useState('MENU');
  const [erroLogin, setErroLogin] = useState('');
  const [jogadores, setJogadores] = useState([]);
  const [fase, setFase] = useState('LOBBY');
  const [meuPapel, setMeuPapel] = useState(null);
  const [dadosRodada, setDadosRodada] = useState({ palavra: null });
  const [souHost, setSouHost] = useState(false);
  const [infoRodada, setInfoRodada] = useState({ atual: 0, total: 0 });
  const [minhaPalavraInicial, setMinhaPalavraInicial] = useState('');
  const [textoPreparacao, setTextoPreparacao] = useState('');
  const [jaEnvieiPreparacao, setJaEnvieiPreparacao] = useState(false);
  const [statusPreparacao, setStatusPreparacao] = useState({ prontos: 0, total: 0 });
  const [descricaoRecebida, setDescricaoRecebida] = useState('');
  const [textoCensurado, setTextoCensurado] = useState('');
  const [inputsSabotagem, setInputsSabotagem] = useState(Array(10).fill(''));
  const [sabotagemEnviada, setSabotagemEnviada] = useState(false);
  const [tentativaDecifrador, setTentativaDecifrador] = useState('');
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

  const [configSala, setConfigSala] = useState({
    twitchAuth: false,
    streamerMode: false,
    numCiclos: 1,
    tempos: { preparacao: 120, sabotagem: 30, decifracao: 45 }
  });
  const [configRecebida, setConfigRecebida] = useState(null);
  const [janelaExternaAberta, setJanelaExternaAberta] = useState(false);
  const [menuBan, setMenuBan] = useState({ visivel: false, x: 0, y: 0, jogadorId: null, jogadorNome: '' });
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
    setLogsSistema((prev) => [...prev, { ...dados, id }]);
    setTimeout(() => { setLogsSistema((prev) => prev.filter((log) => log.id !== id)); }, 4000);
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
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': TWITCH_CLIENT_ID },
      });
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const userTwitch = data.data[0];
        if (acaoPendente === 'CRIAR') {
          setNome(userTwitch.display_name);
          socket.emit('criar_sala', { nomeJogador: userTwitch.display_name, senha: '', config: configSala, twitchData: { id: userTwitch.id, login: userTwitch.login, token: accessToken, foto: userTwitch.profile_image_url } });
        } else if (acaoPendente === 'ENTRAR') {
          setNome(userTwitch.display_name);
          socket.emit('entrar_sala', { nomeJogador: userTwitch.display_name, roomId: sala, senha: '', token: null, twitchData: { id: userTwitch.id, login: userTwitch.login, token: accessToken, foto: userTwitch.profile_image_url } });
        }
      }
    } catch (error) { setErroLogin('Erro Auth Twitch'); }
  };

  const abrirPopupTwitch = (acao) => {
    setAcaoPendente(acao);
    const redirectUri = window.location.origin;
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
    const w = 500, h = 700;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    window.open(authUrl, 'Twitch Auth', `width=${w},height=${h},top=${top},left=${left}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) { setSala(roomParam); setModoLogin('ENTRAR'); socket.emit('verificar_sala', roomParam); window.history.replaceState({}, document.title, '/'); }
    const saved = localStorage.getItem('censorizador_session');
    if (saved) {
      const parsed = JSON.parse(saved); setSessaoSalva(parsed); if (parsed.roomId) socket.emit('verificar_sala', parsed.roomId);
    }
    socket.on('info_sala_retorno', (dados) => { setSalaEhTwitch(dados.twitchAuth); });
    socket.on('sala_criada_sucesso', (dados) => {
      const sessionData = { roomId: dados.roomId, token: dados.userToken, nome: dados.jogadores[0].nome, senha };
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData));
      setSala(dados.roomId); setJogadores(dados.jogadores); setConfigRecebida(dados.config); setEntrou(true); setFase('LOBBY'); setErroLogin(''); setNome(dados.jogadores[0].nome);
    });
    socket.on('entrada_sucesso', (dados) => {
      const tokenSalvo = localStorage.getItem('censorizador_session') ? JSON.parse(localStorage.getItem('censorizador_session')).token : null;
      const eu = dados.jogadores.find((j) => j.id === socket.id);
      const sessionData = { roomId: dados.roomId, token: tokenSalvo, nome: eu ? eu.nome : nome, senha };
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData));
      setSala(dados.roomId); setJogadores(dados.jogadores); setFase(dados.fase); setConfigRecebida(dados.config); setEntrou(true); setErroLogin('');
    });
    socket.on('sessao_invalida', () => { localStorage.removeItem('censorizador_session'); setSessaoSalva(null); setSalaEhTwitch(false); });
    socket.on('banido_da_sala', (msg) => { localStorage.removeItem('censorizador_session'); alert('⛔ ' + msg); window.location.reload(); });
    socket.on('log_evento', (d) => { setLogsSistema((p) => [...p, { ...d, id: Date.now() }]); });
    socket.on('erro_login', (msg) => { setErroLogin(msg); });
    socket.on('atualizar_sala', (l) => { setJogadores(l); const eu = l.find((j) => j.id === socket.id); if (eu) setSouHost(eu.isHost); });
    socket.on('sala_encerrada', () => { localStorage.removeItem('censorizador_session'); window.location.reload(); });
    socket.on('aviso_sala', (d) => setAviso(d));
    socket.on('inicio_preparacao', (d) => { setFase('PREPARACAO'); setMinhaPalavraInicial(d.palavra); setJaEnvieiPreparacao(false); setTextoPreparacao(''); });
    socket.on('status_preparacao', (d) => setStatusPreparacao(d));
    socket.on('nova_rodada', (d) => {
      setFase('SABOTAGEM'); setMeuPapel(d.meuPapel); setInfoRodada({ atual: d.rodadaAtual, total: d.totalRodadas });
      setInputsSabotagem(Array(10).fill('')); setSabotagemEnviada(false); setTentativaDecifrador(''); setDescricaoRecebida(d.descricao || '');
      if (d.protagonistas) setProtagonistas(d.protagonistas); if (d.palavraRevelada) setDadosRodada({ palavra: d.palavraRevelada });
    });
    socket.on('fase_decifrar', (d) => {
      setFase('DECIFRANDO'); setTextoCensurado(d.textoCensurado); setPalavrasSabotadasRodada(d.palavrasEfetivas || []);
      if (d.segundosRestantes) setAlvoLocal(Date.now() + d.segundosRestantes * 1000);
    });
    socket.on('sincronizar_tempo', ({ segundosRestantes }) => setAlvoLocal(Date.now() + segundosRestantes * 1000));
    socket.on('resultado_rodada', (d) => { setFase('RESULTADO'); setResultadoRodada(d); setJogadores(d.ranking); setAlvoLocal(0); });
    socket.on('fim_de_jogo', () => setFase('FIM'));
    return () => { socket.offAny(); };
  }, [nome, senha, sala]);

  useEffect(() => { if (alvoLocal === 0) return; const i = setInterval(() => { const d = Math.ceil((alvoLocal - Date.now()) / 1000); setTempoRestante(d > 0 ? d : 0); if (d <= 0) setAlvoLocal(0); }, 200); return () => clearInterval(i); }, [alvoLocal]);
  useEffect(() => { if (fase === 'PREPARACAO' && tempoRestante === 1 && !jaEnvieiPreparacao) { if (textoPreparacao.length > 0) enviarTextoPreparacao(); else { socket.emit('enviar_preparacao', { nomeSala: sala, texto: '...' }); setJaEnvieiPreparacao(true); setJanelaExternaAberta(false); } } }, [tempoRestante, fase, jaEnvieiPreparacao, textoPreparacao, sala]);

  const acaoReconectar = () => { if (sessaoSalva) { setNome(sessaoSalva.nome); setSala(sessaoSalva.roomId); setSenha(sessaoSalva.senha); socket.emit('entrar_sala', { nomeJogador: sessaoSalva.nome, roomId: sessaoSalva.roomId, senha: sessaoSalva.senha, token: sessaoSalva.token }); } };
  const acaoCriarSala = () => { if (configSala.twitchAuth) abrirPopupTwitch('CRIAR'); else { if (nome && senha) socket.emit('criar_sala', { nomeJogador: nome, senha, config: configSala }); else setErroLogin('Preencha tudo!'); } };
  const acaoEntrarSala = () => { if (salaEhTwitch) abrirPopupTwitch('ENTRAR'); else { if (nome && sala && senha) socket.emit('entrar_sala', { nomeJogador: nome, roomId: sala, senha, token: sessaoSalva?.token }); else setErroLogin('Preencha tudo!'); } };
  const copiarLinkConvite = () => { navigator.clipboard.writeText(`${window.location.origin}?room=${sala}`).then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000); }); };
  const iniciarJogo = () => socket.emit('iniciar_jogo', sala);
  const proximaRodada = () => socket.emit('proxima_rodada', sala);
  const enviarTextoPreparacao = () => { socket.emit('enviar_preparacao', { nomeSala: sala, texto: textoPreparacao }); setJaEnvieiPreparacao(true); setJanelaExternaAberta(false); };
  const enviarSabotagem = () => { socket.emit('sabotador_envia', { nomeSala: sala, previsoes: inputsSabotagem.filter((p) => p.trim() !== '') }); setSabotagemEnviada(true); };
  const atualizarInputSabotagem = (i, v) => { const n = [...inputsSabotagem]; n[i] = v; setInputsSabotagem(n); };
  const enviarDecifracao = () => socket.emit('decifrador_chuta', { nomeSala: sala, tentativa: tentativaDecifrador });
  const sairDaSala = () => { if (confirm('Sair?')) { localStorage.removeItem('censorizador_session'); window.location.reload(); } };
  const handleContextMenuJogador = (e, jogador) => { if (!souHost) return; if (jogador.id === socket.id) return; e.preventDefault(); setMenuBan({ visivel: true, x: e.clientX, y: e.clientY, jogadorId: jogador.id, jogadorNome: jogador.nome }); };
  const confirmarBan = () => { if (menuBan.jogadorId) { socket.emit('banir_jogador', { roomId: sala, targetId: menuBan.jogadorId }); } setMenuBan({ ...menuBan, visivel: false }); };

  const TopBar = () => (
    <div style={styles.navBar}>
      <div style={{ color: '#aaa', fontSize: '12px', letterSpacing: '1px' }}>CONFIDENCIAL // OPERAÇÃO {sala}</div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button onClick={sairDaSala} style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textTransform: 'uppercase' }}>SAIR [X]</button>
        <button onClick={() => setModoStreamerLocal(!modoStreamerLocal)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textTransform: 'uppercase' }}>{modoStreamerLocal ? 'MODO STREAMER: ON' : 'MODO STREAMER: OFF'}</button>
      </div>
    </div>
  );

const Timer = () => {
    // 1. Descobre o tempo total da fase atual para calcular a %
    let tempoTotalFase = 1; // Evita divisão por zero
    if (fase === 'PREPARACAO') tempoTotalFase = parseInt(configSala.tempos.preparacao);
    else if (fase === 'SABOTAGEM') tempoTotalFase = parseInt(configSala.tempos.sabotagem);
    else if (fase === 'DECIFRANDO') tempoTotalFase = parseInt(configSala.tempos.decifracao);
    
    // 2. Calcula a porcentagem restante
    const porcentagem = Math.min(100, Math.max(0, (tempoRestante / tempoTotalFase) * 100));
    
    // 3. Define a cor: Verde normal, Vermelho quando estiver acabando (< 20%)
    const corDinamica = porcentagem < 25 ? '#ef4444' : '#afffbf';

    return (
      <div style={{ 
          position: 'fixed', 
          top: '15px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '220px' // Largura fixa para a barra não ficar dançando
      }}>
        {/* TEXTO DO RELÓGIO */}
        <div style={{ 
            color: corDinamica, 
            fontSize: '24px', 
            fontWeight: 'bold', 
            textShadow: `0 0 10px ${corDinamica}`,
            marginBottom: '4px',
            fontFamily: "'Courier Prime', monospace"
        }}>
          {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}
        </div>

        {/* CONTAINER DA BARRA (Fundo Escuro) */}
        <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(0, 20, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            {/* A BARRA QUE DIMINUI */}
            <div style={{
                height: '100%',
                width: `${porcentagem}%`,
                backgroundColor: corDinamica,
                boxShadow: `0 0 8px ${corDinamica}`, // Brilho Neon
                transition: 'width 0.2s linear, background-color 0.5s ease' // Animação suave
            }} />
        </div>
      </div>
    );
  };

  // WIDGET DE REGRAS RESTAURADO
  const RulesWidget = () => (
    <>
      <button onClick={() => setExibirRegras(!exibirRegras)} style={styles.helpBtn} title="Protocolos da Missão">?</button>
      <div style={{ ...styles.rulesBox, transform: exibirRegras ? 'scale(1)' : 'scale(0)' }}>
        <div style={{ borderBottom: '1px dashed #afffbf', paddingBottom: '10px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize:'16px' }}>📂 PROTOCOLOS</h3>
        </div>
        <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', lineHeight: '1.5em', listStyle: 'none' }}>
          <li style={{ marginBottom: '8px' }}><strong>1. O SEGREDO:</strong> Cada um recebe uma palavra secreta.</li>
          <li style={{ marginBottom: '8px' }}><strong>2. 🕵️ CIFRADOR:</strong> Descreve a palavra sem usá-la diretamente.</li>
          <li style={{ marginBottom: '8px' }}><strong>3. ✂️ SABOTADOR:</strong> Censura palavras para quebrar o texto.</li>
          <li style={{ marginBottom: '8px' }}><strong>4. 🧩 DECIFRADOR:</strong> Tenta adivinhar a palavra original.</li>
        </ul>
        <div style={{ marginTop: '10px', fontSize: '10px', fontStyle: 'italic', textAlign: 'center', color: '#ff6666' }}>
          "CONFIE EM NINGUÉM."
        </div>
      </div>
    </>
  );

  const AvisoToast = () => { if (!aviso) return null; const color = aviso.tipo === 'perigo' ? '#ff6666' : '#86efac'; return (<div style={{ position: 'fixed', top: '60px', left: '0', width: '100%', textAlign: 'center', color: color, fontWeight: 'bold', background: 'rgba(0,0,0,0.8)', padding: '10px', zIndex: 100 }}>{aviso.msg}</div>); };

  const renderContent = () => {
    // 1. TELA DE LOGIN
    if (!entrou) {
      const emMenu = modoLogin === 'MENU';
      const emCriar = modoLogin === 'CRIAR';
      const emEntrar = modoLogin === 'ENTRAR';

      return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
          <img src={logoImage} style={styles.logoHero} />

          {emMenu && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {sessaoSalva && <button onClick={acaoReconectar} style={{...styles.btnPrimary, background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)'}}>VOLTAR PARA {sessaoSalva.roomId}</button>}
              <button onClick={() => setModoLogin('CRIAR')} style={styles.btnPrimary}>INICIAR NOVA OPERAÇÃO</button>
              <button onClick={() => setModoLogin('ENTRAR')} style={styles.btnSecondary}>ACESSAR OPERAÇÃO EXISTENTE</button>
            </div>
          )}

          {emCriar && (
            <div>
              <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>CONFIGURAR MISSÃO</h3>
              
              <input placeholder="CODINOME" value={configSala.twitchAuth ? '(Via Twitch)' : nome} disabled={configSala.twitchAuth} onChange={(e) => setNome(e.target.value)} style={styles.inputCRT} />
              <input placeholder="SENHA" type="text" value={configSala.twitchAuth ? '' : senha} disabled={configSala.twitchAuth} onChange={(e) => setSenha(e.target.value)} style={styles.inputCRT} />

              <div style={{ margin: '20px 0', textAlign: 'left', color: '#ccc' }}>
                  <label style={{ fontSize: '12px', letterSpacing: '1px' }}>CICLOS DE RODADAS:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="range" min="1" max="5" value={configSala.numCiclos} onChange={e => setConfigSala({...configSala, numCiclos: parseInt(e.target.value)})} style={{ flex: 1 }} />
                      <span style={{ fontWeight: 'bold' }}>{configSala.numCiclos}</span>
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left', color: '#ccc' }}>
                  <div><label style={{ fontSize: '10px' }}>PREPARAÇÃO (s)</label><input type="number" value={configSala.tempos.preparacao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, preparacao: e.target.value}})} style={styles.inputCRT_Small} /></div>
                  <div><label style={{ fontSize: '10px' }}>SABOTAGEM (s)</label><input type="number" value={configSala.tempos.sabotagem} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, sabotagem: e.target.value}})} style={styles.inputCRT_Small} /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '10px' }}>DECIFRAÇÃO (s)</label><input type="number" value={configSala.tempos.decifracao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, decifracao: e.target.value}})} style={styles.inputCRT_Small} /></div>
              </div>

              <div style={{ textAlign: 'left', margin: '20px 0', fontSize: '12px', color: '#999' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}><input type="checkbox" checked={configSala.twitchAuth} onChange={(e) => setConfigSala({ ...configSala, twitchAuth: e.target.checked })} /> Usar Twitch Auth</label>
                <label style={{ display: 'block' }}><input type="checkbox" checked={configSala.streamerMode} onChange={(e) => setConfigSala({ ...configSala, streamerMode: e.target.checked })} /> Modo Streamer</label>
              </div>

              <button onClick={acaoCriarSala} style={{...styles.btnPrimary, background: configSala.twitchAuth ? '#7c3aed' : styles.btnPrimary.background }}>{configSala.twitchAuth ? 'LOGAR TWITCH & CRIAR' : 'CRIAR SALA'}</button>
              <button onClick={() => setModoLogin('MENU')} style={styles.btnSecondary}>VOLTAR</button>
            </div>
          )}

          {emEntrar && (
            <div>
              <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>ACESSAR SISTEMA</h3>
              <input placeholder="CÓDIGO DA SALA" value={sala} onChange={(e) => setSala(e.target.value.toUpperCase())} style={{ ...styles.inputCRT, textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }} />
              {!salaEhTwitch && (<><input placeholder="SEU CODINOME" onChange={(e) => setNome(e.target.value)} style={styles.inputCRT} /><input placeholder="SENHA DA SALA" type="text" onChange={(e) => setSenha(e.target.value)} style={styles.inputCRT} /></>)}
              {salaEhTwitch && (<p style={{ color: '#a78bfa', fontSize: '12px' }}>🔒 ESTA SALA REQUER LOGIN TWITCH</p>)}
              <button onClick={acaoEntrarSala} style={{ ...styles.btnPrimary, background: salaEhTwitch ? '#7c3aed' : styles.btnPrimary.background }}>{salaEhTwitch ? 'LOGAR COM TWITCH' : 'ENTRAR NA SALA'}</button>
              <button onClick={() => setModoLogin('MENU')} style={styles.btnSecondary}>VOLTAR</button>
            </div>
          )}
          {erroLogin && <div style={{ color: '#ff6666', marginTop: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px' }}>{erroLogin}</div>}
        </div>
      );
    }

    if (fase === 'LOBBY') {
      return (
        <div>
          <TopBar />
          <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '40px' }}>
            <h2 style={{ margin: '0', color: '#fff', fontSize: '42px', letterSpacing: '5px', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>OPERAÇÃO: {sala}</h2>
            <p style={{ fontSize: '14px', color: '#888', margin: '15px 0', letterSpacing: '2px' }}>// AGENTES CONECTADOS //</p>
            <button onClick={copiarLinkConvite} style={{ ...styles.btnSecondary, width: 'auto', padding: '10px 20px', fontSize: '12px', borderRadius: '20px' }}>{linkCopiado ? 'LINK COPIADO! ✅' : '🔗 COPIAR CÓDIGO'}</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', justifyContent: 'center', marginBottom: '50px' }}>
            {jogadores.map((j) => (
              <div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} style={styles.agentCard}>
                <div style={styles.agentPhoto}>{j.foto ? <img src={j.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px', lineHeight: '60px', display: 'block', textAlign: 'center' }}>🕵️</span>}</div>
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', marginTop: '5px' }}>{j.nome}</strong>
                <span style={{ fontSize: '10px', color: '#888' }}>{j.pontos} PTS</span>
                {j.isHost && <span style={{ color: '#f87171', fontWeight: 'bold', fontSize: '10px', marginTop: '5px' }}>DIRETOR</span>}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            {souHost ? (<button onClick={iniciarJogo} style={{ ...styles.btnPrimary, width: 'auto', padding: '20px 50px', fontSize: '18px', borderRadius: '50px' }}>INICIAR OPERAÇÃO</button>) : (<p style={{ color: '#aaa', animation: 'pulse 2s infinite', fontSize: '14px', letterSpacing: '1px' }}>AGUARDANDO O DIRETOR...</p>)}
          </div>
        </div>
      );
    }

    // --- FASE DE PREPARAÇÃO ---
    if (fase === 'PREPARACAO') {
      const devoEsconder = (souHost && configRecebida?.streamerMode) || modoStreamerLocal;
      return (
        <div>
          <TopBar /><Timer />
          {!jaEnvieiPreparacao ? (
            <>
              {devoEsconder ? (
                <div style={{ border: '2px dashed #666', padding: '30px', textAlign: 'center', color: '#ccc', marginTop: '100px', borderRadius: '10px' }}>
                  <h3>MODO STREAMER ATIVO</h3><p>Abra o painel secreto para ver sua palavra.</p><button onClick={() => setJanelaExternaAberta(true)} style={{...styles.btnPrimary, width: 'auto'}}>ABRIR PAINEL</button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '40px' }}>
                    <div style={{fontSize:'12px', color:'#888'}}>SUA PALAVRA SECRETA</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 10px #fff' }}>{minhaPalavraInicial}</div>
                  </div>
                  
                  {/* PAPEL COM ÁREA DE TEXTO */}
                  <div style={styles.paper}>
                    <div style={styles.folderTab}>RELATÓRIO //</div>
                    <textarea 
                      rows={10} 
                      autoFocus 
                      maxLength={200}
                      placeholder="Datilografe a descrição aqui..." 
                      value={textoPreparacao} 
                      onChange={(e) => setTextoPreparacao(e.target.value)} 
                      style={styles.paperTextArea} 
                    />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        {textoPreparacao.length}/200
                    </div>
                  </div>

                  <button onClick={enviarTextoPreparacao} style={styles.btnPrimary}>ENVIAR RELATÓRIO</button>
                </>
              )}
              
              {janelaExternaAberta && <JanelaExterna onClose={() => setJanelaExternaAberta(false)}><div style={{ padding: '20px', color: '#fff', fontFamily: 'monospace', textAlign: 'center' }}><h2>PALAVRA: {minhaPalavraInicial}</h2><textarea value={textoPreparacao} maxLength={200} onChange={(e) => setTextoPreparacao(e.target.value)} style={{ width: '100%', height: '300px', background: '#eee', color: '#000', border: '1px solid #555', padding:'10px', fontSize: '18px', fontFamily: 'monospace' }} /><button onClick={enviarTextoPreparacao} style={{ marginTop: '10px', padding: '15px', width: '100%', cursor: 'pointer', background: '#2563eb', color: 'white', border:'none', fontSize: '16px', fontWeight: 'bold' }}>ENVIAR</button></div></JanelaExterna>}
            </>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '150px', color: '#aaa' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📁</div>
              <h2>RELATÓRIO ARQUIVADO</h2>
              <p style={{ marginTop: '10px' }}>Aguardando outros agentes ({statusPreparacao.prontos}/{statusPreparacao.total})...</p>
            </div>
          )}
        </div>
      );
    }

    if (fase === 'SABOTAGEM') {
      return (
        <div>
          <TopBar /><Timer />
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#888', fontSize: '12px' }}>RODADA {infoRodada.atual}/{infoRodada.total}</div>
          {meuPapel === 'DECIFRADOR' && (<div style={{ textAlign: 'center', marginTop: '100px', color: '#f87171' }}><h1 style={{ fontSize: '40px', border: '4px solid #f87171', display: 'inline-block', padding: '20px' }}>ACESSO NEGADO</h1><p>Você é o Decifrador. Aguarde.</p></div>)}
          {meuPapel === 'CIFRADOR' && (<div style={styles.paper}><div style={styles.folderTab}>ALERTA //</div><h3 style={{ color: '#b91c1c', marginTop: 0 }}>SEU TEXTO ESTÁ SOB ATAQUE:</h3><p style={{ fontSize: '20px', lineHeight: '1.5' }}>"{descricaoRecebida}"</p></div>)}
          {meuPapel === 'SABOTADOR' && (<><div style={{ textAlign: 'center', marginBottom: '20px' }}><div style={{fontSize:'12px', color:'#888'}}>ALVO</div><strong style={{ fontSize: '32px', color:'#fbbf24' }}>{dadosRodada?.palavra}</strong></div>{!sabotagemEnviada ? (<div style={styles.paper}><div style={styles.folderTab}>CENSURA //</div>{inputsSabotagem.map((v, i) => (<input key={i} placeholder={`PALAVRA PROIBIDA #${i + 1}`} value={v} onChange={(e) => atualizarInputSabotagem(i, e.target.value)} style={styles.inputPaper} />))}<button onClick={enviarSabotagem} style={{ ...styles.btnPrimary, background: '#b91c1c', border: 'none' }}>EXECUTAR CENSURA</button></div>) : (<div style={{ textAlign: 'center', marginTop: '100px', color: '#aaa' }}><h2>CENSURA APLICADA</h2><p>Aguardando processamento...</p></div>)}</>)}
        </div>
      );
    }

    if (fase === 'DECIFRANDO') {
      return (
        <div>
          <TopBar /><Timer /><div style={{ textAlign: 'center', marginBottom: '30px', color: '#fff' }}><h2>DECODIFICAÇÃO</h2></div>
          <div style={styles.paper}><div style={{ position: 'absolute', top: '20px', right: '20px', border: '3px solid #b91c1c', padding: '5px 10px', fontSize: '14px', transform: 'rotate(-15deg)', opacity: 0.7, color: '#b91c1c', fontWeight: 'bold' }}>TOP SECRET</div><p style={{ fontSize: '22px', lineHeight: '1.8' }}>{textoCensurado.split(/(\[CENSURADO\])/g).map((parte, i) => parte === '[CENSURADO]' ? (<span key={i} style={{ background: '#111', color: 'transparent', padding: '0 8px', borderRadius: '4px' }}>████</span>) : (<span key={i}>{parte}</span>))}</p></div>
          {meuPapel === 'SABOTADOR' && (<div style={{ marginTop: '30px', textAlign: 'center' }}><p style={{ fontSize: '12px', color: '#888' }}>TENTATIVAS DA EQUIPE:</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>{palavrasSabotadasRodada.map((p, i) => (<span key={i} style={{ background: '#fef3c7', color: '#000', padding: '5px 10px', fontSize: '12px', borderRadius: '4px', fontWeight: 'bold' }}>{((souHost && configRecebida?.streamerMode) || modoStreamerLocal) ? '████' : p}</span>))}</div></div>)}
          {meuPapel === 'DECIFRADOR' ? (<div style={{ marginTop: '30px' }}><input placeholder="QUAL É A PALAVRA?" value={tentativaDecifrador} onChange={(e) => setTentativaDecifrador(e.target.value)} style={styles.inputCRT} autoFocus /><button onClick={enviarDecifracao} style={styles.btnPrimary}>ENVIAR RESPOSTA</button></div>) : (<p style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>// AGUARDANDO ANÁLISE DO DECIFRADOR //</p>)}
        </div>
      );
    }

    if (fase === 'RESULTADO' && resultadoRodada) {
      return (
        <div style={{ textAlign: 'center' }}>
          <TopBar /><h1 style={{ color: resultadoRodada.acertou ? '#4ade80' : '#f87171', textShadow: '0 0 20px currentColor', fontSize: '32px', marginTop: '40px' }}>{resultadoRodada.acertou ? 'SUCESSO NA DECIFRAÇÃO' : 'FALHA NA DECIFRAÇÃO'}</h1>
          <div style={styles.paper}><div style={styles.folderTab}>RELATÓRIO //</div><p style={{fontSize:'14px', color:'#666', marginBottom:'5px'}}>A PALAVRA ERA:</p><strong style={{ color: '#b91c1c', fontSize: '36px', display:'block', marginBottom:'20px' }}>{resultadoRodada.palavraSecreta}</strong><p>O DECIFRADOR DISSE: <strong>{resultadoRodada.tentativa}</strong></p><hr style={{ borderColor: '#ddd', margin: '20px 0' }} /><ul style={{ textAlign: 'left', fontSize: '16px', listStyle:'none', padding:0 }}>{resultadoRodada.resumo.map((l, i) => (<li key={i} style={{ marginBottom: '10px', paddingBottom:'10px', borderBottom:'1px dashed #ccc' }}>{l}</li>))}</ul></div>
          {souHost ? (<button onClick={proximaRodada} style={{...styles.btnPrimary, width: 'auto', padding: '15px 40px'}}>PRÓXIMA RODADA ➡️</button>) : (<p style={{ color: '#aaa' }}>AGUARDANDO O DIRETOR...</p>)}
        </div>
      );
    }

    if (fase === 'FIM') {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '60px', color: '#fff', marginBottom: '40px' }}>MISSÃO CUMPRIDA</h1>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '30px', maxWidth: '500px', margin: '0 auto', borderRadius: '10px' }}>{jogadores.map((j, i) => (<div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '15px 0', color: '#fff', fontSize: '20px' }}><span>#{i + 1} {j.nome}</span><span>{j.pontos} PTS</span></div>))}</div>
          <button onClick={() => window.location.reload()} style={{ ...styles.btnPrimary, marginTop: '40px', width: 'auto' }}>NOVA MISSÃO</button>
        </div>
      );
    }

    return <div style={{ color: 'red' }}>ERRO DE FASE: {fase}</div>;
  };

  return <GlobalCRT><RulesWidget />{renderContent()}<AvisoToast /></GlobalCRT>;
}

export default App;