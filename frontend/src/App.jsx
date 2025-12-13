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
  // FUNDO GERAL (A MESA)
  mainWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    color: '#e5f5d0',
    backgroundColor: '#18120b',
    backgroundImage:
      'radial-gradient(circle at center, #3b2a16 0%, #120c07 60%, #050301 100%)',
    boxSizing: 'border-box',
    padding: '20px',
    overflow: 'hidden', // Evita scroll na mesa, só no monitor
  },

  // O HARDWARE (CAIXA DO MONITOR)
  monitorWrapper: {
    position: 'relative',
    padding: '30px 35px 55px 35px',
    background:
      'linear-gradient(145deg, #2b251c 0%, #0f0b07 60%, #050301 100%)',
    borderRadius: '28px',
    boxShadow:
      '0 45px 130px rgba(0,0,0,0.95), 0 0 0 6px #020100, inset 0 0 40px rgba(0,0,0,0.8)',
    maxWidth: '100%',
  },

  monitorBezel: {
    padding: '15px',
    background:
      'linear-gradient(145deg, #404833 0%, #212919 50%, #050805 100%)',
    borderRadius: '20px',
    boxShadow: '0 0 0 4px #060806, inset 0 0 28px rgba(0,0,0,0.9)',
  },

  // A TELA DE VIDRO (ONDE O JOGO ACONTECE)
  monitorScreen: {
    width: '800px',
    maxWidth: '85vw',
    height: '500px', // Altura fixa para simular o tubo
    maxHeight: '75vh',
    background:
      'radial-gradient(circle at 50% 15%, #2a3d2f 0%, #111a14 60%, #050e07 100%)', // Fundo desligado/escuro
    borderRadius: '22px',
    padding: '0', // Padding removido aqui, controlado no content
    boxShadow:
      'inset 0 0 60px rgba(0,0,0,0.9), 0 0 20px rgba(0,255,150,0.05)',
    position: 'relative',
    overflow: 'hidden', // Garante que scanlines fiquem por cima
    display: 'flex',
    flexDirection: 'column'
  },

  // CONTEÚDO ROLÁVEL DENTRO DA TELA
  screenContent: {
    flex: 1, // Ocupa o espaço restante
    width: '100%',
    padding: '30px',
    overflowY: 'auto', // Habilita scroll dentro da tela verde
    boxSizing: 'border-box',
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: '#1d5a32 #050e07',
    display: 'flex',
    flexDirection: 'column'
  },

  // EFEITOS VISUAIS (Scanlines, Vidro)
  scanlines: {
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(0,0,0,0.42) 1px, transparent 1px)',
    backgroundSize: '100% 3px',
    mixBlendMode: 'overlay',
    opacity: 0.6,
    zIndex: 10,
  },

  vignette: {
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
    boxShadow:
      'inset 0 0 90px rgba(0,0,0,0.9), inset 0 0 160px rgba(0,0,0,0.8)',
    borderRadius: '22px',
    zIndex: 11,
  },

  glassHighlight: {
    pointerEvents: 'none',
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    right: '-10%',
    height: '40%',
    background:
      'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)',
    opacity: 0.6,
    zIndex: 12,
  },

  // HARDWARE INFERIOR (BOTÕES FAKES)
  consoleBottom: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: '-35px',
    width: '420px',
    height: '80px',
    background:
      'linear-gradient(180deg, #26231c 0%, #17130e 60%, #050402 100%)',
    borderRadius: '0 0 26px 26px',
    boxShadow:
      '0 18px 40px rgba(0,0,0,0.95), inset 0 -6px 8px rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '10px 25px',
    zIndex: 0,
  },
  consoleKnob: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background:
      'radial-gradient(circle at 30% 20%, #fdfdfd 0%, #aaa 40%, #111 100%)',
    boxShadow:
      '0 4px 8px rgba(0,0,0,0.9), inset 0 -3px 5px rgba(0,0,0,0.8)',
  },
  consoleLamp: {
    width: '14px',
    height: '22px',
    borderRadius: '8px',
    background:
      'radial-gradient(circle at 50% 0%, #ffe89a 0%, #fbbf24 30%, #7c2d12 80%)',
    boxShadow:
      '0 0 12px rgba(251, 191, 36, 0.9), 0 0 26px rgba(251, 191, 36, 0.75)',
  },

  // --- ELEMENTOS DE UI (DENTRO DA TELA) ---

  // A Pasta Manila (Ainda usada em fases posteriores)
  paper: {
    backgroundColor: '#f0e6d2',
    backgroundImage:
      'linear-gradient(to bottom, #fdfbf7 0%, #f0e6d2 100%)',
    padding: '30px',
    boxShadow:
      '0 10px 30px rgba(0,0,0,0.8), inset 0 0 40px rgba(160, 140, 100, 0.2)',
    maxWidth: '100%',
    width: '100%',
    margin: '0 auto 20px auto',
    border: '1px solid #c0b090',
    position: 'relative',
    borderRadius: '2px',
    color: '#1a1a1a', // Texto escuro no papel
  },

  folderTab: {
    position: 'absolute',
    top: '-30px',
    left: '0',
    width: '180px',
    height: '32px',
    backgroundColor: '#f0e6d2',
    borderTop: '1px solid #e0d0b0',
    borderLeft: '1px solid #e0d0b0',
    borderRight: '1px solid #b0a080',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#8a7a60',
    letterSpacing: '1px',
    boxShadow: 'inset 0 10px 10px -10px rgba(255,255,255,0.8)',
  },

  // Inputs e Botões (Estilo CRT)
  inputCRT: {
    padding: '10px 12px',
    margin: '8px 0',
    fontSize: '16px',
    color: '#d5ffd9',
    backgroundColor: 'rgba(0, 20, 5, 0.6)',
    border: '1px solid rgba(156, 253, 177, 0.4)',
    width: '100%',
    fontFamily: "'Courier Prime', monospace",
    fontWeight: 600,
    boxSizing: 'border-box',
    outline: 'none',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },

  // Input estilo Papel (para usar dentro da pasta)
  inputPaper: {
    padding: '10px',
    margin: '8px 0',
    fontSize: '18px',
    color: '#222',
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: 'none',
    borderBottom: '2px dashed #666',
    width: '100%',
    fontFamily: 'inherit',
    fontWeight: 'bold',
    outline: 'none',
  },

  btnCRT: {
    padding: '12px 20px',
    width: '100%',
    backgroundColor: 'rgba(6, 20, 9, 0.9)',
    border: '1px solid #afffbf',
    color: '#e5ffe0',
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 0 10px rgba(0,255,150,0.1)',
    transition: 'all 0.1s',
  },
  
  btnCRTSecondary: {
    backgroundColor: 'transparent',
    borderColor: '#6ed88b',
    color: '#c8f7d0',
    boxShadow: 'none',
  },

  // Cards de Jogadores (Estilo CRT) - REFEITO
  agentCardCRT: {
    backgroundColor: 'rgba(0, 20, 5, 0.8)',
    color: '#afffbf',
    padding: '10px',
    width: '100px',
    margin: '10px',
    border: '1px solid #6ed88b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '12px',
    boxShadow: '0 0 5px rgba(0,255,150,0.2)'
  },
  
  agentPhotoCRT: {
    width:'50px', height:'50px', background:'#000', marginBottom:'5px', overflow:'hidden', border:'1px solid #6ed88b',
    // Filtro verde para a foto
    filter: 'grayscale(100%) sepia(100%) hue-rotate(90deg) saturate(1.5) brightness(0.8) contrast(1.2)'
  },

  // Botões Flutuantes (Sair, Streamer)
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(0,255,150,0.3)',
    paddingBottom: '10px',
    flexShrink: 0 // Impede que a barra encolha
  },

  // LOGO VERDE (NOVO ESTILO)
  logoCRT: {
    width: '50%',
    maxWidth: '300px',
    margin: '0 auto 20px auto',
    // Filtro para deixar verde e monocromático
    filter: 'grayscale(100%) sepia(100%) hue-rotate(90deg) saturate(2) brightness(0.9) contrast(1.1) drop-shadow(0 0 5px rgba(0,255,150,0.5))',
    opacity: 0.9
  }
};

