import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png'; 

// 🟣 COLOQUE SEU CLIENT ID AQUI (Mantenha as aspas)
const TWITCH_CLIENT_ID = 'SEU_CLIENT_ID_AQUI_ENTRE_AS_ASPAS'; 

// URL DINÂMICA PARA DEPLOY
const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : '/');

// --- COMPONENTE MÁGICO: JANELA EXTERNA (POP-UP REAL) ---
const JanelaExterna = ({ children, onClose }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);

  useEffect(() => {
    const win = window.open('', '', 'width=600,height=500,left=200,top=200,menubar=no,toolbar=no,location=no,status=no');
    
    if (!win) {
        alert("O NAVEGADOR BLOQUEOU O POP-UP! Por favor, permita pop-ups para este site e tente novamente.");
        onClose();
        return;
    }

    externalWindow.current = win;
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.style.backgroundColor = '#1c1917';
    win.document.body.style.margin = '0';
    win.document.title = "DOSSIÊ SECRETO - NÃO MOSTRAR NA LIVE";

    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);

    win.onbeforeunload = () => {
      onClose();
    };

    return () => {
      win.close();
    };
  }, []); 

  return container ? createPortal(children, container) : null;
};

function App() {
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
  
  // Nomes dos papéis da rodada
  const [protagonistas, setProtagonistas] = useState(null);

  // Controle de tempo relativo (anti-lag)
  const [alvoLocal, setAlvoLocal] = useState(0);

  // MODO STREAMER LOCAL (PARA CONVIDADOS)
  const [modoStreamerLocal, setModoStreamerLocal] = useState(false);

  // CONFIGURAÇÕES
  const [configSala, setConfigSala] = useState({
      twitchAuth: false,
      streamerMode: false,
      numCiclos: 1, 
      tempos: { preparacao: 120, sabotagem: 30, decifracao: 45 }
  });
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
      audioSuccess.current.volume = 0.5;
      audioError.current.volume = 0.5;
  }, []);

  const adicionarLog = (dados) => {
      const id = Date.now();
      setLogsSistema(prev => [...prev, { ...dados, id }]);
      setTimeout(() => {
          setLogsSistema(prev => prev.filter(log => log.id !== id));
      }, 4000);
  };

  // 🟣 LÓGICA DE LOGIN DA TWITCH (Com Avatar!)
  const verificarLoginTwitch = async () => {
      const hash = window.location.hash;
      if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          
          window.history.replaceState({}, document.title, "/");

          if (accessToken) {
              try {
                  const response = await fetch('https://api.twitch.tv/helix/users', {
                      headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'Client-Id': TWITCH_CLIENT_ID
                      }
                  });
                  const data = await response.json();
                  
                  if (data.data && data.data.length > 0) {
                      const userTwitch = data.data[0];
                      console.log("🟣 Logado como:", userTwitch.display_name);
                      
                      const savedConfig = localStorage.getItem('temp_create_room_config');
                      if (savedConfig) {
                          const configParsed = JSON.parse(savedConfig);
                          localStorage.removeItem('temp_create_room_config');
                          
                          setNome(userTwitch.display_name);
                          // 🔥 ENVIA A FOTO JUNTO
                          socket.emit('criar_sala', { 
                              nomeJogador: userTwitch.display_name, 
                              senha: "", 
                              config: configParsed,
                              twitchData: { 
                                  id: userTwitch.id, 
                                  login: userTwitch.login, 
                                  token: accessToken,
                                  foto: userTwitch.profile_image_url 
                              }
                          });
                      }
                  }
              } catch (error) {
                  console.error("Erro ao validar Twitch:", error);
                  setErroLogin("Falha na autenticação com a Twitch.");
              }
          }
      }
  };

  useEffect(() => {
    verificarLoginTwitch();

    const saved = localStorage.getItem('censorizador_session');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessaoSalva(parsed);
      if (parsed.roomId) {
          socket.emit('verificar_sala', parsed.roomId);
      }
    }

    socket.on('sala_criada_sucesso', (dados) => { 
      const sessionData = { roomId: dados.roomId, token: dados.userToken, nome: dados.jogadores[0].nome, senha: senha }; 
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData)); 
      setSala(dados.roomId); setJogadores(dados.jogadores); setConfigRecebida(dados.config); 
      setEntrou(true); setErroLogin(""); 
      setNome(dados.jogadores[0].nome);
    });
    
    socket.on('entrada_sucesso', (dados) => { 
      const tokenSalvo = localStorage.getItem('censorizador_session') ? JSON.parse(localStorage.getItem('censorizador_session')).token : null; 
      const sessionData = { roomId: dados.roomId, token: tokenSalvo, nome: nome, senha: senha }; 
      localStorage.setItem('censorizador_session', JSON.stringify(sessionData)); 
      setSala(dados.roomId); setJogadores(dados.jogadores); setFase(dados.fase); setConfigRecebida(dados.config);
      setEntrou(true); setErroLogin(""); 
    });

    socket.on('sessao_invalida', () => {
        localStorage.removeItem('censorizador_session');
        setSessaoSalva(null); 
    });

    socket.on('banido_da_sala', (msg) => {
        localStorage.removeItem('censorizador_session');
        alert("⛔ " + msg);
        window.location.reload();
    });

    socket.on('log_evento', (dados) => {
        adicionarLog(dados);
    });
    
    socket.on('erro_login', (msg) => { setErroLogin(msg); });
    socket.on('atualizar_sala', (lista) => { setJogadores(lista); const eu = lista.find(j => j.id === socket.id); if (eu) setSouHost(eu.isHost); });
    
    socket.on('sala_encerrada', (motivo) => { 
        localStorage.removeItem('censorizador_session'); 
        alert(motivo); 
        window.location.reload(); 
    });
    
    socket.on('aviso_sala', (dados) => { setAviso(dados); if (dados.tipo === 'sucesso') setTimeout(() => setAviso(null), 5000); });
    
    socket.on('inicio_preparacao', (dados) => { 
        setFase('PREPARACAO'); 
        setMinhaPalavraInicial(dados.palavra); 
        setJaEnvieiPreparacao(false); 
        setTextoPreparacao(""); 
        setResultadoRodada(null); 
        setJanelaExternaAberta(false); 
        setInputsSabotagem(Array(10).fill(""));
    });
    
    socket.on('status_preparacao', (dados) => { setStatusPreparacao(dados); });
    
    socket.on('nova_rodada', (dados) => { 
        setFase('SABOTAGEM'); 
        setMeuPapel(dados.meuPapel); 
        setInfoRodada({ atual: dados.rodadaAtual, total: dados.totalRodadas }); 
        setInputsSabotagem(Array(10).fill(""));
        setSabotagemEnviada(false); 
        setTentativaDecifrador(""); 
        setDescricaoRecebida(dados.descricao || ""); 
        setResultadoRodada(null); 
        setJanelaExternaAberta(false); 
        setPalavrasSabotadasRodada([]); 
        
        if(dados.protagonistas) setProtagonistas(dados.protagonistas);
        if (dados.palavraRevelada) setDadosRodada({ palavra: dados.palavraRevelada }); 
    });
    
    socket.on('fase_decifrar', (dados) => { 
        setFase('DECIFRANDO'); 
        setTextoCensurado(dados.textoCensurado); 
        setPalavrasSabotadasRodada(dados.palavrasEfetivas || []); 
        if (dados.segundosRestantes) {
            const agora = Date.now();
            setAlvoLocal(agora + (dados.segundosRestantes * 1000));
        }
    });

    socket.on('sincronizar_tempo', ({ segundosRestantes }) => { 
        const agora = Date.now();
        setAlvoLocal(agora + (segundosRestantes * 1000));
    });
    
    socket.on('resultado_rodada', (dados) => { 
        setFase('RESULTADO'); 
        setResultadoRodada(dados); 
        setJogadores(dados.ranking); 
        setAlvoLocal(0);

        if (dados.acertou) {
            audioSuccess.current?.play().catch(e => console.log("Áudio bloqueado", e));
        } else {
            audioError.current?.play().catch(e => console.log("Áudio bloqueado", e));
        }
    });
    
    socket.on('fim_de_jogo', () => { setFase('FIM'); });

    const handleClickFora = () => {
        if(menuBan.visivel) setMenuBan({...menuBan, visivel: false});
    };
    window.addEventListener('click', handleClickFora);

    return () => { 
      socket.off('sala_criada_sucesso'); socket.off('entrada_sucesso'); socket.off('erro_login'); socket.off('atualizar_sala'); 
      socket.off('sala_encerrada'); socket.off('aviso_sala'); socket.off('inicio_preparacao'); socket.off('nova_rodada'); 
      socket.off('fase_decifrar'); socket.off('sincronizar_tempo'); socket.off('resultado_rodada'); socket.off('fim_de_jogo'); 
      socket.off('sessao_invalida'); socket.off('banido_da_sala'); socket.off('log_evento');
      window.removeEventListener('click', handleClickFora);
    };
  }, [nome, senha, menuBan]);

  // LOOP DE TEMPO CORRIGIDO
  useEffect(() => {
      if (alvoLocal === 0) return;

      const interval = setInterval(() => {
          const agora = Date.now();
          const delta = Math.ceil((alvoLocal - agora) / 1000);
          setTempoRestante(delta > 0 ? delta : 0);
          
          if (delta <= 0) setAlvoLocal(0);
      }, 200);

      return () => clearInterval(interval);
  }, [alvoLocal]);

  // AUTO-ENVIO
  useEffect(() => {
      if (fase === 'PREPARACAO' && tempoRestante === 1 && !jaEnvieiPreparacao) {
          if (textoPreparacao.length > 0) {
              enviarTextoPreparacao();
          } else {
              socket.emit('enviar_preparacao', { nomeSala: sala, texto: "O agente não conseguiu escrever a tempo." }); 
              setJaEnvieiPreparacao(true);
              setJanelaExternaAberta(false);
          }
      }
  }, [tempoRestante, fase, jaEnvieiPreparacao, textoPreparacao]);

  const acaoReconectar = () => { if (sessaoSalva) { setNome(sessaoSalva.nome); setSala(sessaoSalva.roomId); setSenha(sessaoSalva.senha); socket.emit('entrar_sala', { nomeJogador: sessaoSalva.nome, roomId: sessaoSalva.roomId, senha: sessaoSalva.senha, token: sessaoSalva.token }); } };
  
  const acaoCriarSala = () => { 
      if (configSala.twitchAuth) {
          if (TWITCH_CLIENT_ID === 'SEU_CLIENT_ID_AQUI_ENTRE_AS_ASPAS') {
              alert("ERRO DE CONFIG: Você precisa colocar o Client ID da Twitch no código!");
              return;
          }
          localStorage.setItem('temp_create_room_config', JSON.stringify(configSala));
          
          const redirectUri = window.location.origin;
          const scope = "user:read:email";
          const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
          
          window.location.href = authUrl;
      } else {
          if (nome && (senha && senha.length > 0)) { 
              socket.emit('criar_sala', { nomeJogador: nome, senha: senha, config: configSala }); 
          } else { 
              setErroLogin("Preencha nome e senha!"); 
          } 
      }
  };
  
  const acaoEntrarSala = () => { 
      if (nome && sala && senha) { 
          const token = sessaoSalva?.token; 
          socket.emit('entrar_sala', { nomeJogador: nome, roomId: sala, senha: senha, token }); 
      } else { setErroLogin("Preencha todos os campos!"); } 
  };

  const iniciarJogo = () => { socket.emit('iniciar_jogo', sala); };
  const proximaRodada = () => { socket.emit('proxima_rodada', sala); };
  const enviarTextoPreparacao = () => { 
      socket.emit('enviar_preparacao', { nomeSala: sala, texto: textoPreparacao }); 
      setJaEnvieiPreparacao(true); 
      setJanelaExternaAberta(false); 
  };
  const enviarSabotagem = () => { const palavrasValidas = inputsSabotagem.filter(p => p.trim() !== ""); socket.emit('sabotador_envia', { nomeSala: sala, previsoes: palavrasValidas }); setSabotagemEnviada(true); };
  const atualizarInputSabotagem = (index, valor) => { const novosInputs = [...inputsSabotagem]; novosInputs[index] = valor; setInputsSabotagem(novosInputs); };
  const enviarDecifracao = () => { socket.emit('decifrador_chuta', { nomeSala: sala, tentativa: tentativaDecifrador }); };

  const sairDaSala = () => {
    if (confirm("Tem certeza que deseja abandonar a missão?")) {
        localStorage.removeItem('censorizador_session');
        socket.disconnect();
        window.location.reload();
    }
  };

  const handleContextMenuJogador = (e, jogador) => {
      if(!souHost) return;
      if(jogador.id === socket.id) return; 

      e.preventDefault(); 
      setMenuBan({
          visivel: true,
          x: e.clientX,
          y: e.clientY,
          jogadorId: jogador.id,
          jogadorNome: jogador.nome
      });
  };

  const confirmarBan = () => {
      if(menuBan.jogadorId) {
          socket.emit('banir_jogador', { roomId: sala, targetId: menuBan.jogadorId });
      }
      setMenuBan({ ...menuBan, visivel: false });
  };

  // --- ESTILOS & COMPONENTES ---
  const mainWrapper = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', fontFamily: "'Courier New', Courier, monospace", color: '#e5e5e5', boxSizing: 'border-box', padding: '20px' };
  const inputStyle = { padding: '15px', margin: '10px 0', fontSize: '18px', color: '#1a1a1a', backgroundColor: '#f8f8f8', border: '2px solid #333', width: '100%', fontFamily: "'Courier New', Courier, monospace", fontWeight: 'bold', boxSizing: 'border-box' };
  const btnStyle = { padding: '20px', background: '#333', color: 'white', border: 'none', marginTop: '10px', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', width: '100%', textTransform: 'uppercase' };
  const paperStyle = { backgroundColor: '#f4e4bc', backgroundImage: 'linear-gradient(#e8dcb5 1px, transparent 1px)', backgroundSize: '100% 1.5em', color: '#1a1a1a', padding: '40px', boxShadow: '5px 5px 15px rgba(0,0,0,0.5)', maxWidth: '800px', width: '100%', margin: '30px auto', border: '1px solid #cfb997', fontSize: '22px', lineHeight: '1.5em', textAlign: 'left', position: 'relative', transform: 'rotate(-1deg)' };
  
  const agentCardStyle = { 
      backgroundColor: '#fff', color: '#333', padding: '20px 15px', width: '180px', height: '240px', 
      boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', 
      position: 'relative', fontFamily: "'Courier New', Courier, monospace", transition: 'transform 0.2s', border: '1px solid #ccc' 
  };

  const stickyNoteStyle = { backgroundColor: '#fef3c7', color: '#333', padding: '15px 30px', display: 'inline-block', transform: 'rotate(2deg)', boxShadow: '3px 3px 8px rgba(0,0,0,0.4)', marginTop: '20px', fontFamily: "'Courier New', Courier, monospace'", textAlign: 'center', border: '1px solid #eab308' };
  const stampStyle = { border: '3px solid', padding: '5px 10px', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '14px', transform: 'rotate(-10deg)', opacity: 0.9, marginTop: 'auto', letterSpacing: '1px', textAlign: 'center', fontFamily: 'sans-serif' };
  const rulesBtnStyle = { position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#d97706', color: '#fff', fontSize: '30px', fontWeight: 'bold', border: '3px solid #fff', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  
  const streamerBtnStyle = { position: 'fixed', top: '20px', right: '20px', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: modoStreamerLocal ? '#10b981' : '#333', color: '#fff', fontSize: '24px', border: '2px solid #fff', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const exitBtnStyle = { position: 'fixed', top: '20px', left: '20px', backgroundColor: 'transparent', color: '#ef4444', border: '2px solid #ef4444', padding: '10px 15px', fontWeight: 'bold', cursor: 'pointer', zIndex: 2000, fontFamily: 'monospace', textTransform: 'uppercase' };
  const rulesBoxStyle = { position: 'fixed', bottom: '90px', right: '20px', width: '300px', backgroundColor: '#f4e4bc', color: '#1c1917', padding: '20px', border: '4px solid #1c1917', borderRadius: '4px', boxShadow: '-5px 5px 15px rgba(0,0,0,0.7)', zIndex: 1999, fontFamily: "'Courier New', Courier, monospace", transform: exibirRegras ? 'scale(1)' : 'scale(0)', transformOrigin: 'bottom right', transition: 'transform 0.2s ease-out' };
  const menuBanStyle = { position: 'fixed', top: menuBan.y, left: menuBan.x, backgroundColor: '#1c1917', color: '#ef4444', border: '2px solid #ef4444', padding: '10px 20px', zIndex: 99999, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '14px' };
  
  const TimerDisplay = () => (<div style={{ position: 'fixed', top: 20, right: 20, background: tempoRestante < 10 ? '#b91c1c' : '#333', color: 'white', padding: '10px 20px', borderRadius: '50px', fontSize: '24px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid white' }}>⏱️ {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}</div>);
  const HeaderDebug = () => ( fase !== 'LOBBY' && fase !== 'PREPARACAO' && fase !== 'FIM' && <div style={{ width: '100%', background: '#1c1917', color: '#f4e4bc', padding: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #d97706', borderTop: '2px solid #d97706', boxSizing: 'border-box' }}><span>ARQUIVO: <strong>{meuPapel}</strong></span><span>RODADA: {infoRodada.atual}/{infoRodada.total}</span></div> );
  const AvisoToast = () => { if (!aviso) return null; const bg = aviso.tipo === 'perigo' ? '#b91c1c' : '#15803d'; return (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: bg, color: 'white', padding: '15px', textAlign: 'center', zIndex: 9999, fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', animation: aviso.tipo === 'perigo' ? 'pulse 1s infinite' : 'none' }}>{aviso.msg}</div>); };

  const RulesWidget = () => (
    <>
      <button onClick={() => setExibirRegras(!exibirRegras)} style={rulesBtnStyle} title="Protocolos da Missão">?</button>
      <div style={rulesBoxStyle}>
        <div style={{ borderBottom: '2px dashed #1c1917', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase' }}>📂 Protocolos</h3>
        </div>
        <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.4em' }}>
            <li style={{ marginBottom: '8px' }}><strong>1. O SEGREDO:</strong> Cada um recebe uma palavra secreta.</li>
            <li style={{ marginBottom: '8px' }}><strong>2. 🕵️ CIFRADOR:</strong> Escreve um texto para descrever sua palavra (sem usar a palavra!).</li>
            <li style={{ marginBottom: '8px' }}><strong>3. ✂️ SABOTADOR:</strong> Censura palavras do texto para atrapalhar.</li>
            <li style={{ marginBottom: '8px' }}><strong>4. 🧩 DECIFRADOR:</strong> Tenta adivinhar qual era a palavra original.</li>
        </ul>
        <div style={{ marginTop: '10px', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', color: '#b91c1c' }}>
            "Confie em ninguém."
        </div>
      </div>
    </>
  );

  const SidebarJogadores = () => (
      <div style={{ position: 'fixed', top: '50%', left: '20px', transform: 'translateY(-50%)', width: '80px', background: '#1c1917', border: '2px solid #333', padding: '10px 5px', borderRadius: '10px', zIndex: 500, boxShadow: '0 0 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #333', width: '100%', paddingBottom: '5px' }}>AGENTS</div>
          {jogadores.map(j => (
              <div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost && j.id !== socket.id ? "Botão Direito para BANIR" : j.nome} style={{ width: '50px', height: '50px', background: j.id === socket.id ? '#d97706' : '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: j.isHost ? '3px solid #b91c1c' : '2px solid #333', fontSize: '24px', cursor: souHost ? 'context-menu' : 'default', position: 'relative', overflow: 'hidden' }}>
                  {j.foto ? <img src={j.foto} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span>🕵️‍♂️</span>}
                  <span style={{ position: 'absolute', bottom: '-15px', fontSize: '10px', color: '#fff', background: '#000', padding: '0 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{j.nome.substring(0,6)}</span>
              </div>
          ))}
      </div>
  );

  const SystemLogs = () => (
      <div style={{ position: 'fixed', bottom: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999, pointerEvents: 'none' }}>
          {logsSistema.map(log => (
              <div key={log.id} style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderLeft: `4px solid ${log.tipo === 'ban' ? '#ef4444' : (log.tipo === 'entrada' ? '#22c55e' : '#eab308')}`, color: '#fff', padding: '10px 15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px', boxShadow: '2px 2px 5px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease-out' }}>{log.msg}</div>
          ))}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      </div>
  );

  const RoleDisplay = () => {
    if (!protagonistas) return null;
    return (
      <div style={{ background: '#000', color: '#fff', padding: '10px', borderBottom: '2px solid #d97706', display: 'flex', justifyContent: 'space-around', fontSize: '0.9rem', textTransform: 'uppercase', flexWrap: 'wrap', gap: '10px', width: '100%', boxSizing: 'border-box', marginTop: '60px' }}>
          <div style={{ color: '#4ade80' }}>🕵️ CIFRADOR: <strong>{protagonistas.cifrador}</strong></div>
          <div style={{ color: '#ef4444' }}>✂️ SABOTADORES: <strong>{protagonistas.sabotadores.join(", ")}</strong></div>
          <div style={{ color: '#3b82f6' }}>🧩 DECIFRADOR: <strong>{protagonistas.decifrador}</strong></div>
      </div>
    );
  };

  // --- RENDERIZAÇÃO ---
  const commonRender = (content) => (
      <>
        <AvisoToast />
        <SystemLogs />
        {entrou && (<button onClick={sairDaSala} style={exitBtnStyle}>ABANDONAR</button>)}
        {entrou && (<button onClick={() => setModoStreamerLocal(!modoStreamerLocal)} style={streamerBtnStyle} title="Modo Streamer (Ocultar Segredos)">{modoStreamerLocal ? '🙈' : '👁️'}</button>)}
        
        {menuBan.visivel && (<div style={menuBanStyle} onClick={confirmarBan}>🔨 BANIR AGENTE <br/> <span style={{color: 'white'}}>{menuBan.jogadorNome}</span></div>)}
        {entrou && fase !== 'LOBBY' && fase !== 'FIM' && <SidebarJogadores />}
        {content}
      </>
  );

  if (!entrou) {
    return (
      <div style={mainWrapper}>
        <img src={logoImage} alt="Confidencial Logo" style={{ width: '100%', maxWidth: '500px', border: '4px solid #333', boxSizing: 'border-box', boxShadow: '10px 10px 0 rgba(0,0,0,0.5)', marginBottom: '20px' }} />
        <div style={{ border: '4px solid #333', padding: '40px', background: '#f4e4bc', color: '#333', width: '100%', maxWidth: '500px', boxSizing: 'border-box', boxShadow: '10px 10px 0 rgba(0,0,0,0.5)', position: 'relative' }}>
          {sessaoSalva && modoLogin === 'MENU' && (<div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #333' }}><p style={{ fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>// SESSÃO ANTERIOR DETECTADA //</p><button onClick={acaoReconectar} style={{ ...btnStyle, background: '#d97706', border: '2px dashed #000', color: 'black' }}>VOLTAR PARA {sessaoSalva.roomId}</button></div>)}
          {modoLogin === 'MENU' && (<div style={{ marginTop: '20px' }}><button onClick={() => setModoLogin('CRIAR')} style={btnStyle}>INICIAR NOVA OPERAÇÃO</button><button onClick={() => setModoLogin('ENTRAR')} style={{...btnStyle, background: '#57534e'}}>ACESSAR OPERAÇÃO EXISTENTE</button></div>)}
          
          {modoLogin === 'CRIAR' && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{textAlign: 'center'}}>// CONFIGURAÇÃO DA MISSÃO //</h3>
              <input placeholder="CODINOME (Seu Nome)" onChange={e => setNome(e.target.value)} style={inputStyle} disabled={configSala.twitchAuth} value={configSala.twitchAuth ? "(Login via Twitch)" : nome} />
              
              <input placeholder={configSala.twitchAuth ? "🔒 AUTENTICAÇÃO TWITCH ATIVA" : "DEFINIR SENHA DE ACESSO"} type="text" disabled={configSala.twitchAuth} onChange={e => setSenha(e.target.value)} value={configSala.twitchAuth ? "" : senha} style={{ ...inputStyle, opacity: configSala.twitchAuth ? 0.6 : 1, cursor: configSala.twitchAuth ? 'not-allowed' : 'text' }} />
              
              <div style={{ background: '#e8dcb5', padding: '15px', border: '2px solid #333', margin: '10px 0', textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #333' }}>⚙️ AJUSTES DO SISTEMA</h4>
                  <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>
                      <input type="checkbox" checked={configSala.twitchAuth} onChange={e => setConfigSala({...configSala, twitchAuth: e.target.checked})} style={{ marginRight: '10px' }} />
                      <span style={{ color: '#9146FF' }}>👾 Exigir Autenticação Twitch (Host Login)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}><input type="checkbox" checked={configSala.streamerMode} onChange={e => setConfigSala({...configSala, streamerMode: e.target.checked})} style={{ marginRight: '10px' }} />Modo Streamer (Janela Segura)</label>
                  <div style={{ margin: '10px 0' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>CICLOS DE RODADAS (Voltas na mesa):</label><div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}><input type="range" min="1" max="5" value={configSala.numCiclos} onChange={e => setConfigSala({...configSala, numCiclos: parseInt(e.target.value)})} style={{ flex: 1, cursor: 'pointer' }} /><span style={{ fontWeight: 'bold', fontSize: '18px', width: '30px' }}>{configSala.numCiclos}</span></div></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>PREPARAÇÃO (s):</label><input type="number" value={configSala.tempos.preparacao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, preparacao: e.target.value}})} style={{ ...inputStyle, padding: '5px' }} /></div>
                      <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>SABOTAGEM (s):</label><input type="number" value={configSala.tempos.sabotagem} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, sabotagem: e.target.value}})} style={{ ...inputStyle, padding: '5px' }} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>DECIFRAÇÃO (s):</label><input type="number" value={configSala.tempos.decifracao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, decifracao: e.target.value}})} style={{ ...inputStyle, padding: '5px' }} /></div>
                  </div>
              </div>
              {erroLogin && <p style={{color: '#b91c1c', fontWeight: 'bold', textAlign: 'center'}}>{erroLogin}</p>}
              <button onClick={acaoCriarSala} style={{ ...btnStyle, background: configSala.twitchAuth ? '#9146FF' : '#b91c1c' }}>
                  {configSala.twitchAuth ? "LOGAR COM TWITCH & CRIAR" : "CRIAR SALA"}
              </button>
              <button onClick={() => {setModoLogin('MENU'); setErroLogin('');}} style={{ ...btnStyle, background: 'transparent', color: '#333', border: '2px solid #333' }}>CANCELAR</button>
            </div>
          )}
          {modoLogin === 'ENTRAR' && (<div style={{ marginTop: '20px' }}><h3 style={{textAlign: 'center'}}>// LOGIN DE AGENTE //</h3><input placeholder="CODINOME" onChange={e => setNome(e.target.value)} style={inputStyle} /><input placeholder="CÓDIGO DA OPERAÇÃO (ID)" onChange={e => setSala(e.target.value)} style={inputStyle} /><input placeholder="SENHA DE ACESSO" type="text" onChange={e => setSenha(e.target.value)} style={inputStyle} />{erroLogin && <p style={{color: '#b91c1c', fontWeight: 'bold', textAlign: 'center'}}>{erroLogin}</p>}<button onClick={acaoEntrarSala} style={{ ...btnStyle, background: '#15803d' }}>ACESSAR</button><button onClick={() => {setModoLogin('MENU'); setErroLogin('');}} style={{ ...btnStyle, background: 'transparent', color: '#333', border: '2px solid #333' }}>CANCELAR</button></div>)}
        </div>
      </div>
    );
  }

  if (fase === 'LOBBY') {
    return commonRender(
      <div style={mainWrapper}>
        <RulesWidget />
        <div style={{ borderBottom: '4px solid #d97706', paddingBottom: '20px', marginBottom: '30px', textAlign: 'center', width: '100%' }}>
          <img src={logoImage} alt="Confidencial Logo" style={{ width: '100%', maxWidth: '400px', border: '3px solid #d97706', boxSizing: 'border-box', boxShadow: '5px 5px 0 rgba(0,0,0,0.3)', marginBottom: '20px' }} />
          <p style={{ letterSpacing: '3px', marginTop: '10px', fontSize: '1rem', color: '#d97706', fontWeight: 'bold' }}>// AGENTES ATIVOS NA REDE //</p>
          <div style={stickyNoteStyle}><span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>CÓDIGO DA MISSÃO:</span><strong style={{ fontSize: '2.5rem', letterSpacing: '3px' }}>{sala}</strong></div>
          {configRecebida && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
                  {configRecebida.twitchAuth && <span title="Autenticação Twitch Obrigatória" style={{ fontSize: '24px', cursor: 'help' }}>👾</span>}
                  {configRecebida.streamerMode && <span title="Modo Streamer Ativo" style={{ fontSize: '24px', cursor: 'help' }}>🎥</span>}
                  <span title={`Ciclos de Rodadas: ${configRecebida.numCiclos}`} style={{ fontSize: '24px', cursor: 'help' }}>🔄 {configRecebida.numCiclos}</span>
              </div>
          )}
        </div>
        <div style={{ width: '90%', height: '4px', background: '#d97706', margin: '10px 0 40px 0', borderRadius: '2px' }}></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>{jogadores.map((j, i) => (
            <div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost && j.id !== socket.id ? "Botão Direito para BANIR" : ""} style={{ ...agentCardStyle, transform: `rotate(${i % 2 === 0 ? '2deg' : '-2deg'})`, cursor: souHost ? 'context-menu' : 'default' }}>
                <div style={{ width: '70px', height: '70px', background: '#e2e8f0', borderRadius: '50%', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #333', overflow: 'hidden' }}>
                    {j.foto ? <img src={j.foto} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span style={{fontSize: '35px'}}>🕵️‍♂️</span>}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #333', width: '100%', textAlign: 'center', paddingBottom: '5px', marginBottom: '5px' }}>{j.nome}</div>
                <div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'sans-serif' }}>SCORE: {j.pontos}</div>
                <div style={{ marginTop: 'auto', marginBottom: '10px' }}>{j.isHost ? (<div style={{ ...stampStyle, borderColor: '#b91c1c', color: '#b91c1c' }}>MISSION DIRECTOR</div>) : (<div style={{ ...stampStyle, borderColor: '#15803d', color: '#15803d', transform: 'rotate(-5deg)' }}>FIELD AGENT</div>)}</div>
            </div>
        ))}</div>
        <div style={{ marginTop: 'auto', marginBottom: '40px', width: '100%', textAlign: 'center' }}>{souHost ? (<div style={{ display: 'inline-block' }}>{jogadores.length >= 3 ? (<button onClick={iniciarJogo} style={{ padding: '25px 60px', fontSize: '24px', background: 'transparent', color: '#f4e4bc', border: '4px solid #f4e4bc', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', boxShadow: '0 0 15px rgba(244, 228, 188, 0.3)' }}>⚠ EXECUTAR PROTOCOLO ⚠</button>) : (<div style={{ color: '#fbbf24', border: '2px dashed #fbbf24', padding: '20px 40px', display: 'inline-block', fontSize: '1.2rem', letterSpacing: '1px' }}>// AGUARDANDO EQUIPE COMPLETA (MÍN. 3) //</div>)}</div>) : (<div style={{ color: '#fbbf24', border: '2px dashed #fbbf24', padding: '15px 30px', display: 'inline-block', fontSize: '1.2rem', letterSpacing: '1px' }}>// AGUARDANDO COMANDANTE INICIAR //</div>)}</div>
      </div>
    );
  }

  if (fase === 'PREPARACAO') {
      const devoEsconder = (souHost && configRecebida?.streamerMode) || modoStreamerLocal;
      return commonRender(
        <div style={mainWrapper}>
            <TimerDisplay/>
            {janelaExternaAberta && (
                <JanelaExterna onClose={() => setJanelaExternaAberta(false)}>
                    <div style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e5e5e5', fontFamily: "'Courier New', Courier, monospace" }}>
                        <h2 style={{ color: '#4ade80', textTransform: 'uppercase', borderBottom: '2px solid #4ade80' }}>📂 DOSSIÊ SECRETO</h2>
                        <div style={{ background: '#000', padding: '20px', border: '1px solid #4ade80', margin: '20px 0', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}>
                            SUA PALAVRA SECRETA: 
                            <span style={{ color: '#4ade80', fontSize: '40px', display: 'block', wordBreak: 'break-all' }}>{minhaPalavraInicial}</span>
                        </div>
                        <textarea 
                            rows="8" autoFocus
                            style={{ width: '100%', background: '#111', color: '#4ade80', border: '2px solid #4ade80', padding: '10px', fontSize: '18px', fontFamily: 'monospace', resize: 'none' }} 
                            placeholder="Digite aqui sua descrição..." 
                            value={textoPreparacao}
                            onChange={(e) => setTextoPreparacao(e.target.value)}
                        />
                        <button onClick={enviarTextoPreparacao} disabled={textoPreparacao.length === 0} style={{ width: '100%', marginTop: '20px', padding: '20px', background: '#4ade80', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', opacity: textoPreparacao.length > 0 ? 1 : 0.5 }}>
                            ENVIAR ARQUIVO
                        </button>
                    </div>
                </JanelaExterna>
            )}

            <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
                <h3 style={{ color: '#4ade80' }}>// FASE 0: PREPARAÇÃO DE DOCUMENTOS</h3>
                
                {!jaEnvieiPreparacao ? (
                    <>
                    {devoEsconder ? (
                        <div style={{ border: '4px dashed #4ade80', padding: '50px', background: '#1c1917', color: '#4ade80', margin: '40px 0' }}>
                            <div style={{ fontSize: '50px' }}>🎥🔒</div>
                            <h2>MODO STREAMER ATIVO</h2>
                            <p>Os dados sensíveis estão ocultos nesta tela.</p>
                            {!janelaExternaAberta ? (
                                <button onClick={() => setJanelaExternaAberta(true)} style={{ padding: '20px 40px', fontSize: '18px', background: '#4ade80', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '20px', boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)' }}>
                                    ABRIR PAINEL SEGRETO (POP-UP) ↗
                                </button>
                            ) : (
                                <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #4ade80', color: '#fff' }}><p>O PAINEL SEGRETO ESTÁ ABERTO EM OUTRA JANELA.</p></div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div style={{ background: '#000', padding: '20px', border: '1px solid #4ade80', margin: '20px 0', fontFamily: 'monospace' }}>
                                SUA PALAVRA SECRETA: <span style={{ color: '#4ade80', fontSize: '40px', display: 'block' }}>{minhaPalavraInicial}</span>
                            </div>
                            <div style={paperStyle}>
                                <textarea rows="8" style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', outline: 'none', fontSize: '22px', fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.5em', color: '#000000', fontWeight: 'bold' }} placeholder="Descreva a palavra sem dizê-la..." value={textoPreparacao} onChange={(e) => setTextoPreparacao(e.target.value)} />
                            </div>
                            <button onClick={enviarTextoPreparacao} style={{ padding: '15px 40px', background: '#4ade80', color: 'black', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>ARQUIVAR DOCUMENTO</button>
                        </>
                    )}
                    </>
                ) : (
                    <div style={{ marginTop: '50px' }}><h2>// DOCUMENTO ARQUIVADO //</h2><div style={{ fontSize: '60px', margin: '20px' }}>📁</div><p>Aguardando outros agentes... ({statusPreparacao.prontos}/{statusPreparacao.total})</p></div>
                )}
            </div>
        </div>
      );
  }

  if (fase === 'SABOTAGEM') return commonRender(
    <div style={{ ...mainWrapper, background: '#44403c' }}>
        <TimerDisplay/>
        <RoleDisplay />
        <div style={{ padding: '20px', width: '100%' }}><HeaderDebug /></div>
        <div style={{ textAlign: 'center' }}><h2>INTERCEPTAÇÃO DE DOCUMENTO</h2></div>
        {meuPapel === 'DECIFRADOR' && (<div style={{ marginTop: '50px', textAlign: 'center' }}><h1 style={{ color: '#fca5a5', fontSize: '3rem' }}>ACESSO NEGADO</h1><div style={{ fontSize: '100px', margin: '20px' }}>🚫</div><p>Você é o Decifrador desta rodada.</p></div>)}
        {meuPapel === 'CIFRADOR' && (<div style={{...paperStyle, transform: 'none', margin: '20px auto', maxWidth: '600px'}}><strong>SEU DOCUMENTO ESTÁ SENDO ATACADO:</strong><br/><br/>"{descricaoRecebida}"</div>)}
        {meuPapel === 'SABOTADOR' && (<div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', textAlign: 'center' }}><div style={{ background: '#1c1917', padding: '20px', border: '2px dashed #d97706', marginBottom: '30px' }}><p style={{ color: '#d97706', margin: 0 }}>PALAVRA-CHAVE:</p><h1 style={{ fontSize: '50px', color: '#fff', margin: '10px 0' }}>{dadosRodada?.palavra}</h1></div>{!sabotagemEnviada ? (<div style={{ background: '#292524', padding: '30px', borderRadius: '10px' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>{inputsSabotagem.map((valor, index) => (<input key={index} placeholder={`CENSURA #${index + 1}`} value={valor} onChange={(e) => atualizarInputSabotagem(index, e.target.value)} style={{ ...inputStyle, textTransform: 'uppercase' }} />))}</div><button onClick={enviarSabotagem} style={{ width: '100%', marginTop: '30px', padding: '20px', background: '#d97706', color: 'white', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>EXECUTAR CENSURA</button></div>) : (<div style={{ background: '#14532d', padding: '30px', border: '2px solid #22c55e', color: '#fff' }}><h3>// CENSURA APLICADA //</h3></div>)}</div>)}
    </div>
  );

  if (fase === 'DECIFRANDO') return commonRender(
      <div style={{ ...mainWrapper, background: '#2c3e50' }}>
          <TimerDisplay/>
          <RoleDisplay />
          <div style={{ padding: '20px', width: '100%' }}><HeaderDebug /></div>
          <div style={{ textAlign: 'center', color: 'white', marginBottom: '30px' }}><h2>DECODIFICAÇÃO</h2></div>
          <div style={paperStyle}>
              <div style={{ position: 'absolute', bottom: '20px', right: '20px', border: '4px solid black', color: 'black', padding: '5px 15px', transform: 'rotate(-10deg)', fontSize: '24px', fontWeight: 'bold', opacity: 0.4, pointerEvents: 'none' }}>CLASSIFIED</div>
              {textoCensurado.split(/(\[CENSURADO\])/g).map((parte, i) => (parte === '[CENSURADO]' ? <span key={i} style={{backgroundColor: '#111', color: 'transparent', padding: '2px 5px', margin: '0 2px'}}>████</span> : <span key={i}>{parte}</span>))}
          </div>
          {meuPapel === 'SABOTADOR' && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '30px', padding: '20px', borderTop: '2px dashed #666', width: '100%', maxWidth: '800px' }}>
                  <p style={{ width: '100%', color: '#999', textAlign: 'center', margin: '0 0 10px 0', fontSize: '12px' }}>TENTATIVAS DE SABOTAGEM DA EQUIPE:</p>
                  {palavrasSabotadasRodada.map((p, i) => (
                      <div key={i} style={{ backgroundColor: '#fef08a', color: '#000', padding: '5px 15px', fontFamily: "'Courier New', Courier, monospace", transform: `rotate(${Math.random() * 10 - 5}deg)`, boxShadow: '2px 2px 5px rgba(0,0,0,0.3)', fontSize: '14px', fontWeight: 'bold' }}>
                          {((souHost && configRecebida?.streamerMode) || modoStreamerLocal) ? '█████' : p}
                      </div>
                  ))}
              </div>
          )}
          {meuPapel === 'DECIFRADOR' ? (<div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '20px' }}><h3 style={{ color: 'white', textAlign: 'center' }}>QUAL É A PALAVRA-CHAVE?</h3><input style={inputStyle} placeholder="DIGITE SUA RESPOSTA..." value={tentativaDecifrador} onChange={(e) => setTentativaDecifrador(e.target.value)}/><button onClick={enviarDecifracao} style={{ width: '100%', marginTop: '20px', padding: '20px', background: '#2563eb', color: 'white', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 0 #1e3a8a' }}>ENVIAR DECODIFICAÇÃO</button></div>) : (<div style={{ textAlign: 'center', color: 'white' }}><h3>// AGUARDANDO ANÁLISE DO DECIFRADOR //</h3></div>)}
      </div>
  );

  if (fase === 'RESULTADO' && resultadoRodada) return commonRender(<div style={{ ...mainWrapper, background: '#111', color: '#fff' }}><h1 style={{ textAlign: 'center', color: resultadoRodada.acertou ? '#4ade80' : '#f87171' }}>{resultadoRodada.acertou ? "DECIFRAÇÃO BEM SUCEDIDA!" : "FALHA NA DECIFRAÇÃO"}</h1><div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: '#222', padding: '30px', border: '2px solid #444' }}><p>A palavra era: <strong style={{ fontSize: '1.5em', color: '#fbbf24' }}>{resultadoRodada.palavraSecreta}</strong></p><p>O Decifrador chutou: <strong>{resultadoRodada.tentativa}</strong></p><hr style={{ borderColor: '#444', margin: '20px 0' }} /><h3>Relatório de Pontos:</h3><ul>{resultadoRodada.resumo.map((linha, i) => <li key={i} style={{ margin: '5px 0', fontSize: '18px' }}>{linha}</li>)}</ul></div>{souHost ? (<div style={{ textAlign: 'center', marginTop: '40px' }}><button onClick={proximaRodada} style={{ padding: '20px 50px', background: '#1d4ed8', color: 'white', fontSize: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>PRÓXIMA RODADA ➡️</button></div>) : <p style={{ textAlign: 'center', marginTop: '40px' }}>Aguardando Host avançar...</p>}</div>);
  if (fase === 'FIM') return commonRender(<div style={{ ...mainWrapper, background: '#000', color: '#0f0' }}><h1 style={{ fontSize: '5rem', fontFamily: 'monospace' }}>MISSÃO CUMPRIDA</h1><h2>RANKING FINAL</h2><div style={{ border: '2px solid #0f0', padding: '20px', minWidth: '300px' }}>{jogadores.map((j, i) => (<div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', margin: '10px 0' }}><span>{i+1}. {j.nome}</span><span>{j.pontos} PTS</span></div>))}</div><button onClick={() => window.location.reload()} style={{ padding: '20px', background: 'transparent', border: '2px solid #0f0', color: '#0f0', fontSize: '24px', cursor: 'pointer', marginTop: '50px' }}>NOVA MISSÃO</button></div>);

  return <div>Carregando sistema...</div>;
}

export default App;