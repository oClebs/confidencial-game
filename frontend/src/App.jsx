import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png';
import './App.css'; // Apenas para animações scanlines

// 🟣 SEU CLIENT ID TWITCH
const TWITCH_CLIENT_ID = 'hoevm6fscw93d5c01d7ermgu6nbhk7';

// Inicializa socket
const socket = io(
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '/',
  { 
    autoConnect: true,
    reconnection: true,
  }
);

// --- COMPONENTE POPUP ---
const JanelaExterna = ({ children, onClose }) => {
  const [container, setContainer] = useState(null);
  const externalWindow = useRef(null);
  useEffect(() => {
    const win = window.open('', '', 'width=600,height=500,left=200,top=200');
    if (!win) { alert('Permita pop-ups!'); onClose(); return; }
    externalWindow.current = win;
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.className = "bg-zinc-900 text-white font-mono p-6 flex flex-col items-center justify-center";
    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);
    win.onbeforeunload = () => { onClose(); };
    return () => { win.close(); };
  }, [onClose]);
  return container ? createPortal(children, container) : null;
};

function App() {
  const [conectado, setConectado] = useState(socket.connected);
  
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

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    // Monitorar conexão
    socket.on('connect', () => { setConectado(true); console.log("🟢 Conectado!"); });
    socket.on('disconnect', () => { setConectado(false); console.log("🔴 Desconectado!"); });
    socket.on('connect_error', (err) => { console.error("Erro de conexão:", err); });

    socket.on('info_sala_retorno', (dados) => { setSalaEhTwitch(dados.twitchAuth); });
    
    socket.on('sala_criada_sucesso', (dados) => {
      console.log("🚀 SUCESSO: Sala criada!", dados);
      localStorage.setItem('censorizador_session', JSON.stringify({ 
        roomId: dados.roomId, token: dados.userToken, nome: dados.jogadores[0].nome 
      }));
      setSala(dados.roomId); 
      setJogadores(dados.jogadores); 
      setConfigRecebida(dados.config); 
      setEntrou(true); 
      setFase('LOBBY'); 
      setErroLogin(''); 
      setNome(dados.jogadores[0].nome);
    });

    socket.on('entrada_sucesso', (dados) => {
      console.log("🚀 SUCESSO: Entrou!", dados);
      const tokenSalvo = localStorage.getItem('censorizador_session') ? JSON.parse(localStorage.getItem('censorizador_session')).token : null;
      const eu = dados.jogadores.find((j) => j.id === socket.id);
      localStorage.setItem('censorizador_session', JSON.stringify({ 
        roomId: dados.roomId, token: tokenSalvo, nome: eu ? eu.nome : 'Jogador'
      }));
      setSala(dados.roomId); 
      setJogadores(dados.jogadores); 
      setFase(dados.fase); 
      setConfigRecebida(dados.config); 
      setEntrou(true); 
      setErroLogin('');
    });

    socket.on('sessao_invalida', () => { localStorage.removeItem('censorizador_session'); setSessaoSalva(null); setSalaEhTwitch(false); });
    socket.on('banido_da_sala', (msg) => { localStorage.removeItem('censorizador_session'); alert('⛔ ' + msg); window.location.reload(); });
    socket.on('log_evento', (d) => { adicionarLog(d); });
    socket.on('erro_login', (msg) => { 
        console.warn("Erro de login:", msg);
        setErroLogin(msg); 
        if (audioError.current) audioError.current.play().catch(()=>{}); 
    });
    socket.on('atualizar_sala', (l) => { setJogadores(l); const eu = l.find((j) => j.id === socket.id); if (eu) setSouHost(eu.isHost); });
    socket.on('sala_encerrada', () => { localStorage.removeItem('censorizador_session'); window.location.reload(); });
    socket.on('aviso_sala', (d) => setAviso(d));
    
    // Eventos de Jogo
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
    socket.on('resultado_rodada', (d) => { 
        setFase('RESULTADO'); setResultadoRodada(d); setJogadores(d.ranking); setAlvoLocal(0); 
        if (d.acertou) { if (audioSuccess.current) { audioSuccess.current.currentTime = 0; audioSuccess.current.play().catch(()=>{}); } } 
        else { if (audioError.current) { audioError.current.currentTime = 0; audioError.current.play().catch(()=>{}); } }
    });
    socket.on('fim_de_jogo', () => setFase('FIM'));

    return () => { socket.offAny(); };
  }, []);

  // --- EFEITOS GERAIS ---
  useEffect(() => {
    audioSuccess.current = new Audio('/success.mp3');
    audioError.current = new Audio('/error.mp3');
    
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && window.opener) {
      window.opener.postMessage({ type: 'TWITCH_LOGIN_SUCCESS', hash }, window.location.origin);
      window.close();
    }
    const saved = localStorage.getItem('censorizador_session');
    if (saved) { 
      const parsed = JSON.parse(saved); 
      setSessaoSalva(parsed); 
      if (parsed.roomId) socket.emit('verificar_sala', parsed.roomId); 
    }
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) { 
      setSala(roomParam); setModoLogin('ENTRAR'); socket.emit('verificar_sala', roomParam); window.history.replaceState({}, document.title, '/'); 
    }
  }, []);

  useEffect(() => { if (alvoLocal === 0) return; const i = setInterval(() => { const d = Math.ceil((alvoLocal - Date.now()) / 1000); setTempoRestante(d > 0 ? d : 0); if (d <= 0) setAlvoLocal(0); }, 200); return () => clearInterval(i); }, [alvoLocal]);
  useEffect(() => { if (fase === 'PREPARACAO' && tempoRestante === 1 && !jaEnvieiPreparacao) { if (textoPreparacao.length > 0) enviarTextoPreparacao(); else { socket.emit('enviar_preparacao', { nomeSala: sala, texto: '...' }); setJaEnvieiPreparacao(true); setJanelaExternaAberta(false); } } }, [tempoRestante, fase, jaEnvieiPreparacao, textoPreparacao, sala]);
  
  // --- AÇÕES ---
  const processarTokenTwitch = async (accessToken) => { /* Mantido igual */ }; 
  const abrirPopupTwitch = (acao) => { /* Mantido igual */ };
  const acaoReconectar = () => { if (sessaoSalva) { setNome(sessaoSalva.nome); setSala(sessaoSalva.roomId); setSenha(sessaoSalva.senha); socket.emit('entrar_sala', { nomeJogador: sessaoSalva.nome, roomId: sessaoSalva.roomId, senha: sessaoSalva.senha, token: sessaoSalva.token }); } };

  // ============================================
  // 🔥 AÇÃO CRÍTICA: CRIAR SALA
  // ============================================
  const acaoCriarSala = () => {
    console.log("Clicou em Criar Sala. Dados:", { nome, senha, conectado });
    if (!conectado) {
      setErroLogin("ERRO: Sem conexão com servidor!");
      return;
    }
    if (configSala.twitchAuth) {
      abrirPopupTwitch('CRIAR'); 
    } else { 
      if (nome && nome.trim().length > 0) { 
        socket.emit('criar_sala', { nomeJogador: nome, senha: senha, config: configSala }); 
      } else { 
        setErroLogin('Preencha seu Codinome!'); 
      } 
    } 
  };

  const acaoEntrarSala = () => { 
    if (!conectado) { setErroLogin("ERRO: Sem conexão com servidor!"); return; }
    if (salaEhTwitch) { abrirPopupTwitch('ENTRAR'); } else { 
      if (nome && sala) { socket.emit('entrar_sala', { nomeJogador: nome, roomId: sala, senha: senha, token: sessaoSalva?.token }); } else { setErroLogin('Preencha Codinome e Código!'); } 
    } 
  };

  // --- OUTRAS FUNÇÕES (MANTIDAS) ---
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
  const adicionarLog = (d) => { const id = Date.now(); setLogsSistema((prev) => [...prev, { ...d, id }]); setTimeout(() => { setLogsSistema((prev) => prev.filter((log) => log.id !== id)); }, 4000); };

  // --- COMPONENTES UI ---
  const TopBar = () => ( <div className="absolute top-0 left-0 w-full flex justify-between px-6 py-4 border-b border-white/10 bg-black/30 z-20 backdrop-blur-sm"> <div className="text-gray-400 text-xs tracking-widest font-mono">CONFIDENCIAL // OPERAÇÃO {sala}</div> <div className="flex gap-4"> <button onClick={sairDaSala} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest transition-colors">SAIR [X]</button> <button onClick={() => setModoStreamerLocal(!modoStreamerLocal)} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">{modoStreamerLocal ? 'MODO STREAMER: ON' : 'MODO STREAMER: OFF'}</button> </div> </div> );
  const Timer = () => { let tempoTotalFase = 1; if (fase === 'PREPARACAO') tempoTotalFase = parseInt(configSala.tempos.preparacao); else if (fase === 'SABOTAGEM') tempoTotalFase = parseInt(configSala.tempos.sabotagem); else if (fase === 'DECIFRANDO') tempoTotalFase = parseInt(configSala.tempos.decifracao); const porcentagem = Math.min(100, Math.max(0, (tempoRestante / tempoTotalFase) * 100)); return ( <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center w-64"> <div className={`text-4xl font-bold font-mono drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] mb-2 ${porcentagem < 25 ? 'text-red-500' : 'text-neon-green'}`}> {Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')} </div> <div className="w-full h-2 bg-black/60 border border-white/20 rounded-full overflow-hidden backdrop-blur-sm"> <div style={{ width: `${porcentagem}%` }} className={`h-full transition-all duration-300 ease-linear shadow-[0_0_10px] ${porcentagem < 25 ? 'bg-red-500 shadow-red-500' : 'bg-neon-green shadow-neon-green'}`} /> </div> </div> ); };
  const SidebarJogadores = () => ( <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40"> <div className="text-[10px] text-gray-600 text-center tracking-widest">AGENTES</div> {jogadores.map((j) => ( <div key={j.id} className="relative flex flex-col items-center group" onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost ? "Clique direito para banir" : j.nome}> <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-black transition-all duration-300 ${j.id === socket.id ? 'border-neon-green shadow-[0_0_15px_rgba(175,255,191,0.4)] scale-110' : 'border-gray-700 hover:border-gray-500'}`}> {j.foto ? <img src={j.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🕵️</div>} </div> {j.papel && ( <div className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-sm ${j.papel === 'CIFRADOR' ? 'bg-green-600' : j.papel === 'DECIFRADOR' ? 'bg-blue-600' : 'bg-red-600'}`}> {j.papel === 'CIFRADOR' ? '🖊️' : j.papel === 'DECIFRADOR' ? '🔍' : '✂️'} </div> )} <div className="mt-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-gray-400 uppercase tracking-wide group-hover:text-white transition-colors">{j.nome}</div> </div> ))} </div> );
  const SystemLogs = () => ( <div className="fixed bottom-6 left-6 flex flex-col gap-2 z-50 pointer-events-none max-w-xs"> {logsSistema.map((log) => ( <div key={log.id} className={`px-3 py-2 bg-black/80 backdrop-blur border-l-4 text-xs font-mono shadow-lg animate-in fade-in slide-in-from-left-4 ${log.tipo === 'ban' ? 'border-red-500 text-red-200' : log.tipo === 'sucesso' ? 'border-green-500 text-green-200' : 'border-yellow-500 text-yellow-200'}`}> {`> ${log.msg}`} </div> ))} </div> );
  const AvisoToast = () => { useEffect(() => { if (aviso) { const timer = setTimeout(() => setAviso(null), 3000); return () => clearTimeout(timer); } }, [aviso]); if (!aviso) return null; return ( <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300"> <div className="bg-yellow-500 text-black px-6 py-4 rounded shadow-[0_0_20px_rgba(234,179,8,0.5)] border-2 border-white font-bold flex items-center gap-3"> <span className="text-xl">⚠️</span> {aviso} </div> </div> ); };

  const renderContent = () => {
    if (!entrou) {
      const emMenu = modoLogin === 'MENU';
      const emCriar = modoLogin === 'CRIAR';
      const emEntrar = modoLogin === 'ENTRAR';
      return (
        <div className="text-center w-full max-w-lg mx-auto relative z-10">
          <img src={logoImage} className="logo-hero w-full max-w-md mx-auto mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-xl shadow-2xl relative overflow-hidden group">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            {emMenu && ( <div className="flex flex-col gap-4"> {sessaoSalva && ( <button onClick={acaoReconectar} className="w-full py-4 bg-green-700/80 hover:bg-green-600 text-white font-bold tracking-[2px] border border-green-500/50 shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all hover:-translate-y-1 rounded-sm uppercase"> Voltar para {sessaoSalva.roomId} </button> )} <button onClick={() => setModoLogin('CRIAR')} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-[3px] border-b-4 border-blue-800 hover:border-blue-700 shadow-lg transition-all active:border-b-0 active:translate-y-1 rounded-sm uppercase"> Iniciar Nova Operação </button> <button onClick={() => setModoLogin('ENTRAR')} className="w-full py-4 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-bold tracking-[2px] border border-white/10 hover:border-white/30 transition-all rounded-sm uppercase"> Acessar Operação Existente </button> </div> )}
            {emCriar && ( <div className="animate-in fade-in slide-in-from-bottom-4 duration-300"> <h3 className="text-white text-lg border-b border-white/10 pb-4 mb-6 tracking-[4px] font-bold">CONFIGURAR MISSÃO</h3> <div className="space-y-4"> <input placeholder="CODINOME (HOST)" value={configSala.twitchAuth ? '(Via Twitch)' : nome} disabled={configSala.twitchAuth} onChange={(e) => setNome(e.target.value)} className="w-full p-4 bg-black/50 border border-white/10 focus:border-neon-green/50 text-white font-mono placeholder-gray-600 outline-none rounded transition-all focus:shadow-[0_0_15px_rgba(175,255,191,0.1)]" /> <input placeholder="SENHA (OPCIONAL)" type="text" value={configSala.twitchAuth ? '' : senha} disabled={configSala.twitchAuth} onChange={(e) => setSenha(e.target.value)} className="w-full p-4 bg-black/50 border border-white/10 focus:border-neon-green/50 text-white font-mono placeholder-gray-600 outline-none rounded transition-all focus:shadow-[0_0_15px_rgba(175,255,191,0.1)]" /> <div className="p-4 bg-white/5 rounded border border-white/5"> <label className="text-xs text-gray-400 tracking-widest block mb-2">CICLOS DE RODADAS</label> <div className="flex items-center gap-4"> <input type="range" min="1" max="5" value={configSala.numCiclos} onChange={e => setConfigSala({...configSala, numCiclos: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-green" /> <span className="text-neon-green font-bold text-xl">{configSala.numCiclos}</span> </div> </div> <div className="grid grid-cols-2 gap-4"> <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Preparação (s)</label><input type="number" value={configSala.tempos.preparacao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, preparacao: e.target.value}})} className="w-full p-2 bg-black/30 border border-white/10 text-center text-white rounded focus:border-neon-green outline-none" /></div> <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Sabotagem (s)</label><input type="number" value={configSala.tempos.sabotagem} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, sabotagem: e.target.value}})} className="w-full p-2 bg-black/30 border border-white/10 text-center text-white rounded focus:border-neon-green outline-none" /></div> <div className="col-span-2"><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Decifração (s)</label><input type="number" value={configSala.tempos.decifracao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, decifracao: e.target.value}})} className="w-full p-2 bg-black/30 border border-white/10 text-center text-white rounded focus:border-neon-green outline-none" /></div> </div> <div className="flex gap-4 text-xs text-gray-400 pt-2"> <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><input type="checkbox" className="accent-neon-green" checked={configSala.twitchAuth} onChange={(e) => setConfigSala({ ...configSala, twitchAuth: e.target.checked })} /> Twitch Auth</label> <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><input type="checkbox" className="accent-neon-green" checked={configSala.streamerMode} onChange={(e) => setConfigSala({ ...configSala, streamerMode: e.target.checked })} /> Modo Streamer</label> </div> </div> <div className="flex gap-3 mt-6"> <button onClick={() => setModoLogin('MENU')} className="px-6 py-4 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white font-bold rounded uppercase transition-all">Voltar</button> <button onClick={acaoCriarSala} className="flex-1 py-4 bg-neon-green/90 hover:bg-neon-green text-black font-bold tracking-[2px] shadow-[0_0_20px_rgba(175,255,191,0.4)] rounded uppercase transition-all hover:scale-[1.02]"> {configSala.twitchAuth ? 'Logar & Criar' : 'Criar Sala'} </button> </div> </div> )}
            {emEntrar && ( <div className="animate-in fade-in slide-in-from-bottom-4 duration-300"> <h3 className="text-white text-lg border-b border-white/10 pb-4 mb-6 tracking-[4px] font-bold">ACESSAR SISTEMA</h3> <input placeholder="CÓDIGO" value={sala} onChange={(e) => setSala(e.target.value.toUpperCase())} className="w-full p-6 text-center text-3xl tracking-[10px] bg-black/60 border-2 border-white/10 focus:border-neon-green text-neon-green font-mono rounded-lg outline-none mb-4 transition-all" /> {!salaEhTwitch && ( <div className="space-y-3"> <input placeholder="SEU CODINOME" onChange={(e) => setNome(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 focus:border-white/40 text-white rounded outline-none" /> <input placeholder="SENHA DA SALA" type="password" onChange={(e) => setSenha(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 focus:border-white/40 text-white rounded outline-none" /> </div> )} {salaEhTwitch && (<p className="text-center text-purple-400 text-xs py-2">🔒 ESTA SALA REQUER LOGIN TWITCH</p>)} <div className="flex gap-3 mt-6"> <button onClick={() => setModoLogin('MENU')} className="px-6 py-4 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white font-bold rounded uppercase transition-all">Voltar</button> <button onClick={acaoEntrarSala} className={`flex-1 py-4 font-bold tracking-[2px] shadow-lg rounded uppercase transition-all hover:scale-[1.02] ${salaEhTwitch ? 'bg-[#9146ff] hover:bg-[#7c3aed] text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}> {salaEhTwitch ? 'Logar com Twitch' : 'Entrar na Sala'} </button> </div> </div> )}
            {erroLogin && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-xs text-center rounded animate-pulse">⚠️ {erroLogin}</div>}
          </div>
        </div>
      );
    }
    // As outras fases (LOBBY, PREPARACAO, ETC) continuam idênticas...
    // (Para economizar espaço, elas estão implícitas aqui no código anterior, mas o renderContent segue com os IFs das fases)
    if (fase === 'LOBBY') { return <div className="w-full animate-in fade-in duration-500"><TopBar /><div className="text-center mt-20 mb-12"><h2 className="text-5xl md:text-6xl text-white font-bold tracking-[8px] drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] mb-4">OPERAÇÃO: {sala}</h2><p className="text-gray-500 text-sm tracking-[4px] uppercase mb-8">// AGENTES CONECTADOS //</p><button onClick={copiarLinkConvite} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-gray-300 transition-all flex items-center gap-2 mx-auto">{linkCopiado ? '✅ LINK COPIADO' : '🔗 COPIAR CÓDIGO DA SALA'}</button></div><div className="flex flex-wrap gap-6 justify-center mb-16 max-w-4xl mx-auto">{jogadores.map((j) => (<div key={j.id} onContextMenu={(e) => handleContextMenuJogador(e, j)} className="w-32 bg-black/40 backdrop-blur border border-white/10 rounded-xl p-4 flex flex-col items-center shadow-lg hover:border-neon-green/50 hover:-translate-y-1 transition-all duration-300 group"><div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-neon-green mb-3 bg-black">{j.foto ? <img src={j.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🕵️</div>}</div><strong className="text-xs text-white font-bold uppercase tracking-wider truncate w-full text-center">{j.nome}</strong><span className="text-[10px] text-gray-500 mt-1">{j.pontos} PTS</span>{j.isHost && <span className="mt-2 text-[9px] text-red-400 border border-red-900 bg-red-900/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Diretor</span>}</div>))}</div><div className="text-center">{souHost ? (<button onClick={iniciarJogo} className="px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-xl tracking-[4px] rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] hover:scale-105 transition-all uppercase">Iniciar Operação</button>) : (<p className="text-gray-500 animate-pulse tracking-[2px] uppercase">Aguardando o Diretor iniciar...</p>)}</div></div>; }
    if (fase === 'PREPARACAO') { const devoEsconder = (souHost && configRecebida?.streamerMode) || modoStreamerLocal; return <div className="w-full max-w-3xl animate-in zoom-in-95 duration-500"><TopBar /><Timer />{!jaEnvieiPreparacao ? (<>{devoEsconder ? (<div className="border-2 border-dashed border-gray-600 bg-black/20 p-12 text-center rounded-2xl mt-24"><h3 className="text-2xl text-white font-bold mb-4">MODO STREAMER ATIVO</h3><p className="text-gray-400 mb-8">Abra o painel secreto para ver sua palavra com segurança.</p><button onClick={() => setJanelaExternaAberta(true)} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow-lg">ABRIR PAINEL SECRETO</button></div>) : (<><div className="text-center mt-20 mb-8"><div className="text-xs text-gray-500 uppercase tracking-[4px] mb-2">Sua Palavra Secreta</div><div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">{minhaPalavraInicial}</div></div><div className="bg-[#f0e6d2] text-black p-8 shadow-2xl rotate-1 relative rounded-sm max-w-2xl mx-auto transform transition-transform hover:rotate-0"><div className="absolute -top-6 left-0 bg-[#f0e6d2] px-4 py-1 rounded-t-lg text-[10px] font-bold text-gray-600 uppercase tracking-widest">RELATÓRIO CONFIDENCIAL //</div><textarea rows={8} autoFocus maxLength={200} placeholder="Datilografe a descrição aqui..." value={textoPreparacao} onChange={(e) => setTextoPreparacao(e.target.value)} className="w-full bg-transparent border-none outline-none text-xl font-mono font-bold leading-relaxed resize-none bg-[linear-gradient(transparent_31px,#ccc_31px,#ccc_32px)] bg-local" /><div className="text-right text-xs text-gray-500 font-bold mt-2">{textoPreparacao.length}/200</div></div><div className="text-center mt-8"><button onClick={enviarTextoPreparacao} className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-bold tracking-[2px] rounded shadow-lg uppercase transition-transform hover:-translate-y-1">Enviar Relatório</button></div></>)}{janelaExternaAberta && <JanelaExterna onClose={() => setJanelaExternaAberta(false)}><div className="flex flex-col items-center justify-center h-full text-center"><h2 className="text-4xl font-bold text-white mb-6">PALAVRA: <span className="text-yellow-400">{minhaPalavraInicial}</span></h2><textarea value={textoPreparacao} maxLength={200} onChange={(e) => setTextoPreparacao(e.target.value)} className="w-full h-64 bg-gray-100 text-black p-4 font-mono text-xl rounded shadow-inner mb-4 outline-none resize-none" /><button onClick={enviarTextoPreparacao} className="w-full py-4 bg-blue-600 text-white font-bold text-xl rounded hover:bg-blue-500">ENVIAR</button></div></JanelaExterna>}</>) : (<div className="text-center mt-32 text-gray-500 flex flex-col items-center animate-pulse"><div className="text-6xl mb-4">📁</div><h2 className="text-2xl font-bold uppercase tracking-widest">Relatório Arquivado</h2><p className="mt-2 text-sm">Aguardando outros agentes ({statusPreparacao.prontos}/{statusPreparacao.total})...</p></div>)}</div>; }
    if (fase === 'SABOTAGEM') { return <div className="w-full max-w-4xl animate-in slide-in-from-right-8 duration-500"><TopBar /><Timer /><div className="text-center mb-8 text-xs text-gray-500 tracking-[4px]">RODADA {infoRodada.atual}/{infoRodada.total}</div>{meuPapel === 'DECIFRADOR' && (<div className="text-center mt-32"><div className="inline-block border-4 border-red-500 p-8 rounded-lg bg-red-500/10 backdrop-blur"><h1 className="text-5xl font-bold text-red-500 tracking-widest mb-2">ACESSO NEGADO</h1><p className="text-red-300 uppercase tracking-wide">Protocolo de segurança ativo. Aguarde.</p></div></div>)}{meuPapel === 'CIFRADOR' && (<div className="bg-[#f0e6d2] text-black p-8 shadow-2xl relative rounded-sm max-w-2xl mx-auto border-l-8 border-red-600"><div className="absolute -top-6 left-0 bg-red-600 text-white px-4 py-1 rounded-t text-[10px] font-bold uppercase tracking-widest">ALERTA DE INTRUSÃO //</div><h3 className="text-red-700 font-bold uppercase mb-4 text-sm tracking-wide">SEU TEXTO ESTÁ SOB ATAQUE:</h3><p className="text-2xl font-mono leading-relaxed">"{descricaoRecebida}"</p></div>)}{meuPapel === 'SABOTADOR' && (<><div className="text-center mb-8"><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">ALVO PRIORITÁRIO</div><strong className="text-4xl text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">{dadosRodada?.palavra}</strong></div>{!sabotagemEnviada ? (<div className="bg-[#f0e6d2] text-black p-8 shadow-2xl rotate-[-1deg] relative rounded-sm max-w-2xl mx-auto"><div className="absolute -top-6 left-0 bg-[#333] text-white px-4 py-1 rounded-t text-[10px] font-bold uppercase tracking-widest">FERRAMENTA DE CENSURA //</div><div className="grid grid-cols-2 gap-4">{inputsSabotagem.map((v, i) => (<input key={i} placeholder={`PALAVRA PROIBIDA #${i + 1}`} value={v} onChange={(e) => atualizarInputSabotagem(i, e.target.value)} className="bg-white/50 border-b-2 border-dashed border-gray-500 p-2 font-bold uppercase outline-none focus:border-red-600 focus:bg-white transition-colors" />))}</div><button onClick={enviarSabotagem} className="w-full mt-6 py-4 bg-red-700 hover:bg-red-600 text-white font-bold tracking-[2px] rounded shadow-lg uppercase transition-all hover:scale-[1.01]">EXECUTAR CENSURA</button></div>) : (<div className="text-center mt-24 text-gray-500 animate-pulse"><h2 className="text-2xl font-bold uppercase tracking-widest mb-2">CENSURA APLICADA</h2><p className="text-sm">Aguardando processamento do sistema...</p></div>)}</>)}</div>; }
    if (fase === 'DECIFRANDO') { return <div className="w-full max-w-3xl animate-in fade-in duration-700"><TopBar /><Timer /><div className="text-center mb-10"><h2 className="text-3xl text-white font-bold tracking-[6px] uppercase text-shadow">DECODIFICAÇÃO</h2></div><div className="bg-[#f0e6d2] text-black p-10 shadow-2xl relative rounded-sm rotate-1 mx-auto min-h-[300px] flex items-center justify-center"><div className="absolute top-4 right-4 border-4 border-red-700 text-red-700 px-4 py-1 font-bold text-xl uppercase -rotate-12 opacity-70">TOP SECRET</div><p className="text-2xl font-mono font-bold leading-loose text-justify">{textoCensurado.split(/(\[CENSURADO\])/g).map((parte, i) => parte === '[CENSURADO]' ? <span key={i} className="bg-black text-transparent px-2 rounded mx-1 select-none">████</span> : <span key={i}>{parte}</span>)}</p></div>{meuPapel === 'SABOTADOR' && (<div className="mt-8 text-center"><p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">TENTATIVAS DA EQUIPE</p><div className="flex flex-wrap gap-2 justify-center">{palavrasSabotadasRodada.map((p, i) => (<span key={i} className="bg-yellow-100 text-yellow-900 border border-yellow-300 px-3 py-1 rounded font-bold text-xs uppercase shadow-sm">{((souHost && configRecebida?.streamerMode) || modoStreamerLocal) ? '████' : p}</span>))}</div></div>)}{meuPapel === 'DECIFRADOR' ? (<div className="mt-10 flex gap-4 max-w-xl mx-auto"><input placeholder="QUAL É A PALAVRA?" value={tentativaDecifrador} onChange={(e) => setTentativaDecifrador(e.target.value)} autoFocus className="flex-1 p-4 bg-black/60 border border-white/20 focus:border-neon-green text-white font-mono text-xl outline-none rounded shadow-lg" /><button onClick={enviarDecifracao} className="px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase tracking-wider shadow-lg hover:-translate-y-1 transition-transform">ENVIAR</button></div>) : (<p className="text-center text-gray-600 mt-12 uppercase tracking-widest animate-pulse">// AGUARDANDO ANÁLISE DO DECIFRADOR //</p>)}</div>; }
    if (fase === 'RESULTADO' && resultadoRodada) { return <div className="w-full max-w-2xl text-center animate-in zoom-in-90 duration-500"><TopBar /><h1 className={`text-4xl md:text-5xl font-bold uppercase tracking-widest mb-8 drop-shadow-[0_0_20px] ${resultadoRodada.acertou ? 'text-green-400 shadow-green-400' : 'text-red-400 shadow-red-400'}`}>{resultadoRodada.acertou ? 'SUCESSO NA DECIFRAÇÃO' : 'FALHA NA DECIFRAÇÃO'}</h1><div className="bg-[#f0e6d2] text-black p-8 shadow-2xl rounded-sm relative text-left"><div className="absolute -top-5 left-0 bg-gray-800 text-white px-4 py-1 rounded-t text-xs font-bold uppercase">RELATÓRIO PÓS-AÇÃO //</div><p className="text-xs text-gray-500 font-bold uppercase mb-1">A PALAVRA ERA:</p><strong className="text-4xl block text-red-700 font-black uppercase mb-6">{resultadoRodada.palavraSecreta}</strong><p className="text-lg">O DECIFRADOR DISSE: <strong className="bg-yellow-200 px-2">{resultadoRodada.tentativa}</strong></p><hr className="border-gray-400 my-6 border-dashed" /><ul className="space-y-3 font-mono text-sm">{resultadoRodada.resumo.map((l, i) => (<li key={i} className="border-b border-gray-300 pb-2">{l}</li>))}</ul></div><div className="mt-10">{souHost ? (<button onClick={proximaRodada} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-[2px] rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-all uppercase">PRÓXIMA RODADA ➡️</button>) : (<p className="text-gray-500 animate-pulse uppercase tracking-widest">Aguardando o Diretor...</p>)}</div></div>; }
    if (fase === 'FIM') { return <div className="text-center animate-in fade-in duration-1000"><h1 className="text-6xl md:text-8xl text-white font-black tracking-tighter mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">MISSÃO CUMPRIDA</h1><div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-xl mx-auto shadow-2xl">{jogadores.map((j, i) => (<div key={j.id} className="flex justify-between items-center border-b border-white/10 py-4 last:border-0 text-white text-xl"><div className="flex items-center gap-4"><span className={`font-bold font-mono ${i===0 ? 'text-yellow-400 text-2xl' : 'text-gray-400'}`}>#{i + 1}</span><span className="uppercase tracking-wider">{j.nome}</span></div><span className="font-bold text-neon-green">{j.pontos} PTS</span></div>))}</div><button onClick={() => window.location.reload()} className="mt-12 px-10 py-4 bg-white text-black font-black text-xl rounded hover:bg-gray-200 uppercase tracking-[3px] shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all hover:scale-105">NOVA MISSÃO</button></div>; }
    return <div className="text-red-500 font-mono text-xl">ERRO CRÍTICO: FASE DESCONHECIDA ({fase})</div>;
  };

  return (
    <div className="app-wrapper relative h-screen w-full bg-[#0a0a0a] bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000_90%)] overflow-y-auto overflow-x-hidden font-mono text-gray-200">
      <div className="crt-scanlines pointer-events-none fixed inset-0 z-10 opacity-40 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px]" />
      <div className="crt-vignette pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.6)_100%)]" />
      {menuBan.visivel && <div style={{top:menuBan.y, left:menuBan.x}} className="fixed bg-black border border-red-500 text-red-500 p-4 z-[9999] cursor-pointer font-bold shadow-2xl hover:bg-red-900/20" onClick={confirmarBan}>BANIR AGENTE<br/><span className="text-white">{menuBan.jogadorNome}</span></div>}
      {exibirRegras && (<div className="fixed bottom-24 right-8 w-80 bg-black/95 text-neon-green p-6 border border-neon-green rounded shadow-[0_0_20px_rgba(175,255,191,0.2)] z-50 animate-in slide-in-from-right-10 font-mono text-sm"><h3 className="border-b border-dashed border-neon-green pb-2 mb-3 font-bold uppercase tracking-widest">📂 PROTOCOLOS</h3><ul className="space-y-2 leading-relaxed"><li><strong>1. SEGREDO:</strong> Todos recebem uma palavra.</li><li><strong>2. 🕵️ CIFRADOR:</strong> Descreve sem falar a palavra.</li><li><strong>3. ✂️ SABOTADOR:</strong> Tenta censurar palavras chave do texto.</li><li><strong>4. 🧩 DECIFRADOR:</strong> Tenta adivinhar a original.</li></ul></div>)}
      <button onClick={() => setExibirRegras(!exibirRegras)} className="fixed bottom-8 right-8 w-12 h-12 bg-yellow-500 text-black border-2 border-white rounded-full font-bold text-xl z-[60] shadow-[0_0_15px_rgba(234,179,8,0.6)] hover:scale-110 transition-transform flex items-center justify-center">?</button>
      {entrou && fase !== 'LOBBY' && fase !== 'FIM' && <SidebarJogadores />}
      <SystemLogs />
      <div className="relative z-20 min-h-full flex flex-col items-center justify-center p-6 py-10">
        {renderContent()}
      </div>
      <AvisoToast />
    </div>
  );
}

export default App;