// COMPONENTE: ESTRUTURA DO MONITOR (OLD SCHOOL)
const MonitorFrame = ({ children }) => (
  <div style={styles.mainWrapper}>
    <div style={styles.monitorWrapper}>
      <div style={styles.monitorBezel}>
        <div style={styles.monitorScreen}>
          <div style={styles.glassHighlight} />
          <div style={styles.vignette} />
          <div style={styles.scanlines} />

          {/* Conteúdo com Scroll */}
          <div style={styles.screenContent}>{children}</div>
        </div>
      </div>

      {/* Painel Inferior Fake */}
      <div style={styles.consoleBottom}>
        <div style={styles.consoleKnob} />
        <div style={styles.consoleKnob} />
        <div
          style={{
            width: '60px',
            height: '20px',
            background: '#333',
            borderRadius: '4px',
            border: '1px solid #555',
          }}
        ></div>
        <div style={styles.consoleLamp} />
        <div style={styles.consoleLamp} />
      </div>
    </div>
  </div>
);

// POPUP EXTERNO
const JanelaExterna = ({ children, onClose }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);

  useEffect(() => {
    const win = window.open(
      '',
      '',
      'width=600,height=500,left=200,top=200',
    );
    if (!win) {
      alert('Permita pop-ups!');
      onClose();
      return;
    }
    externalWindow.current = win;
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.style.backgroundColor = '#1c1917';
    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);
    win.onbeforeunload = () => {
      onClose();
    };
    return () => {
      win.close();
    };
  }, [onClose]);

  return container ? createPortal(children, container) : null;
};

