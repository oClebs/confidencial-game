const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// IMPORTAÇÃO SEGURA
const { PALAVRAS } = require('./palavras');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const salas = {};

// --- FUNÇÕES UTILITÁRIAS ---

function embaralhar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function gerarIdSala() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function gerarTokenSeguro() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

// Regex que ignora acentos e cedilha
function gerarRegexFlexivel(texto) {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const base = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const mapa = {
        'a': '[aáàãâä]', 'e': '[eéèêë]', 'i': '[iíìîï]',
        'o': '[oóòõôö]', 'u': '[uúùûü]', 'c': '[cç]', 'n': '[nñ]'
    };

    let pattern = "";
    for (let char of base) {
        pattern += mapa[char] || escapeRegex(char);
    }
    pattern += "(es|s)?"; // Plural opcional

    return new RegExp(pattern, 'gi');
}

function iniciarTimer(nomeSala, duracaoSegundos, callbackTimeout) {
  const sala = salas[nomeSala];
  if (!sala) return;

  if (sala.timer) clearTimeout(sala.timer);
  
  sala.timestampFim = Date.now() + (duracaoSegundos * 1000);

  io.to(nomeSala).emit('sincronizar_tempo', { 
      segundosRestantes: duracaoSegundos 
  });

  sala.timer = setTimeout(() => {
      sala.timestampFim = null; 
      callbackTimeout();
  }, duracaoSegundos * 1000);
}

// --- SOCKET IO ---

