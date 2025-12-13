import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import logoImage from './assets/logo.png'; 

// 🟣 SEU CLIENT ID
const TWITCH_CLIENT_ID = 'hoevm6fscw93d5c01d7ermgu6nbhk7'; 

const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : '/');

// --- COMPONENTE POP-UP ---
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
  // --- ESTILOS (MOVIDOS PARA O TOPO PARA EVITAR ERROS) ---
  const mainWrapper = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', fontFamily: "'Courier New', Courier, monospace", color: '#e5e5e5', boxSizing: 'border-box', padding: '20px' };
  const inputStyle = { padding: '15px', margin: '10px 0', fontSize: '18px', color: '#1a1a1a', backgroundColor: '#f8f8f8', border: '2px solid #333', width: '100%', fontFamily: "'Courier New', Courier, monospace", fontWeight: 'bold', boxSizing: 'border-box' };
  const btnStyle = { padding: '20px', background: '#333', color: 'white', border: 'none', marginTop: '10px', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', width: '100%', textTransform: 'uppercase' };
  const paperStyle = { backgroundColor: '#f4e4bc', padding: '40px', boxShadow: '5px 5px 15px rgba(0,0,0,0.5)', maxWidth: '800px', width: '100%', margin: '30px auto', border: '1px solid #cfb997', color: 'black', fontSize: '22px', transform: 'rotate(-1deg)' };
  const agentCardStyle = { backgroundColor: '#fff', color: '#333', padding: '15px', width: '180px', height: '240px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #ccc', position: 'relative' };
  
  // --- LÓGICA DO POP-UP DE LOGIN ---
  useEffect(() => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token') && window.opener) {
          window.opener.postMessage({ type: 'TWITCH_LOGIN_SUCCESS', hash: hash }, window.location.origin);
          window.close();
      }
  }, []);

  // --- ESTADOS ---
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

  // --- RENDERIZAÇÃO DA INTERFACE ---
  const commonRender = (content) => ( <> {aviso&&<div style={{position:'fixed',top:0,left:0,width:'100%',background:aviso.tipo==='perigo'?'#b91c1c':'#15803d',color:'white',padding:'15px',textAlign:'center',zIndex:9999}}>{aviso.msg}</div>} <div style={{position:'fixed',bottom:20,left:20}}>{logsSistema.map(l=><div key={l.id} style={{background:'rgba(0,0,0,0.8)',color:'white',padding:'10px',marginBottom:'5px',borderLeft:'3px solid #eab308'}}>{l.msg}</div>)}</div> {entrou && <button onClick={sairDaSala} style={{position:'fixed',top:20,left:20,background:'transparent',color:'red',border:'2px solid red',padding:'10px'}}>SAIR</button>} {menuBan.visivel && <div style={{position:'fixed',top:menuBan.y,left:menuBan.x,background:'black',color:'red',padding:'10px',cursor:'pointer',zIndex:99999}} onClick={confirmarBan}>BANIR {menuBan.jogadorNome}</div>} {entrou && fase!=='LOBBY' && fase!=='FIM' && <div style={{position:'fixed',top:'50%',left:20,transform:'translateY(-50%)',width:80,background:'#111',padding:10}}>{jogadores.map(j=><div key={j.id} onContextMenu={e=>handleContextMenuJogador(e,j)} title={j.nome} style={{marginBottom:10,width:50,height:50,borderRadius:'50%',overflow:'hidden',border:j.id===socket.id?'2px solid orange':'2px solid #333'}}>{j.foto?<img src={j.foto} style={{width:'100%',height:'100%'}}/>:<span style={{fontSize:30}}>🕵️‍♂️</span>}</div>)}</div>} {content} </> );

  if (!entrou) {
    return (
      <div style={mainWrapper}>
        <img src={logoImage} style={{ width: '100%', maxWidth: 500 }} alt="Logo" />
        <div style={{ background: '#f4e4bc', padding: 40, color: '#333', maxWidth: 500, width: '100%', boxSizing: 'border-box', boxShadow: '10px 10px 0 rgba(0,0,0,0.5)', position: 'relative' }}>
          
          {/* Botão de Reconectar */}
          {sessaoSalva && modoLogin === 'MENU' && (
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px dashed #333' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>// SESSÃO ANTERIOR DETECTADA //</p>
              <button onClick={acaoReconectar} style={{ ...btnStyle, background: '#d97706', border: '2px dashed #000', color: 'black' }}>
                VOLTAR PARA {sessaoSalva.roomId}
              </button>
            </div>
          )}

          {/* Menu Principal */}
          {modoLogin === 'MENU' && (
            <div style={{ marginTop: 20 }}>
              <button onClick={() => setModoLogin('CRIAR')} style={btnStyle}>INICIAR NOVA OPERAÇÃO</button>
              <button onClick={() => setModoLogin('ENTRAR')} style={{ ...btnStyle, background: '#57534e' }}>ACESSAR OPERAÇÃO EXISTENTE</button>
            </div>
          )}

          {/* Tela Criar */}
          {modoLogin === 'CRIAR' && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ textAlign: 'center' }}>// CONFIGURAÇÃO DA MISSÃO //</h3>
              <input placeholder="CODINOME (Seu Nome)" onChange={e => setNome(e.target.value)} style={inputStyle} disabled={configSala.twitchAuth} value={configSala.twitchAuth ? "(Login via Twitch)" : nome} />
              
              <input placeholder={configSala.twitchAuth ? "🔒 AUTENTICAÇÃO TWITCH ATIVA" : "DEFINIR SENHA DE ACESSO"} type="text" disabled={configSala.twitchAuth} onChange={e => setSenha(e.target.value)} value={configSala.twitchAuth ? "" : senha} style={{ ...inputStyle, opacity: configSala.twitchAuth ? 0.6 : 1, cursor: configSala.twitchAuth ? 'not-allowed' : 'text' }} />
              
              <div style={{ background: '#e8dcb5', padding: '15px', border: '2px solid #333', margin: '10px 0', textAlign: 'left' }}>
                <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #333' }}>⚙️ AJUSTES</h4>
                <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={configSala.twitchAuth} onChange={e => setConfigSala({...configSala, twitchAuth: e.target.checked})} style={{ marginRight: '10px' }} />
                  <span style={{ color: '#9146FF' }}>👾 Usar Autenticação Twitch</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', margin: '5px 0', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={configSala.streamerMode} onChange={e => setConfigSala({...configSala, streamerMode: e.target.checked})} style={{ marginRight: '10px' }} />
                  Modo Streamer
                </label>
              </div>

              <button onClick={acaoCriarSala} style={{ ...btnStyle, background: configSala.twitchAuth ? '#9146FF' : '#b91c1c' }}>
                {configSala.twitchAuth ? "LOGAR COM TWITCH & CRIAR" : "CRIAR SALA"}
              </button>
              <button onClick={() => { setModoLogin('MENU'); setErroLogin(''); }} style={{ ...btnStyle, background: 'transparent', color: '#333', border: '2px solid #333' }}>CANCELAR</button>
            </div>
          )}

          {/* Tela Entrar */}
          {modoLogin === 'ENTRAR' && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ textAlign: 'center' }}>// LOGIN DE AGENTE //</h3>
              <input placeholder="CÓDIGO DA OPERAÇÃO (ID)" value={sala} onChange={e => setSala(e.target.value.toUpperCase())} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              
              {salaEhTwitch ? (
                <div style={{ margin: '15px 0' }}>
                  <p style={{ color: '#9146FF', fontWeight: 'bold', textAlign: 'center', marginBottom: '10px' }}>👾 SALA REQUER AUTENTICAÇÃO TWITCH</p>
                  <button onClick={acaoEntrarSala} style={{ ...btnStyle, background: '#9146FF' }}>LOGAR COM TWITCH & ENTRAR</button>
                </div>
              ) : (
                <>
                  <input placeholder="CODINOME" onChange={e => setNome(e.target.value)} style={inputStyle} />
                  <input placeholder="SENHA DE ACESSO" type="text" onChange={e => setSenha(e.target.value)} style={inputStyle} />
                  <button onClick={acaoEntrarSala} style={{ ...btnStyle, background: '#15803d' }}>ACESSAR</button>
                </>
              )}
              
              <button onClick={() => { setModoLogin('MENU'); setErroLogin(''); }} style={{ ...btnStyle, background: 'transparent', color: '#333', border: '2px solid #333' }}>CANCELAR</button>
            </div>
          )}

          {erroLogin && <p style={{ color: '#b91c1c', fontWeight: 'bold', textAlign: 'center', marginTop: 10 }}>{erroLogin}</p>}
        </div>
      </div>
    );
  }

  // --- RENDERS DAS FASES ---
  if (fase === 'LOBBY') {
      return commonRender(
          <div style={mainWrapper}>
              <div style={{textAlign:'center'}}>
                  <img src={logoImage} style={{width:300}} alt="Logo"/>
                  <h2>CÓDIGO: {sala}</h2>
                  <button onClick={copiarLinkConvite} style={{background:'orange',border:'none',padding:10,cursor:'pointer', fontWeight:'bold'}}>
                      {linkCopiado ? "COPIADO! ✅" : "🔗 LINK CONVITE"}
                  </button>
                  {configRecebida && (
                    <div style={{marginTop:10}}>
                      {configRecebida.twitchAuth && <span title="Twitch Auth">👾 </span>}
                      {configRecebida.streamerMode && <span title="Streamer Mode">🎥</span>}
                    </div>
                  )}
              </div>
              
              <div style={{display:'flex',flexWrap:'wrap',gap:20,justifyContent:'center',marginTop:40}}>
                  {jogadores.map(j => (
                      <div key={j.id} onContextMenu={e=>handleContextMenuJogador(e,j)} style={agentCardStyle}>
                          <div style={{width:70,height:70,borderRadius:'50%',overflow:'hidden',marginBottom:10, border: j.isHost ? '3px solid red' : '3px solid #333'}}>
                              {j.foto ? <img src={j.foto} style={{width:'100%',height:'100%'}}/> : <span>🕵️‍♂️</span>}
                          </div>
                          <strong>{j.nome}</strong>
                          <p>SCORE: {j.pontos}</p>
                          {j.isHost && <span style={{color:'red',fontSize:12,fontWeight:'bold'}}>DIRETOR</span>}
                      </div>
                  ))}
              </div>
              
              {souHost ? (
                  <button onClick={iniciarJogo} style={{...btnStyle, marginTop:50, border:'2px solid white'}}>INICIAR MISSÃO</button>
              ) : (
                  <p style={{marginTop:30, color:'orange'}}>AGUARDANDO COMANDANTE INICIAR...</p>
              )}
          </div>
      );
  }

  if (fase === 'PREPARACAO') return commonRender(<div style={mainWrapper}><TimerDisplay/>{!jaEnvieiPreparacao ? <><div style={{background:'black',color:'lime',padding:20,marginBottom:20}}>PALAVRA: {minhaPalavraInicial}</div><div style={paperStyle}><textarea rows={8} style={{width:'100%',background:'transparent',border:'none',fontSize:20}} value={textoPreparacao} onChange={e=>setTextoPreparacao(e.target.value)} placeholder="Descreva..."/></div><button onClick={enviarTextoPreparacao} style={btnStyle}>ENVIAR</button></> : <h2>AGUARDANDO...</h2>}</div>);
  if (fase === 'SABOTAGEM') return commonRender(<div style={{...mainWrapper,background:'#444'}}><TimerDisplay/>{meuPapel==='CIFRADOR'&&<div style={paperStyle}>SEU TEXTO ESTÁ SENDO ATACADO!</div>}{meuPapel==='SABOTADOR'&&<>{!sabotagemEnviada?<><h2 style={{color:'orange'}}>SABOTE O TEXTO (PALAVRA: {dadosRodada.palavra})</h2>{inputsSabotagem.map((v,i)=><input key={i} value={v} onChange={e=>atualizarInputSabotagem(i,e.target.value)} placeholder="Palavra proibida" style={{display:'block',margin:'5px auto',padding:10}}/>)}<button onClick={enviarSabotagem} style={btnStyle}>SABOTAR</button></>:<h2>SABOTAGEM ENVIADA</h2>}</>}{meuPapel==='DECIFRADOR'&&<h1 style={{color:'red'}}>ACESSO NEGADO (DECIFRADOR)</h1>}</div>);
  if (fase === 'DECIFRANDO') return commonRender(<div style={{...mainWrapper,background:'#223'}}><TimerDisplay/><div style={paperStyle}>{textoCensurado}</div>{meuPapel==='DECIFRADOR'?<><input value={tentativaDecifrador} onChange={e=>setTentativaDecifrador(e.target.value)} style={inputStyle} placeholder="QUAL É A PALAVRA?"/><button onClick={enviarDecifracao} style={btnStyle}>CHUTAR</button></>:<h2>AGUARDANDO DECIFRADOR...</h2>}</div>);
  if (fase === 'RESULTADO' && resultadoRodada) return commonRender(<div style={{...mainWrapper,background:'black'}}><h1 style={{color:resultadoRodada.acertou?'lime':'red'}}>{resultadoRodada.acertou?'ACERTOU!':'ERROU!'}</h1><h2>Era: {resultadoRodada.palavraSecreta}</h2><ul>{resultadoRodada.resumo.map((l,i)=><li key={i}>{l}</li>)}</ul>{souHost&&<button onClick={proximaRodada} style={btnStyle}>PRÓXIMA</button>}</div>);
  if (fase === 'FIM') return commonRender(<div style={{...mainWrapper,background:'black',color:'lime'}}><h1>FIM DE JOGO</h1>{jogadores.map((j,i)=><div key={j.id}>{i+1}. {j.nome} - {j.pontos}</div>)}<button onClick={sairDaSala} style={btnStyle}>SAIR</button></div>);

  return (
      <div style={{...mainWrapper, color: '#f87171'}}>
          <h1>⚠️ ERRO DE ESTADO ⚠️</h1>
          <p>O sistema perdeu a fase. Tente resetar.</p>
          <p>STATUS: Entrou = {entrou ? "SIM" : "NÃO"}</p>
          <p>FASE ATUAL: "{fase}"</p>
          <button onClick={() => { localStorage.removeItem('censorizador_session'); window.location.reload(); }} style={btnStyle}>
              RESETAR SISTEMA (F5)
          </button>
      </div>
  );
}

export default App;