function App() {
  // Lógica Pop-up Twitch
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && window.opener) {
      window.opener.postMessage(
        { type: 'TWITCH_LOGIN_SUCCESS', hash },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  // --- ESTADOS DO JOGO ---
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
  const [statusPreparacao, setStatusPreparacao] = useState({
    prontos: 0,
    total: 0,
  });
  const [descricaoRecebida, setDescricaoRecebida] = useState('');
  const [textoCensurado, setTextoCensurado] = useState('');
  const [inputsSabotagem, setInputsSabotagem] = useState(
    Array(10).fill(''),
  );
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
    tempos: {
      preparacao: 120,
      sabotagem: 30,
      decifracao: 45,
    },
  });
  const [configRecebida, setConfigRecebida] = useState(null);
  const [janelaExternaAberta, setJanelaExternaAberta] = useState(false);
  const [menuBan, setMenuBan] = useState({
    visivel: false,
    x: 0,
    y: 0,
    jogadorId: null,
    jogadorNome: '',
  });
  const [logsSistema, setLogsSistema] = useState([]);
  const [palavrasSabotadasRodada, setPalavrasSabotadasRodada] = useState(
    [],
  );

  const audioSuccess = useRef(null);
  const audioError = useRef(null);

  useEffect(() => {
    audioSuccess.current = new Audio('/success.mp3');
    audioError.current = new Audio('/error.mp3');
    audioSuccess.current.volume = 0.5;
    audioError.current.volume = 0.5;
  }, []);

  const adicionarLog = (dados) => {
    const id = Date.now();
    setLogsSistema((prev) => [...prev, { ...dados, id }]);
    setTimeout(() => {
      setLogsSistema((prev) => prev.filter((log) => log.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (sala.length === 4) socket.emit('verificar_sala', sala);
    else setSalaEhTwitch(false);
  }, [sala]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'TWITCH_LOGIN_SUCCESS') {
        const params = new URLSearchParams(
          event.data.hash.replace('#', '?'),
        );
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const userTwitch = data.data[0];
        if (acaoPendente === 'CRIAR') {
          setNome(userTwitch.display_name);
          socket.emit('criar_sala', {
            nomeJogador: userTwitch.display_name,
            senha: '',
            config: configSala,
            twitchData: {
              id: userTwitch.id,
              login: userTwitch.login,
              token: accessToken,
              foto: userTwitch.profile_image_url,
            },
          });
        } else if (acaoPendente === 'ENTRAR') {
          setNome(userTwitch.display_name);
          socket.emit('entrar_sala', {
            nomeJogador: userTwitch.display_name,
            roomId: sala,
            senha: '',
            token: null,
            twitchData: {
              id: userTwitch.id,
              login: userTwitch.login,
              token: accessToken,
              foto: userTwitch.profile_image_url,
            },
          });
        }
      }
    } catch (error) {
      setErroLogin('Erro Auth Twitch');
    }
  };

  const abrirPopupTwitch = (acao) => {
    setAcaoPendente(acao);
    const redirectUri = window.location.origin;
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
    const w = 500;
    const h = 700;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    window.open(
      authUrl,
      'Twitch Auth',
      `width=${w},height=${h},top=${top},left=${left}`,
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setSala(roomParam);
      setModoLogin('ENTRAR');
      socket.emit('verificar_sala', roomParam);
      window.history.replaceState({}, document.title, '/');
    }
    const saved = localStorage.getItem('censorizador_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessaoSalva(parsed);
      if (parsed.roomId) socket.emit('verificar_sala', parsed.roomId);
    }

    socket.on('info_sala_retorno', (dados) => {
      setSalaEhTwitch(dados.twitchAuth);
    });
    socket.on('sala_criada_sucesso', (dados) => {
      const sessionData = {
        roomId: dados.roomId,
        token: dados.userToken,
        nome: dados.jogadores[0].nome,
        senha,
      };
      localStorage.setItem(
        'censorizador_session',
        JSON.stringify(sessionData),
      );
      setSala(dados.roomId);
      setJogadores(dados.jogadores);
      setConfigRecebida(dados.config);
      setEntrou(true);
      setFase('LOBBY');
      setErroLogin('');
      setNome(dados.jogadores[0].nome);
    });
    socket.on('entrada_sucesso', (dados) => {
      const tokenSalvo = localStorage.getItem('censorizador_session')
        ? JSON.parse(localStorage.getItem('censorizador_session')).token
        : null;
      const eu = dados.jogadores.find((j) => j.id === socket.id);
      const sessionData = {
        roomId: dados.roomId,
        token: tokenSalvo,
        nome: eu ? eu.nome : nome,
        senha,
      };
      localStorage.setItem(
        'censorizador_session',
        JSON.stringify(sessionData),
      );
      setSala(dados.roomId);
      setJogadores(dados.jogadores);
      setFase(dados.fase);
      setConfigRecebida(dados.config);
      setEntrou(true);
      setErroLogin('');
    });
    socket.on('sessao_invalida', () => {
      localStorage.removeItem('censorizador_session');
      setSessaoSalva(null);
      setSalaEhTwitch(false);
    });
    socket.on('banido_da_sala', (msg) => {
      localStorage.removeItem('censorizador_session');
      alert('⛔ ' + msg);
      window.location.reload();
    });
    socket.on('log_evento', (d) => {
      setLogsSistema((p) => [...p, { ...d, id: Date.now() }]);
    });
    socket.on('erro_login', (msg) => {
      setErroLogin(msg);
    });
    socket.on('atualizar_sala', (l) => {
      setJogadores(l);
      const eu = l.find((j) => j.id === socket.id);
      if (eu) setSouHost(eu.isHost);
    });
    socket.on('sala_encerrada', () => {
      localStorage.removeItem('censorizador_session');
      window.location.reload();
    });
    socket.on('aviso_sala', (d) => setAviso(d));
    socket.on('inicio_preparacao', (d) => {
      setFase('PREPARACAO');
      setMinhaPalavraInicial(d.palavra);
      setJaEnvieiPreparacao(false);
      setTextoPreparacao('');
    });
    socket.on('status_preparacao', (d) => setStatusPreparacao(d));
    socket.on('nova_rodada', (d) => {
      setFase('SABOTAGEM');
      setMeuPapel(d.meuPapel);
      setInfoRodada({
        atual: d.rodadaAtual,
        total: d.totalRodadas,
      });
      setInputsSabotagem(Array(10).fill(''));
      setSabotagemEnviada(false);
      setTentativaDecifrador('');
      setDescricaoRecebida(d.descricao || '');
      if (d.protagonistas) setProtagonistas(d.protagonistas);
      if (d.palavraRevelada)
        setDadosRodada({ palavra: d.palavraRevelada });
    });
    socket.on('fase_decifrar', (d) => {
      setFase('DECIFRANDO');
      setTextoCensurado(d.textoCensurado);
      setPalavrasSabotadasRodada(d.palavrasEfetivas || []);
      if (d.segundosRestantes)
        setAlvoLocal(Date.now() + d.segundosRestantes * 1000);
    });
    socket.on('sincronizar_tempo', ({ segundosRestantes }) =>
      setAlvoLocal(Date.now() + segundosRestantes * 1000),
    );
    socket.on('resultado_rodada', (d) => {
      setFase('RESULTADO');
      setResultadoRodada(d);
      setJogadores(d.ranking);
      setAlvoLocal(0);
    });
    socket.on('fim_de_jogo', () => setFase('FIM'));
    return () => {
      socket.offAny();
    };
  }, [nome, senha, sala]);

  useEffect(() => {
    if (alvoLocal === 0) return;
    const i = setInterval(() => {
      const d = Math.ceil((alvoLocal - Date.now()) / 1000);
      setTempoRestante(d > 0 ? d : 0);
      if (d <= 0) setAlvoLocal(0);
    }, 200);
    return () => clearInterval(i);
  }, [alvoLocal]);

  useEffect(() => {
    if (
      fase === 'PREPARACAO' &&
      tempoRestante === 1 &&
      !jaEnvieiPreparacao
    ) {
      if (textoPreparacao.length > 0) enviarTextoPreparacao();
      else {
        socket.emit('enviar_preparacao', {
          nomeSala: sala,
          texto: '...',
        });
        setJaEnvieiPreparacao(true);
        setJanelaExternaAberta(false);
      }
    }
  }, [
    tempoRestante,
    fase,
    jaEnvieiPreparacao,
    textoPreparacao,
    sala,
  ]);

  const acaoReconectar = () => {
    if (sessaoSalva) {
      setNome(sessaoSalva.nome);
      setSala(sessaoSalva.roomId);
      setSenha(sessaoSalva.senha);
      socket.emit('entrar_sala', {
        nomeJogador: sessaoSalva.nome,
        roomId: sessaoSalva.roomId,
        senha: sessaoSalva.senha,
        token: sessaoSalva.token,
      });
    }
  };
  const acaoCriarSala = () => {
    if (configSala.twitchAuth) abrirPopupTwitch('CRIAR');
    else {
      if (nome && senha)
        socket.emit('criar_sala', {
          nomeJogador: nome,
          senha,
          config: configSala,
        });
      else setErroLogin('Preencha tudo!');
    }
  };
  const acaoEntrarSala = () => {
    if (salaEhTwitch) abrirPopupTwitch('ENTRAR');
    else {
      if (nome && sala && senha)
        socket.emit('entrar_sala', {
          nomeJogador: nome,
          roomId: sala,
          senha,
          token: sessaoSalva?.token,
        });
      else setErroLogin('Preencha tudo!');
    }
  };
  const copiarLinkConvite = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}?room=${sala}`)
      .then(() => {
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2000);
      });
  };
  const iniciarJogo = () => socket.emit('iniciar_jogo', sala);
  const proximaRodada = () => socket.emit('proxima_rodada', sala);
  const enviarTextoPreparacao = () => {
    socket.emit('enviar_preparacao', {
      nomeSala: sala,
      texto: textoPreparacao,
    });
    setJaEnvieiPreparacao(true);
    setJanelaExternaAberta(false);
  };
  const enviarSabotagem = () => {
    socket.emit('sabotador_envia', {
      nomeSala: sala,
      previsoes: inputsSabotagem.filter((p) => p.trim() !== ''),
    });
    setSabotagemEnviada(true);
  };
  const atualizarInputSabotagem = (i, v) => {
    const n = [...inputsSabotagem];
    n[i] = v;
    setInputsSabotagem(n);
  };
  const enviarDecifracao = () =>
    socket.emit('decifrador_chuta', {
      nomeSala: sala,
      tentativa: tentativaDecifrador,
    });
  const sairDaSala = () => {
    if (confirm('Sair?')) {
      localStorage.removeItem('censorizador_session');
      window.location.reload();
    }
  };
  const handleContextMenuJogador = (e, jogador) => {
    if (!souHost) return;
    if (jogador.id === socket.id) return;
    e.preventDefault();
    setMenuBan({
      visivel: true,
      x: e.clientX,
      y: e.clientY,
      jogadorId: jogador.id,
      jogadorNome: jogador.nome,
    });
  };
  const confirmarBan = () => {
    if (menuBan.jogadorId) {
      socket.emit('banir_jogador', {
        roomId: sala,
        targetId: menuBan.jogadorId,
      });
    }
    setMenuBan({ ...menuBan, visivel: false });
  };

  // --- COMPONENTES AUXILIARES DE UI ---
  const TopBar = () => (
    <div style={styles.navBar}>
      <div
        style={{
          color: '#afffbf',
          fontSize: '12px',
          letterSpacing: '1px',
        }}
      >
        CONFIDENCIAL // OPERAÇÃO {sala}
      </div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={sairDaSala}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffb3b3',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            textTransform: 'uppercase'
          }}
        >
          SAIR [X]
        </button>
        <button
          onClick={() => setModoStreamerLocal(!modoStreamerLocal)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#afffbf',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            textTransform: 'uppercase'
          }}
        >
          {modoStreamerLocal
            ? 'MODO STREAMER: ON'
            : 'MODO STREAMER: OFF'}
        </button>
      </div>
    </div>
  );

  const Timer = () => (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '15px',
        color: tempoRestante < 10 ? '#ffb3b3' : '#e5f5d0',
        fontSize: '18px',
        fontWeight: 'bold',
        textShadow: '0 0 5px currentColor',
        zIndex: 50 // Acima do conteúdo
      }}
    >
      ⏱️ {Math.floor(tempoRestante / 60)}:
      {(tempoRestante % 60).toString().padStart(2, '0')}
    </div>
  );

  const AvisoToast = () => {
    if (!aviso) return null;
    const color = aviso.tipo === 'perigo' ? '#ffb3b3' : '#afffbf';
    return (
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '0',
          width: '100%',
          textAlign: 'center',
          color: color,
          fontWeight: 'bold',
          background: 'rgba(0,0,0,0.8)',
          padding: '5px',
          zIndex: 100,
        }}
      >
        {aviso.msg}
      </div>
    );
  };

  // --- RENDERIZADOR DE CONTEÚDO DA TELA ---
  const renderContent = () => {
    // 1. TELA DE LOGIN
    if (!entrou) {
      const emMenu = modoLogin === 'MENU';
      const emCriar = modoLogin === 'CRIAR';
      const emEntrar = modoLogin === 'ENTRAR';

      return (
        <div
          style={{
            textAlign: 'center',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            // Importante: remove overflow aqui para centralizar corretamente
            overflow: 'hidden'
          }}
        >
          <img
            src={logoImage}
            style={styles.logoCRT} // USA O NOVO ESTILO VERDE
          />

          {emMenu && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              {sessaoSalva && (
                <button
                  onClick={acaoReconectar}
                  style={styles.btnCRT}
                >
                  VOLTAR PARA {sessaoSalva.roomId}
                </button>
              )}
              <button
                onClick={() => setModoLogin('CRIAR')}
                style={styles.btnCRT}
              >
                INICIAR NOVA OPERAÇÃO
              </button>
              <button
                onClick={() => setModoLogin('ENTRAR')}
                style={{
                  ...styles.btnCRT,
                  ...styles.btnCRTSecondary,
                }}
              >
                ACESSAR OPERAÇÃO EXISTENTE
              </button>
            </div>
          )}

          {emCriar && (
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
              }}
            >
              <h3
                style={{
                  color: '#afffbf',
                  borderBottom: '1px solid #afffbf',
                }}
              >
                CONFIGURAR MISSÃO
              </h3>
              <input
                placeholder="CODINOME"
                value={
                  configSala.twitchAuth ? '(Via Twitch)' : nome
                }
                disabled={configSala.twitchAuth}
                onChange={(e) => setNome(e.target.value)}
                style={styles.inputCRT}
              />
              <input
                placeholder="SENHA"
                type="text"
                value={configSala.twitchAuth ? '' : senha}
                disabled={configSala.twitchAuth}
                onChange={(e) => setSenha(e.target.value)}
                style={styles.inputCRT}
              />

              <div
                style={{
                  textAlign: 'left',
                  margin: '10px 0',
                  fontSize: '12px',
                  color: '#9ae79f',
                }}
              >
                <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={configSala.twitchAuth}
                    onChange={(e) =>
                      setConfigSala({
                        ...configSala,
                        twitchAuth: e.target.checked,
                      })
                    }
                  />{' '}
                  Usar Twitch Auth
                </label>
                <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={configSala.streamerMode}
                    onChange={(e) =>
                      setConfigSala({
                        ...configSala,
                        streamerMode: e.target.checked,
                      })
                    }
                  />{' '}
                  Modo Streamer
                </label>
              </div>

              <button onClick={acaoCriarSala} style={styles.btnCRT}>
                {configSala.twitchAuth
                  ? 'LOGAR TWITCH & CRIAR'
                  : 'CRIAR SALA'}
              </button>
              <button
                onClick={() => setModoLogin('MENU')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ae79f',
                  marginTop: '10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                VOLTAR
              </button>
            </div>
          )}

          {emEntrar && (
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
              }}
            >
              <h3
                style={{
                  color: '#afffbf',
                  borderBottom: '1px solid #afffbf',
                }}
              >
                ACESSAR SISTEMA
              </h3>
              <input
                placeholder="CÓDIGO DA SALA"
                value={sala}
                onChange={(e) =>
                  setSala(e.target.value.toUpperCase())
                }
                style={{
                  ...styles.inputCRT,
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '5px',
                }}
              />

              {!salaEhTwitch && (
                <>
                  <input
                    placeholder="SEU CODINOME"
                    onChange={(e) => setNome(e.target.value)}
                    style={styles.inputCRT}
                  />
                  <input
                    placeholder="SENHA DA SALA"
                    type="text"
                    onChange={(e) => setSenha(e.target.value)}
                    style={styles.inputCRT}
                  />
                </>
              )}

              {salaEhTwitch && (
                <p style={{ color: '#bd93f9', fontSize: '12px' }}>
                  🔒 ESTA SALA REQUER LOGIN TWITCH
                </p>
              )}

              <button
                onClick={acaoEntrarSala}
                style={{
                  ...styles.btnCRT,
                  background: salaEhTwitch
                    ? '#bd93f9'
                    : styles.btnCRT.backgroundColor,
                  color: salaEhTwitch ? '#000' : '#e5ffe0',
                  borderColor: salaEhTwitch ? '#bd93f9' : '#afffbf'
                }}
              >
                {salaEhTwitch
                  ? 'LOGAR COM TWITCH'
                  : 'ENTRAR NA SALA'}
              </button>
              <button
                onClick={() => setModoLogin('MENU')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ae79f',
                  marginTop: '10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                VOLTAR
              </button>
            </div>
          )}

          {erroLogin && (
            <div
              style={{
                color: '#ffb3b3',
                marginTop: '10px',
                background: 'rgba(0,0,0,0.5)',
                padding: '5px',
              }}
            >
              {erroLogin}
            </div>
          )}
        </div>
      );
    }

    // 2. LOBBY (REFEITO PARA ESTILO CRT - Sem pasta de papel)
    if (fase === 'LOBBY') {
      return (
        <div>
          <TopBar />
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2
              style={{
                margin: '0',
                color: '#afffbf',
                fontSize: '32px',
                letterSpacing: '5px',
                textShadow: '0 0 10px #afffbf'
              }}
            >
              OPERAÇÃO: {sala}
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#9ae79f',
                margin: '10px 0 20px 0',
                letterSpacing: '2px'
              }}
            >
              // AGENTES CONECTADOS AO TERMINAL //
            </p>
            <button
              onClick={copiarLinkConvite}
              style={{
                ...styles.btnCRT,
                ...styles.btnCRTSecondary,
                width: 'auto',
                padding: '8px 15px',
                fontSize: '12px'
              }}
            >
              {linkCopiado
                ? 'LINK COPIADO! ✅'
                : '🔗 COPIAR CÓDIGO DE ACESSO'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center',
              marginBottom: '40px'
            }}
          >
            {jogadores.map((j) => (
              <div
                key={j.id}
                onContextMenu={(e) => handleContextMenuJogador(e, j)}
                style={styles.agentCardCRT}
              >
                <div style={styles.agentPhotoCRT}>
                  {j.foto ? (
                    <img
                      src={j.foto}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '30px',
                        lineHeight: '50px',
                        display: 'block',
                        textAlign: 'center',
                        color: '#afffbf'
                      }}
                    >
                      🕵️
                    </span>
                  )}
                </div>
                <strong
                  style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    marginTop: '5px'
                  }}
                >
                  {j.nome}
                </strong>
                <span style={{ fontSize: '10px', color: '#9ae79f' }}>
                  {j.pontos} PTS
                </span>
                {j.isHost && (
                  <span
                    style={{
                      color: '#ffb3b3',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      marginTop: '5px'
                    }}
                  >
                    DIRETOR
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            {souHost ? (
              <button
                onClick={iniciarJogo}
                style={{
                  ...styles.btnCRT,
                  background: 'rgba(19, 83, 36, 0.9)',
                  color: '#afffbf',
                  border: '2px solid #afffbf',
                  boxShadow: '0 0 15px rgba(0,255,150,0.4)',
                  fontSize: '16px',
                  padding: '15px 30px',
                  width: 'auto'
                }}
              >
                INICIAR OPERAÇÃO
              </button>
            ) : (
              <p
                style={{
                  color: '#afffbf',
                  animation: 'pulse 2s infinite',
                  fontSize: '14px',
                  letterSpacing: '1px'
                }}
              >
                AGUARDANDO O DIRETOR INICIAR O SISTEMA...
              </p>
            )}
          </div>
        </div>
      );
    }

    // 3. FASE PREPARAÇÃO (Mantém a pasta para contraste)
    if (fase === 'PREPARACAO') {
      const devoEsconder =
        (souHost && configRecebida?.streamerMode) ||
        modoStreamerLocal;
      return (
        <div>
          <TopBar />
          <Timer />
          {!jaEnvieiPreparacao ? (
            <>
              {devoEsconder ? (
                <div
                  style={{
                    border: '2px dashed #afffbf',
                    padding: '20px',
                    textAlign: 'center',
                    color: '#afffbf',
                    marginTop: '50px',
                  }}
                >
                  <h3>MODO STREAMER ATIVO</h3>
                  <p>Abra o painel secreto para ver sua palavra.</p>
                  <button
                    onClick={() => setJanelaExternaAberta(true)}
                    style={styles.btnCRT}
                  >
                    ABRIR PAINEL
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      background: '#000',
                      color: '#eab308',
                      padding: '10px',
                      textAlign: 'center',
                      border: '1px solid #eab308',
                      marginBottom: '20px',
                    }}
                  >
                    PALAVRA SECRETA:{' '}
                    <strong style={{ fontSize: '24px' }}>
                      {minhaPalavraInicial}
                    </strong>
                  </div>
                  <div style={styles.paper}>
                    <textarea
                      rows={6}
                      autoFocus
                      placeholder="Descreva a palavra..."
                      value={textoPreparacao}
                      onChange={(e) =>
                        setTextoPreparacao(e.target.value)
                      }
                      style={{
                        ...styles.inputPaper,
                        background: 'transparent',
                        border: 'none',
                        resize: 'none',
                        fontFamily: '"Courier Prime", monospace',
                      }}
                    />
                  </div>
                  <button
                    onClick={enviarTextoPreparacao}
                    style={styles.btnCRT}
                  >
                    ENVIAR RELATÓRIO
                  </button>
                </>
              )}
              {janelaExternaAberta && (
                <JanelaExterna
                  onClose={() => setJanelaExternaAberta(false)}
                >
                  <div
                    style={{
                      padding: '20px',
                      color: '#afffbf',
                      fontFamily: 'monospace',
                      textAlign: 'center',
                    }}
                  >
                    <h2>PALAVRA: {minhaPalavraInicial}</h2>
                    <textarea
                      value={textoPreparacao}
                      onChange={(e) =>
                        setTextoPreparacao(e.target.value)
                      }
                      style={{
                        width: '100%',
                        height: '200px',
                        background: '#111',
                        color: '#afffbf',
                        border: '1px solid #afffbf',
                      }}
                    />
                    <button
                      onClick={enviarTextoPreparacao}
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      ENVIAR
                    </button>
                  </div>
                </JanelaExterna>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                marginTop: '100px',
                color: '#afffbf',
              }}
            >
              <h2>RELATÓRIO ENVIADO</h2>
              <p>
                Aguardando outros agentes (
                {statusPreparacao.prontos}/{statusPreparacao.total}
                )...
              </p>
            </div>
          )}
        </div>
      );
    }

    // 4. FASE SABOTAGEM
    if (fase === 'SABOTAGEM') {
      return (
        <div>
          <TopBar />
          <Timer />
          <div
            style={{
              borderBottom: '1px solid #333',
              marginBottom: '10px',
              paddingBottom: '5px',
              fontSize: '12px',
              color: '#aaa',
            }}
          >
            ARQUIVO: {meuPapel} | RODADA {infoRodada.atual}/
            {infoRodada.total}
          </div>

          {meuPapel === 'DECIFRADOR' && (
            <div
              style={{
                textAlign: 'center',
                marginTop: '80px',
                color: '#ffb3b3',
              }}
            >
              <h1
                style={{
                  fontSize: '40px',
                  border: '4px solid #ffb3b3',
                  display: 'inline-block',
                  padding: '10px',
                }}
              >
                ACESSO NEGADO
              </h1>
              <p>Você é o Decifrador. Aguarde a interceptação.</p>
            </div>
          )}

          {meuPapel === 'CIFRADOR' && (
            <div style={styles.paper}>
              <div style={styles.folderTab}>ALERTA //</div>
              <h3 style={{ color: '#b91c1c', marginTop: 0 }}>
                SEU TEXTO ESTÁ SENDO ATACADO:
              </h3>
              <p style={{ fontSize: '18px' }}>
                "{descricaoRecebida}"
              </p>
            </div>
          )}

          {meuPapel === 'SABOTADOR' && (
            <>
              <div
                style={{
                  textAlign: 'center',
                  background: '#111',
                  padding: '10px',
                  border: '1px solid #eab308',
                  color: '#eab308',
                  marginBottom: '15px',
                }}
              >
                ALVO:{' '}
                <strong style={{ fontSize: '20px' }}>
                  {dadosRodada?.palavra}
                </strong>
              </div>
              {!sabotagemEnviada ? (
                <div style={styles.paper}>
                  <div style={styles.folderTab}>CENSURA //</div>
                  {inputsSabotagem.map((v, i) => (
                    <input
                      key={i}
                      placeholder={`PALAVRA PROIBIDA #${i + 1}`}
                      value={v}
                      onChange={(e) =>
                        atualizarInputSabotagem(i, e.target.value)
                      }
                      style={styles.inputPaper}
                    />
                  ))}
                  <button
                    onClick={enviarSabotagem}
                    style={{
                      ...styles.btnCRT,
                      background: '#b91c1c',
                      border: 'none',
                    }}
                  >
                    EXECUTAR CENSURA
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '50px',
                    color: '#afffbf',
                  }}
                >
                  <h2>CENSURA APLICADA</h2>
                  <p>Aguardando processamento...</p>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // 5. FASE DECIFRAR
    if (fase === 'DECIFRANDO') {
      return (
        <div>
          <TopBar />
          <Timer />
          <div
            style={{
              textAlign: 'center',
              marginBottom: '20px',
              color: '#afffbf',
            }}
          >
            <h2>DECODIFICAÇÃO</h2>
          </div>

          <div style={styles.paper}>
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                border: '2px solid black',
                padding: '2px 5px',
                fontSize: '10px',
                transform: 'rotate(-10deg)',
                opacity: 0.5,
              }}
            >
              CLASSIFIED
            </div>
            <p style={{ fontSize: '20px', lineHeight: '1.6' }}>
              {textoCensurado
                .split(/(\[CENSURADO\])/g)
                .map((parte, i) =>
                  parte === '[CENSURADO]' ? (
                    <span
                      key={i}
                      style={{
                        background: '#111',
                        color: 'transparent',
                        padding: '0 5px',
                      }}
                    >
                      ████
                    </span>
                  ) : (
                    <span key={i}>{parte}</span>
                  ),
                )}
            </p>
          </div>

          {meuPapel === 'SABOTADOR' && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                TENTATIVAS DA EQUIPE:
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '5px',
                  justifyContent: 'center',
                }}
              >
                {palavrasSabotadasRodada.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      background: '#eab308',
                      color: '#000',
                      padding: '2px 6px',
                      fontSize: '11px',
                      borderRadius: '2px',
                    }}
                  >
                    {((souHost && configRecebida?.streamerMode) ||
                      modoStreamerLocal)
                      ? '████'
                      : p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {meuPapel === 'DECIFRADOR' ? (
            <div style={{ marginTop: '20px' }}>
              <input
                placeholder="QUAL É A PALAVRA?"
                value={tentativaDecifrador}
                onChange={(e) => setTentativaDecifrador(e.target.value)}
                style={styles.inputCRT}
                autoFocus
              />
              <button
                onClick={enviarDecifracao}
                style={{
                  ...styles.btnCRT,
                  background: '#2563eb',
                  border: 'none',
                }}
              >
                ENVIAR RESPOSTA
              </button>
            </div>
          ) : (
            <p
              style={{
                textAlign: 'center',
                color: '#aaa',
                marginTop: '20px',
              }}
            >
              // AGUARDANDO ANÁLISE DO DECIFRADOR //
            </p>
          )}
        </div>
      );
    }

    // 6. RESULTADO
    if (fase === 'RESULTADO' && resultadoRodada) {
      return (
        <div style={{ textAlign: 'center' }}>
          <TopBar />
          <h1
            style={{
              color: resultadoRodada.acertou ? '#afffbf' : '#ffb3b3',
              textShadow: '0 0 10px currentColor',
            }}
          >
            {resultadoRodada.acertou
              ? 'SUCESSO NA DECIFRAÇÃO'
              : 'FALHA NA DECIFRAÇÃO'}
          </h1>

          <div style={styles.paper}>
            <div style={styles.folderTab}>RELATÓRIO //</div>
            <p>
              A PALAVRA ERA:{' '}
              <strong style={{ color: '#b91c1c', fontSize: '24px' }}>
                {resultadoRodada.palavraSecreta}
              </strong>
            </p>
            <p>
              O DECIFRADOR DISSE:{' '}
              <strong>{resultadoRodada.tentativa}</strong>
            </p>
            <hr style={{ borderColor: '#aaa' }} />
            <ul style={{ textAlign: 'left', fontSize: '14px' }}>
              {resultadoRodada.resumo.map((l, i) => (
                <li key={i} style={{ marginBottom: '5px' }}>
                  {l}
                </li>
              ))}
            </ul>
          </div>

          {souHost ? (
            <button onClick={proximaRodada} style={styles.btnCRT}>
              PRÓXIMA RODADA ➡️
            </button>
          ) : (
            <p style={{ color: '#afffbf' }}>AGUARDANDO O DIRETOR...</p>
          )}
        </div>
      );
    }

    // 7. FIM DE JOGO
    if (fase === 'FIM') {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '40px', color: '#afffbf' }}>
            MISSÃO CUMPRIDA
          </h1>
          <div
            style={{
              border: '2px solid #afffbf',
              padding: '20px',
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            {jogadores.map((j, i) => (
              <div
                key={j.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px dashed #afffbf',
                  padding: '5px 0',
                  color: '#afffbf',
                }}
              >
                <span>
                  #{i + 1} {j.nome}
                </span>
                <span>{j.pontos} PTS</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ ...styles.btnCRT, marginTop: '30px' }}
          >
            NOVA MISSÃO
          </button>
        </div>
      );
    }

    // ERRO
    return <div style={{ color: 'red' }}>ERRO DE FASE: {fase}</div>;
  };

  // --- RENDER PRINCIPAL ---
  return (
    <MonitorFrame>
      {renderContent()}
      <AvisoToast />
    </MonitorFrame>
  );
}

export default App;