io.on('connection', (socket) => {
  console.log(`👤 Conectado: ${socket.id}`);

  socket.on('verificar_sala', (roomId) => {
    const id = roomId ? roomId.toUpperCase() : '';
    if (!salas[id]) {
      socket.emit('sessao_invalida');
    }
  });

  // 🔥 ATUALIZADO: Recebe twitchData e salva a foto
  socket.on('criar_sala', ({ nomeJogador, senha, config, twitchData }) => {
    const novoId = gerarIdSala();
    const tokenSeguro = gerarTokenSeguro(); 
    
    const configuracoes = {
        twitchAuth: config?.twitchAuth || false,
        streamerMode: config?.streamerMode || false,
        numCiclos: parseInt(config?.numCiclos) || 1, 
        tempos: {
            preparacao: parseInt(config?.tempos?.preparacao) || 120, 
            sabotagem: parseInt(config?.tempos?.sabotagem) || 30,   
            decifracao: parseInt(config?.tempos?.decifracao) || 45  
        }
    };

    salas[novoId] = { 
      id: novoId,
      senha: senha,
      config: configuracoes, 
      hostName: nomeJogador, 
      hostToken: tokenSeguro, 
      jogadores: [], 
      fase: 'LOBBY', 
      indiceRodadaAtual: 0, 
      sabotagens: {},
      timer: null,
      destructionTimer: null,
      palavrasUsadas: new Set(),
      timestampFim: null
    };

    socket.join(novoId);

    salas[novoId].jogadores.push({ 
      id: socket.id, 
      nome: nomeJogador, 
      pontos: 0, 
      papel: null, 
      isHost: true,
      minhaPalavra: null,
      meuTexto: null,
      pronto: false,
      foto: twitchData ? twitchData.foto : null // <--- SALVA A FOTO AQUI
    });

    socket.emit('sala_criada_sucesso', { 
      roomId: novoId, 
      jogadores: salas[novoId].jogadores,
      userToken: tokenSeguro,
      config: configuracoes 
    });
    
    console.log(`🏠 Sala criada: ${novoId} por ${nomeJogador}`);
  });

  socket.on('entrar_sala', ({ roomId, senha, nomeJogador, token }) => {
    const idMaiusculo = roomId.toUpperCase(); 

    if (!salas[idMaiusculo]) {
      socket.emit('erro_login', 'Sala não encontrada!');
      socket.emit('sessao_invalida'); 
      return;
    }

    const sala = salas[idMaiusculo];

    if (!sala.config.twitchAuth) {
        if (sala.senha !== senha) {
            socket.emit('erro_login', 'Senha incorreta!');
            return;
        }
    }

    let isReturningHost = false;

    if (nomeJogador === sala.hostName) {
        if (token === sala.hostToken) {
            if (sala.destructionTimer) {
                console.log(`♻️ Host ${nomeJogador} voltou com crachá válido! Cancelando destruição.`);
                clearTimeout(sala.destructionTimer);
                sala.destructionTimer = null;
                isReturningHost = true;
                io.to(idMaiusculo).emit('aviso_sala', { tipo: 'sucesso', msg: 'O Host reconectou com segurança!' });
            }
        } else {
            socket.emit('erro_login', 'ERRO: Esse nome pertence ao Host e seu token é inválido.');
            return;
        }
    } else {
        const nomeExiste = sala.jogadores.some(p => p.nome === nomeJogador);
        if (nomeExiste) {
            socket.emit('erro_login', 'Esse nome já está em uso na sala!');
            return;
        }
    }

    socket.join(idMaiusculo);
    
    const novoJogador = { 
      id: socket.id, 
      nome: nomeJogador, 
      pontos: 0, 
      papel: 'SABOTADOR',
      isHost: isReturningHost || (sala.jogadores.length === 0 && token === sala.hostToken), 
      minhaPalavra: null,
      meuTexto: null,
      pronto: false,
      foto: null // Padrão sem foto para convidados (por enquanto)
    };

    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') {
        novoJogador.pronto = true; 
        novoJogador.minhaPalavra = "AGENTE_NOVO"; 
    }

    sala.jogadores.push(novoJogador);

    socket.emit('entrada_sucesso', { 
      roomId: idMaiusculo, 
      jogadores: sala.jogadores,
      fase: sala.fase,
      config: sala.config
    });

    io.to(idMaiusculo).emit('atualizar_sala', sala.jogadores);
    io.to(idMaiusculo).emit('log_evento', { msg: `🟢 ${nomeJogador} conectou-se.`, tipo: 'info' });

    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') {
        const totalR = sala.jogadores.length * sala.config.numCiclos;
        
        if (sala.fase === 'PREPARACAO') {
             socket.emit('inicio_preparacao', { palavra: null, fase: 'PREPARACAO' });
             const prontosCount = sala.jogadores.filter(j => j.pronto).length;
             socket.emit('status_preparacao', { prontos: prontosCount, total: sala.jogadores.length });
        }
        
        if (sala.fase === 'SABOTAGEM' || sala.fase === 'DECIFRANDO') {
            const index = sala.indiceRodadaAtual;
            const cifrador = sala.jogadores[index % sala.jogadores.length];
            const decifrador = sala.jogadores[(index + 1) % sala.jogadores.length];
            
            const resumoPapeis = {
                cifrador: cifrador.nome,
                decifrador: decifrador.nome,
                sabotadores: sala.jogadores
                    .filter(j => j.id !== cifrador.id && j.id !== decifrador.id)
                    .map(j => j.nome)
            };

            socket.emit('nova_rodada', {
                fase: 'SABOTAGEM',
                rodadaAtual: sala.indiceRodadaAtual + 1,
                totalRodadas: totalR,
                meuPapel: 'SABOTADOR',
                palavraRevelada: sala.dadosRodada?.palavra,
                descricao: null,
                protagonistas: resumoPapeis
            });

            if (sala.fase === 'DECIFRANDO') {
                socket.emit('fase_decifrar', { 
                    textoCensurado: sala.dadosRodada.textoCensurado,
                    palavrasEfetivas: [] 
                });
            }
        }

        if (sala.timestampFim) {
            const agoraServidor = Date.now();
            const segundosQueFaltam = Math.ceil((sala.timestampFim - agoraServidor) / 1000);
            if (segundosQueFaltam > 0) {
                socket.emit('sincronizar_tempo', { segundosRestantes: segundosQueFaltam });
            }
        }
    }
  });
  
  socket.on('banir_jogador', ({ roomId, targetId }) => {
      const sala = salas[roomId];
      if (!sala) return;

      const solicitante = sala.jogadores.find(j => j.id === socket.id);
      
      if (solicitante && solicitante.isHost) {
          const alvoIndex = sala.jogadores.findIndex(j => j.id === targetId);
          if (alvoIndex !== -1) {
              const alvo = sala.jogadores[alvoIndex];
              console.log(`🔨 BAN: ${solicitante.nome} baniu ${alvo.nome} da sala ${roomId}`);
              sala.jogadores.splice(alvoIndex, 1);
              io.to(targetId).emit('banido_da_sala', 'Você foi removido da operação pelo Comandante.');
              const socketAlvo = io.sockets.sockets.get(targetId);
              if (socketAlvo) { socketAlvo.leave(roomId); }
              io.to(roomId).emit('atualizar_sala', sala.jogadores);
              io.to(roomId).emit('log_evento', { msg: `⛔ AGENTE ${alvo.nome} FOI BANIDO.`, tipo: 'ban' });
          }
      }
  });

  socket.on('iniciar_jogo', (nomeSala) => {
    const sala = salas[nomeSala];
    if (!sala || sala.jogadores.length < 3) return;

    let disponiveis = PALAVRAS.filter(p => !sala.palavrasUsadas.has(p));

    if (disponiveis.length < sala.jogadores.length) {
        sala.palavrasUsadas.clear(); 
        disponiveis = [...PALAVRAS]; 
        io.to(nomeSala).emit('log_evento', { msg: `♻️ Banco de palavras esgotado. Reciclando!`, tipo: 'info' });
    }

    const sorteadas = embaralhar(disponiveis);

    sala.jogadores.forEach((j, index) => {
      const palavra = sorteadas[index];
      j.minhaPalavra = palavra;
      sala.palavrasUsadas.add(palavra);
      j.meuTexto = null; j.pronto = false; j.pontos = 0;
    });

    sala.fase = 'PREPARACAO';
    sala.jogadores.forEach(jogador => { io.to(jogador.id).emit('inicio_preparacao', { palavra: jogador.minhaPalavra, fase: 'PREPARACAO' }); });
    
    iniciarTimer(nomeSala, sala.config.tempos.preparacao, () => {
      if (!salas[nomeSala]) return;
      sala.jogadores.forEach(j => { if (!j.pronto) { j.meuTexto = "Não consegui escrever a tempo."; j.pronto = true; }});
      sala.indiceRodadaAtual = 0; iniciarRodadaDeJogo(nomeSala);
    });
  });

  socket.on('enviar_preparacao', ({ nomeSala, texto }) => {
    const sala = salas[nomeSala]; if (!sala) return;
    const jogador = sala.jogadores.find(j => j.id === socket.id);
    if (jogador) { jogador.meuTexto = texto; jogador.pronto = true; }
    const todosProntos = sala.jogadores.every(j => j.pronto);
    if (todosProntos) { if (sala.timer) clearTimeout(sala.timer); sala.indiceRodadaAtual = 0; iniciarRodadaDeJogo(nomeSala); } 
    else { const prontosCount = sala.jogadores.filter(j => j.pronto).length; io.to(nomeSala).emit('status_preparacao', { prontos: prontosCount, total: sala.jogadores.length }); }
  });

  socket.on('proxima_rodada', (nomeSala) => {
    const sala = salas[nomeSala]; if (!sala) return;
    sala.indiceRodadaAtual++;
    const totalRodadasNecessarias = sala.jogadores.length * sala.config.numCiclos;

    if (sala.indiceRodadaAtual >= totalRodadasNecessarias) { 
        sala.fase = 'FIM'; 
        io.to(nomeSala).emit('fim_de_jogo', { ranking: sala.jogadores.sort((a, b) => b.pontos - a.pontos) }); 
    } else { 
        iniciarRodadaDeJogo(nomeSala); 
    }
  });

  function iniciarRodadaDeJogo(nomeSala) {
    const sala = salas[nomeSala]; if (!sala) return;
    const totalJogadores = sala.jogadores.length; const index = sala.indiceRodadaAtual;
    
    if (totalJogadores === 0) return;

    const cifradorDaVez = sala.jogadores[index % totalJogadores]; 
    const indexDecifrador = (index + 1) % totalJogadores; 
    const decifradorDaVez = sala.jogadores[indexDecifrador];
    
    sala.jogadores.forEach(j => { 
        if (j.id === cifradorDaVez.id) j.papel = 'CIFRADOR'; 
        else if (j.id === decifradorDaVez.id) j.papel = 'DECIFRADOR'; 
        else j.papel = 'SABOTADOR'; 
    });
    
    let textoBase = cifradorDaVez.meuTexto || "TEXTO PERDIDO"; 
    const palavraProibida = cifradorDaVez.minhaPalavra || "???"; 
    
    const regexAuto = gerarRegexFlexivel(palavraProibida);
    if (regexAuto.test(textoBase)) { textoBase = textoBase.replace(regexAuto, '[CENSURADO]'); }
    
    sala.dadosRodada = { palavra: palavraProibida, descricao: textoBase }; 
    sala.sabotagens = {}; 
    sala.fase = 'SABOTAGEM';
    
    iniciarTimer(nomeSala, sala.config.tempos.sabotagem, () => { finalizeFaseSabotagem(nomeSala); });
    
    const totalR = sala.jogadores.length * sala.config.numCiclos;

    const resumoPapeis = {
        cifrador: cifradorDaVez.nome,
        decifrador: decifradorDaVez.nome,
        sabotadores: sala.jogadores
            .filter(j => j.id !== cifradorDaVez.id && j.id !== decifradorDaVez.id)
            .map(j => j.nome)
    };

    sala.jogadores.forEach(jogador => { 
      let payload = { 
          fase: 'SABOTAGEM', 
          rodadaAtual: index + 1, 
          totalRodadas: totalR, 
          meuPapel: jogador.papel,
          protagonistas: resumoPapeis
      };

      if (jogador.papel === 'CIFRADOR') { payload.descricao = sala.dadosRodada.descricao; payload.palavraRevelada = sala.dadosRodada.palavra; } 
      else if (jogador.papel === 'SABOTADOR') { payload.palavraRevelada = sala.dadosRodada.palavra; payload.descricao = null; } 
      else { payload.descricao = null; payload.palavraRevelada = null; }
      
      io.to(jogador.id).emit('nova_rodada', payload); 
    });
  }

  socket.on('sabotador_envia', ({ nomeSala, previsoes }) => {
    const sala = salas[nomeSala]; if (!sala) return;
    sala.sabotagens[socket.id] = previsoes;
    const totalSabotadores = sala.jogadores.filter(j => j.papel === 'SABOTADOR').length; const totalEnviados = Object.keys(sala.sabotagens).length;
    if (totalEnviados >= totalSabotadores) { if (sala.timer) clearTimeout(sala.timer); finalizeFaseSabotagem(nomeSala); }
  });

  function finalizeFaseSabotagem(nomeSala) {
    const sala = salas[nomeSala]; if (!sala) return;
    let textoCensurado = sala.dadosRodada.descricao; 
    const todasPalavras = Object.values(sala.sabotagens).flat();
    
    const palavrasEfetivas = todasPalavras.filter(p => p && p.trim().length > 0);

    palavrasEfetivas.forEach(palavra => { 
        const regex = gerarRegexFlexivel(palavra);
        textoCensurado = textoCensurado.replace(regex, '[CENSURADO]'); 
    });

    sala.fase = 'DECIFRANDO'; 
    sala.dadosRodada.textoCensurado = textoCensurado;
    
    iniciarTimer(nomeSala, sala.config.tempos.decifracao, () => { calcularPontuacaoEFinalizarRodada(nomeSala, null); });
    
    io.to(nomeSala).emit('fase_decifrar', { 
        textoCensurado: textoCensurado, 
        palavrasEfetivas: palavrasEfetivas,
        segundosRestantes: sala.config.tempos.decifracao 
    });
  }

  socket.on('decifrador_chuta', ({ nomeSala, tentativa }) => { const sala = salas[nomeSala]; if (sala && sala.timer) clearTimeout(sala.timer); calcularPontuacaoEFinalizarRodada(nomeSala, tentativa); });

  function calcularPontuacaoEFinalizarRodada(nomeSala, tentativa) {
    const sala = salas[nomeSala]; if (!sala) return;
    
    const palavraSecretaNorm = sala.dadosRodada.palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const tentativaNorm = (tentativa || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    const acertou = tentativaNorm === palavraSecretaNorm;
    
    let resumoPontos = []; 
    const cifrador = sala.jogadores.find(j => j.papel === 'CIFRADOR'); 
    const decifrador = sala.jogadores.find(j => j.papel === 'DECIFRADOR');
    
    if(decifrador) {
        if (acertou) { decifrador.pontos += 4; if(cifrador) cifrador.pontos += 4; resumoPontos.push(`${decifrador.nome} (Decifrador) acertou! +4 pts`); } 
        else { resumoPontos.push(`${decifrador.nome} errou. (Era: ${sala.dadosRodada.palavra.toUpperCase()})`); }
    }

    const textoOriginal = sala.dadosRodada.descricao; 
    const mapaSabotagem = {}; 
    
    for (const [idSabotador, palavras] of Object.entries(sala.sabotagens)) { 
        palavras.forEach(p => { 
            const palavraLimpa = p.trim();
            if (!palavraLimpa) return;

            const regex = gerarRegexFlexivel(palavraLimpa);

            if (regex.test(textoOriginal)) { 
                const chave = palavraLimpa.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                if (!mapaSabotagem[chave]) mapaSabotagem[chave] = []; 
                mapaSabotagem[chave].push(idSabotador); 
            } 
        }); 
    }

    for (const [palavra, sabotadoresIds] of Object.entries(mapaSabotagem)) { const ehUnica = sabotadoresIds.length === 1; const pontosGanhos = ehUnica ? 2 : 1; sabotadoresIds.forEach(id => { const sabotador = sala.jogadores.find(j => j.id === id); if (sabotador) sabotador.pontos += pontosGanhos; }); resumoPontos.push(`Palavra "${palavra}" (ou variação) sabotada! (${pontosGanhos} pts p/ sabotadores)`); }
    io.to(nomeSala).emit('resultado_rodada', { acertou, palavraSecreta: sala.dadosRodada.palavra.toUpperCase(), tentativa: tentativa || "Tempo esgotado", resumo: resumoPontos, ranking: sala.jogadores.sort((a, b) => b.pontos - a.pontos) });
  }

  socket.on('disconnect', () => {
    for (const roomId in salas) {
      const sala = salas[roomId];
      const jogadorIndex = sala.jogadores.findIndex(p => p.id === socket.id);
      if (jogadorIndex !== -1) {
        const jogador = sala.jogadores[jogadorIndex];
        io.to(roomId).emit('log_evento', { msg: `🔴 ${jogador.nome} perdeu sinal.`, tipo: 'saida' });

        if (jogador.isHost) {
          console.log(`⚠️ Host ${jogador.nome} caiu! Iniciando contagem de 60s...`);
          sala.jogadores.splice(jogadorIndex, 1); io.to(roomId).emit('atualizar_sala', sala.jogadores);
          io.to(roomId).emit('aviso_sala', { tipo: 'perigo', msg: `⚠ O HOST CAIU! A sala fecha em 60s se ele não voltar.` });
          sala.destructionTimer = setTimeout(() => {
            console.log(`❌ Tempo esgotado para sala ${roomId}. Encerrando.`);
            io.to(roomId).emit('sala_encerrada', 'O Host não voltou a tempo. Fim de jogo.');
            if (sala.timer) clearTimeout(sala.timer);
            delete salas[roomId];
          }, 60000);
        } else {
          console.log(`👋 Jogador ${jogador.nome} saiu.`);
          sala.jogadores.splice(jogadorIndex, 1); io.to(roomId).emit('atualizar_sala', sala.jogadores);
        }
        break;
      }
    }
  });
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Pronto na porta ${PORT}`);
});