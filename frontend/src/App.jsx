import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png';
import './App.css'; // IMPORTANTE: Importa o arquivo CSS novo

// 🟣 SEU CLIENT ID TWITCH
const TWITCH_CLIENT_ID = 'hoevm6fscw93d5c01d7ermgu6nbhk7';

const socket = io(
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '/',
);

// Janela Externa (Popup)
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
  // ... LÓGICA DE SOCKET E ESTADO (MANTIDA IGUAL) ...
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && window.opener) {
      window.opener.postMessage({ type: 'TWITCH_LOGIN_SUCCESS', hash }, window.location.origin);
      window.close();
    }
  }, []);

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
  
  const [configSala, setConfigSala] = useState({ twitchAuth: false, streamerMode: false, numCiclos: 1, tempos: { preparacao: 120, sabotagem: 30, decifracao: 45 } });
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
    if (sala.length === 4) socket.emit('verificar_sala', sala); else setSalaEhTwitch(false);
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
      const response = await fetch('https://api.twitch.tv/helix/users', { headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': TWITCH_CLIENT_ID }, });
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
    const w = 500, h = 700; const left = window.screen.width/2 - w/2; const top = window.screen.height/2 - h/2;
    window.open(authUrl, 'Twitch Auth', `width=${w},height=${h},top=${top},left=${left}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) { setSala(roomParam); setModoLogin('ENTRAR'); socket.emit('verificar_sala', roomParam); window.history.replaceState({}, document.title, '/'); }
    const saved = localStorage.getItem('censorizador_session');
    if (saved) { const parsed = JSON.parse(saved); setSessaoSalva(parsed); if (parsed.roomId) socket.emit('verificar_sala', parsed.roomId); }

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
    socket.on('log_evento', (d) => { adicionarLog(d); });
    socket.on('erro_login', (msg) => { setErroLogin(msg); if (audioError.current) audioError.current.play().catch(()=>{}); });
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
    socket.on('resultado_rodada', (d) => { 
        setFase('RESULTADO'); setResultadoRodada(d); setJogadores(d.ranking); setAlvoLocal(0); 
        if (d.acertou) { if (audioSuccess.current) { audioSuccess.current.currentTime = 0; audioSuccess.current.play().catch(()=>{}); } } 
        else { if (audioError.current) { audioError.current.currentTime = 0; audioError.current.play().catch(()=>{}); } }
    });
    socket.on('fim_de_jogo', () => setFase('FIM'));
    return () => { socket.removeAllListeners(); };
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

  // --- COMPONENTES AUXILIARES (AGORA USAM CLASSES DO CSS) ---
  const TopBar = () => (
    <div className="nav-bar">
      <div style={{ color: '#aaa', fontSize: '12px', letterSpacing: '1px' }}>CONFIDENCIAL // OPERAÇÃO {sala}</div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button onClick={sairDaSala} style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textTransform: 'uppercase' }}>SAIR [X]</button>
        <button onClick={() => setModoStreamerLocal(!modoStreamerLocal)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textTransform: 'uppercase' }}>{modoStreamerLocal ? 'MODO STREAMER: ON' : 'MODO STREAMER: OFF'}</button>
      </div>
    </div>
  );

  const Timer = () => {
    let tempoTotalFase = 1;
    if (fase === 'PREPARACAO') tempoTotalFase = parseInt(configSala.tempos.preparacao);
    else if (fase === 'SABOTAGEM') tempoTotalFase = parseInt(configSala.tempos.sabotagem);
    else if (fase === 'DECIFRANDO') tempoTotalFase = parseInt(configSala.tempos.decifracao);
    const porcentagem = Math.min(100, Math.max(0, (tempoRestante / tempoTotalFase) * 100));
    const corDinamica = porcentagem < 25 ? '#ef4444' : '#afffbf';
    return (
      <div style={{ position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '220px' }}>
        <div style={{ color: corDinamica, fontSize: '24px', fontWeight: 'bold', textShadow: `0 0 10px ${corDinamica}`, marginBottom: '4px', fontFamily: "'Courier Prime', monospace" }}>{Math.floor(tempoRestante / 60)}:{(tempoRestante % 60).toString().padStart(2, '0')}</div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0, 20, 0, 0.6)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${porcentagem}%`, backgroundColor: corDinamica, boxShadow: `0 0 8px ${corDinamica}`, transition: 'width 0.2s linear, background-color 0.5s ease' }} />
        </div>
      </div>
    );
  };

  const RulesWidget = () => (
    <>
      <button onClick={() => setExibirRegras(!exibirRegras)} className="help-btn" title="Protocolos">?</button>
      <div className={`rules-box ${exibirRegras ? 'visible' : ''}`}>
        <div style={{ borderBottom: '1px dashed #afffbf', paddingBottom: '10px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize:'16px' }}>📂 PROTOCOLOS</h3>
        </div>
        <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', lineHeight: '1.5em', listStyle: 'none' }}>
          <li style={{ marginBottom: '8px' }}><strong>1. O SEGREDO:</strong> Cada um recebe uma palavra secreta.</li>
          <li style={{ marginBottom: '8px' }}><strong>2. 🕵️ CIFRADOR:</strong> Descreve a palavra sem usá-la diretamente.</li>
          <li style={{ marginBottom: '8px' }}><strong>3. ✂️ SABOTADOR:</strong> Censura palavras para quebrar o texto.</li>
          <li style={{ marginBottom: '8px' }}><strong>4. 🧩 DECIFRADOR:</strong> Tenta adivinhar a palavra original.</li>
        </ul>
      </div>
    </>
  );

  const SidebarJogadores = () => (
    <div className="sidebar-container">
      <div style={{fontSize:'9px', color:'#555', textAlign:'center', marginBottom:'5px'}}>AGENTES</div>
      {jogadores.map((j) => (
        <div key={j.id} className="sidebar-item" onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost ? "Clique direito para banir" : j.nome}>
          <div className="sidebar-avatar" style={{
              borderColor: j.id === socket.id ? '#afffbf' : '#444',
              boxShadow: j.id === socket.id ? '0 0 10px #afffbf' : 'none'
          }}>
            {j.foto ? <img src={j.foto} /> : <span style={{fontSize:'24px', lineHeight:'46px', display:'block', textAlign:'center', color:'#ccc'}}>🕵️</span>}
          </div>
          {j.papel && (
              <div style={{
                  position: 'absolute', top: '-5px', right: '-5px', fontSize: '12px',
                  background: j.papel === 'CIFRADOR' ? '#22c55e' : j.papel === 'DECIFRADOR' ? '#3b82f6' : '#ef4444',
                  color: 'white', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold'
              }}>
                  {j.papel === 'CIFRADOR' ? '🖊️' : j.papel === 'DECIFRADOR' ? '🔍' : '✂️'}
              </div>
          )}
          <div className="sidebar-name">{j.nome}</div>
        </div>
      ))}
    </div>
  );

  const SystemLogs = () => (
    <div className="logs-container">
        {logsSistema.map((log) => (
            <div key={log.id} className="log-item" style={{
                borderLeftColor: log.tipo === 'ban' ? '#ef4444' : log.tipo === 'sucesso' ? '#22c55e' : '#eab308',
                color: log.tipo === 'ban' ? '#ef4444' : '#fff'
            }}>
                {`> ${log.msg}`}
            </div>
        ))}
    </div>
  );

  const AvisoToast = () => { if (!aviso) return null; const color = aviso.tipo === 'perigo' ? '#ff6666' : '#86efac'; return (<div style={{ position: 'fixed', top: '60px', left: '0', width: '100%', textAlign: 'center', color: color, fontWeight: 'bold', background: 'rgba(0,0,0,0.8)', padding: '10px', zIndex: 100 }}>{aviso.msg}</div>); };

  // --- RENDER PRINCIPAL ---
  const renderContent = () => {
    // TELA DE LOGIN
    if (!entrou) {
      const emMenu = modoLogin === 'MENU';
      const emCriar = modoLogin === 'CRIAR';
      const emEntrar = modoLogin === 'ENTRAR';

      return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
          <img src={logoImage} className="logo-hero" />

          {emMenu && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {sessaoSalva && <button onClick={acaoReconectar} className="btn-primary" style={{background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)'}}>VOLTAR PARA {sessaoSalva.roomId}</button>}
              <button onClick={() => setModoLogin('CRIAR')} className="btn-primary">INICIAR NOVA OPERAÇÃO</button>
              <button onClick={() => setModoLogin('ENTRAR')} className="btn-secondary">ACESSAR OPERAÇÃO EXISTENTE</button>
            </div>
          )}

          {emCriar && (
            <div>
              <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>CONFIGURAR MISSÃO</h3>
              <input placeholder="CODINOME" value={configSala.twitchAuth ? '(Via Twitch)' : nome} disabled={configSala.twitchAuth} onChange={(e) => setNome(e.target.value)} className="input-crt" />
              <input placeholder="SENHA" type="text" value={configSala.twitchAuth ? '' : senha} disabled={configSala.twitchAuth} onChange={(e) => setSenha(e.target.value)} className="input-crt" />
              
              {/* SLIDERS E CONFIGURAÇÕES */}
              <div style={{ margin: '20px 0', textAlign: 'left', color: '#ccc' }}>
                  <label style={{ fontSize: '12px', letterSpacing: '1px' }}>CICLOS DE RODADAS:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="range" min="1" max="5" value={configSala.numCiclos} onChange={e => setConfigSala({...configSala, numCiclos: parseInt(e.target.value)})} style={{ flex: 1 }} />
                      <span style={{ fontWeight: 'bold' }}>{configSala.numCiclos}</span>
                  </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left', color: '#ccc' }}>
                  <div><label style={{ fontSize: '10px' }}>PREPARAÇÃO (s)</label><input type="number" value={configSala.tempos.preparacao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, preparacao: e.target.value}})} className="input-crt-small" /></div>
                  <div><label style={{ fontSize: '10px' }}>SABOTAGEM (s)</label><input type="number" value={configSala.tempos.sabotagem} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, sabotagem: e.target.value}})} className="input-crt-small" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '10px' }}>DECIFRAÇÃO (s)</label><input type="number" value={configSala.tempos.decifracao} onChange={e => setConfigSala({...configSala, tempos: {...configSala.tempos, decifracao: e.target.value}})} className="input-crt-small" /></div>
              </div>
              <div style={{ textAlign: 'left', margin: '20px 0', fontSize: '12px', color: '#999' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}><input type="checkbox" checked={configSala.twitchAuth} onChange={(e) => setConfigSala({ ...configSala, twitchAuth: e.target.checked })} /> Usar Twitch Auth</label>
                <label style={{ display: 'block' }}><input type="checkbox" checked={configSala.streamerMode} onChange={(e) => setConfigSala({ ...configSala, streamerMode: e.target.checked })} /> Modo Streamer</label>
              </div>

              <button onClick={acaoCriarSala} className="btn-primary" style={{background: configSala.twitchAuth ? '#7c3aed' : '' }}>{configSala.twitchAuth ? 'LOGAR TWITCH & CRIAR' : 'CRIAR SALA'}</button>
              <button onClick={() => setModoLogin('MENU')} className="btn-secondary">VOLTAR</button>
            </div>
          )}

          {emEntrar && (
            <div>
              <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>ACESSAR SISTEMA</h3>
              <input placeholder="CÓDIGO DA SALA" value={sala} onChange={(e) => setSala(e.target.value.toUpperCase())} className="input-crt" style={{textAlign:'center', fontSize:'24px', letterSpacing:'5px'}} />
              {!salaEhTwitch && (<><input placeholder="SEU CODINOME" onChange={(e) => setNome(e.target.value)} className="input-crt" /><input placeholder="SENHA DA SALA" type="text" onChange={(e) => setSenha(e.target.value)} className="input-crt" /></>)}
              {salaEhTwitch && (<p style={{ color: '#a78bfa', fontSize: '12px' }}>🔒 ESTA SALA REQUER LOGIN TWITCH</p>)}
              <button onClick={acaoEntrarSala} className="btn-primary" style={{ background: salaEhTwitch ? '#7c3aed' : '' }}>{salaEhTwitch ? 'LOGAR COM TWITCH' : 'ENTRAR NA SALA'}</button>
              <button onClick={() => setModoLogin('MENU')} className="btn-secondary">VOLTAR</button>
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
            <button onClick={copiarLinkConvite} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '12px', borderRadius: '20px' }}>{linkCopiado ? 'LINK COPIADO! ✅' : '🔗 COPIAR CÓDIGO'}</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', justifyContent: 'center', marginBottom: '50px' }}>
            {jogadores.map((j) => (
              <div key={j.id} className="agent-card" onContextMenu={(e) => handleContextMenuJogador(e, j)} title={souHost ? "Clique direito para banir" : j.nome}>
                <div className="agent-photo">{j.foto ? <img src={j.foto} /> : <span style={{ fontSize: '30px', lineHeight: '60px', display: 'block', textAlign: 'center' }}>🕵️</span>}</div>
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', marginTop: '5px' }}>{j.nome}</strong>
                <span style={{ fontSize: '10px', color: '#888' }}>{j.pontos} PTS</span>
                {j.isHost && <span style={{ color: '#f87171', fontWeight: 'bold', fontSize: '10px', marginTop: '5px' }}>DIRETOR</span>}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            {souHost ? (<button onClick={iniciarJogo} className="btn-primary" style={{ width: 'auto', padding: '20px 50px', fontSize: '18px', borderRadius: '50px' }}>INICIAR OPERAÇÃO</button>) : (<p style={{ color: '#aaa', animation: 'pulse 2s infinite', fontSize: '14px', letterSpacing: '1px' }}>AGUARDANDO O DIRETOR...</p>)}
          </div>
        </div>
      );
    }

    if (fase === 'PREPARACAO') {
      const devoEsconder = (souHost && configRecebida?.streamerMode) || modoStreamerLocal;
      return (
        <div>
          <TopBar /><Timer />
          {!jaEnvieiPreparacao ? (
            <>
              {devoEsconder ? (
                <div style={{ border: '2px dashed #666', padding: '30px', textAlign: 'center', color: '#ccc', marginTop: '100px', borderRadius: '10px' }}>
                  <h3>MODO STREAMER ATIVO</h3><p>Abra o painel secreto para ver sua palavra.</p><button onClick={() => setJanelaExternaAberta(true)} className="btn-primary" style={{width:'auto'}}>ABRIR PAINEL</button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '40px' }}>
                    <div style={{fontSize:'12px', color:'#888'}}>SUA PALAVRA SECRETA</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 10px #fff' }}>{minhaPalavraInicial}</div>
                  </div>
                  <div className="paper-sheet">
                    <div className="folder-tab">RELATÓRIO //</div>
                    <textarea rows={10} autoFocus maxLength={200} placeholder="Datilografe a descrição aqui..." value={textoPreparacao} onChange={(e) => setTextoPreparacao(e.target.value)} className="paper-textarea" />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '5px' }}>{textoPreparacao.length}/200</div>
                  </div>
                  <button onClick={enviarTextoPreparacao} className="btn-primary">ENVIAR RELATÓRIO</button>
                </>
              )}
              {janelaExternaAberta && <JanelaExterna onClose={() => setJanelaExternaAberta(false)}><div style={{ padding: '20px', color: '#fff', fontFamily: 'monospace', textAlign: 'center' }}><h2>PALAVRA: {minhaPalavraInicial}</h2><textarea value={textoPreparacao} maxLength={200} onChange={(e) => setTextoPreparacao(e.target.value)} style={{ width: '100%', height: '300px', background: '#eee', color: '#000', border: '1px solid #555', padding:'10px', fontSize: '18px', fontFamily: 'monospace' }} /><button onClick={enviarTextoPreparacao} style={{ marginTop: '10px', padding: '15px', width: '100%', cursor: 'pointer', background: '#2563eb', color: 'white', border:'none', fontSize: '16px', fontWeight: 'bold' }}>ENVIAR</button></div></JanelaExterna>}
            </>
          ) : (<div style={{ textAlign: 'center', marginTop: '150px', color: '#aaa' }}><div style={{ fontSize: '60px', marginBottom: '20px' }}>📁</div><h2>RELATÓRIO ARQUIVADO</h2><p style={{ marginTop: '10px' }}>Aguardando outros agentes ({statusPreparacao.prontos}/{statusPreparacao.total})...</p></div>)}
        </div>
      );
    }

    if (fase === 'SABOTAGEM') {
      return (
        <div>
          <TopBar /><Timer />
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#888', fontSize: '12px' }}>RODADA {infoRodada.atual}/{infoRodada.total}</div>
          {meuPapel === 'DECIFRADOR' && (<div style={{ textAlign: 'center', marginTop: '100px', color: '#f87171' }}><h1 style={{ fontSize: '40px', border: '4px solid #f87171', display: 'inline-block', padding: '20px' }}>ACESSO NEGADO</h1><p>Você é o Decifrador. Aguarde.</p></div>)}
          {meuPapel === 'CIFRADOR' && (<div className="paper-sheet"><div className="folder-tab">ALERTA //</div><h3 style={{ color: '#b91c1c', marginTop: 0 }}>SEU TEXTO ESTÁ SOB ATAQUE:</h3><p style={{ fontSize: '20px', lineHeight: '1.5' }}>"{descricaoRecebida}"</p></div>)}
          {meuPapel === 'SABOTADOR' && (<><div style={{ textAlign: 'center', marginBottom: '20px' }}><div style={{fontSize:'12px', color:'#888'}}>ALVO</div><strong style={{ fontSize: '32px', color:'#fbbf24' }}>{dadosRodada?.palavra}</strong></div>{!sabotagemEnviada ? (<div className="paper-sheet"><div className="folder-tab">CENSURA //</div>{inputsSabotagem.map((v, i) => (<input key={i} placeholder={`PALAVRA PROIBIDA #${i + 1}`} value={v} onChange={(e) => atualizarInputSabotagem(i, e.target.value)} className="input-paper" />))}<button onClick={enviarSabotagem} className="btn-primary" style={{ background: '#b91c1c', border: 'none' }}>EXECUTAR CENSURA</button></div>) : (<div style={{ textAlign: 'center', marginTop: '100px', color: '#aaa' }}><h2>CENSURA APLICADA</h2><p>Aguardando processamento...</p></div>)}</>)}
        </div>
      );
    }

    if (fase === 'DECIFRANDO') {
      return (
        <div>
          <TopBar /><Timer /><div style={{ textAlign: 'center', marginBottom: '30px', color: '#fff' }}><h2>DECODIFICAÇÃO</h2></div>
          <div className="paper-sheet"><div style={{ position: 'absolute', top: '20px', right: '20px', border: '3px solid #b91c1c', padding: '5px 10px', fontSize: '14px', transform: 'rotate(-15deg)', opacity: 0.7, color: '#b91c1c', fontWeight: 'bold' }}>TOP SECRET</div><p style={{ fontSize: '22px', lineHeight: '1.8' }}>{textoCensurado.split(/(\[CENSURADO\])/g).map((parte, i) => parte === '[CENSURADO]' ? (<span key={i} style={{ background: '#111', color: 'transparent', padding: '0 8px', borderRadius: '4px' }}>████</span>) : (<span key={i}>{parte}</span>))}</p></div>
          {meuPapel === 'SABOTADOR' && (<div style={{ marginTop: '30px', textAlign: 'center' }}><p style={{ fontSize: '12px', color: '#888' }}>TENTATIVAS DA EQUIPE:</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>{palavrasSabotadasRodada.map((p, i) => (<span key={i} style={{ background: '#fef3c7', color: '#000', padding: '5px 10px', fontSize: '12px', borderRadius: '4px', fontWeight: 'bold' }}>{((souHost && configRecebida?.streamerMode) || modoStreamerLocal) ? '████' : p}</span>))}</div></div>)}
          {meuPapel === 'DECIFRADOR' ? (<div style={{ marginTop: '30px' }}><input placeholder="QUAL É A PALAVRA?" value={tentativaDecifrador} onChange={(e) => setTentativaDecifrador(e.target.value)} className="input-crt" autoFocus /><button onClick={enviarDecifracao} className="btn-primary">ENVIAR RESPOSTA</button></div>) : (<p style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>// AGUARDANDO ANÁLISE DO DECIFRADOR //</p>)}
        </div>
      );
    }

    if (fase === 'RESULTADO' && resultadoRodada) {
      return (
        <div style={{ textAlign: 'center' }}>
          <TopBar /><h1 style={{ color: resultadoRodada.acertou ? '#4ade80' : '#f87171', textShadow: '0 0 20px currentColor', fontSize: '32px', marginTop: '40px' }}>{resultadoRodada.acertou ? 'SUCESSO NA DECIFRAÇÃO' : 'FALHA NA DECIFRAÇÃO'}</h1>
          <div className="paper-sheet"><div className="folder-tab">RELATÓRIO //</div><p style={{fontSize:'14px', color:'#666', marginBottom:'5px'}}>A PALAVRA ERA:</p><strong style={{ color: '#b91c1c', fontSize: '36px', display:'block', marginBottom:'20px' }}>{resultadoRodada.palavraSecreta}</strong><p>O DECIFRADOR DISSE: <strong>{resultadoRodada.tentativa}</strong></p><hr style={{ borderColor: '#ddd', margin: '20px 0' }} /><ul style={{ textAlign: 'left', fontSize: '16px', listStyle:'none', padding:0 }}>{resultadoRodada.resumo.map((l, i) => (<li key={i} style={{ marginBottom: '10px', paddingBottom:'10px', borderBottom:'1px dashed #ccc' }}>{l}</li>))}</ul></div>
          {souHost ? (<button onClick={proximaRodada} className="btn-primary" style={{ width: 'auto', padding: '15px 40px'}}>PRÓXIMA RODADA ➡️</button>) : (<p style={{ color: '#aaa' }}>AGUARDANDO O DIRETOR...</p>)}
        </div>
      );
    }

    if (fase === 'FIM') {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '60px', color: '#fff', marginBottom: '40px' }}>MISSÃO CUMPRIDA</h1>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '30px', maxWidth: '500px', margin: '0 auto', borderRadius: '10px' }}>{jogadores.map((j, i) => (<div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '15px 0', color: '#fff', fontSize: '20px' }}><span>#{i + 1} {j.nome}</span><span>{j.pontos} PTS</span></div>))}</div>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '40px', width: 'auto' }}>NOVA MISSÃO</button>
        </div>
      );
    }

    return <div style={{ color: 'red' }}>ERRO DE FASE: {fase}</div>;
  };

  return (
    <div className="app-wrapper">
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
      
      {menuBan.visivel && <div style={{position:'fixed', backgroundColor:'#111', color:'#ef4444', border:'1px solid #ef4444', padding:'15px', zIndex:99999, cursor:'pointer', top:menuBan.y, left:menuBan.x}} onClick={confirmarBan}>BANIR AGENTE<br/>{menuBan.jogadorNome}</div>}
      
      <RulesWidget />
      {entrou && fase !== 'LOBBY' && fase !== 'FIM' && <SidebarJogadores />}
      <SystemLogs />
      
      <div className="content-container">
        {renderContent()}
      </div>
      <AvisoToast />
    </div>
  );
}

export default App;