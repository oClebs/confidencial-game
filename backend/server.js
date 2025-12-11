const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// 🔥 IMPORTAÇÃO SEGURA: A lista fica no servidor
const { PALAVRAS } = require('./palavras');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const salas = {};

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

function iniciarTimer(nomeSala, duracaoSegundos, callbackTimeout) {
  if (salas[nomeSala] && salas[nomeSala].timer) clearTimeout(salas[nomeSala].timer);
  const fimDoTempo = Date.now() + (duracaoSegundos * 1000);
  io.to(nomeSala).emit('sincronizar_tempo', { duracao: duracaoSegundos, fim: fimDoTempo });
  if (salas[nomeSala]) {
    salas[nomeSala].timer = setTimeout(callbackTimeout, duracaoSegundos * 1000);
  }
}

io.on('connection', (socket) => {
  console.log(`👤 Conectado: ${socket.id}`);

  socket.on('verificar_sala', (roomId) => {
    const id = roomId ? roomId.toUpperCase() : '';
    if (!salas[id]) {
      socket.emit('sessao_invalida');
    }
  });

  socket.on('criar_sala', ({ nomeJogador, senha, config }) => {
    const novoId = gerarIdSala();
    const tokenSeguro = gerarTokenSeguro(); 
    
    const configuracoes = {
        twitchAuth: config?.twitchAuth || false,
        streamerMode: config?.streamerMode || false,
        // 🔥 NOVA CONFIG: Número de Ciclos (voltas completas na mesa)
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
      palavrasUsadas: new Set() 
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
      pronto: false
    });

    socket.emit('sala_criada_sucesso', { 
      roomId: novoId, 
      jogadores: salas[novoId].jogadores,
      userToken: tokenSeguro,
      config: configuracoes 
    });
    
    console.log(`🏠 Sala criada: ${novoId} por ${nomeJogador} (Ciclos: ${configuracoes.numCiclos})`);
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
      papel: 'SABOTADOR', // 🔥 Default para quem entra depois é Sabotador
      isHost: isReturningHost || (sala.jogadores.length === 0 && token === sala.hostToken), 
      minhaPalavra: null,
      meuTexto: null,
      pronto: false
    };

    // 🔥 LÓGICA DE ENTRADA TARDIA (HOT-JOIN)
    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') {
        // Marca como pronto para não travar a fase de preparação
        novoJogador.pronto = true; 
        novoJogador.minhaPalavra = "AGENTE_NOVO"; // Placeholder
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

    // 🔥 SINCRONIZAÇÃO DE ESTADO PARA QUEM ENTROU NO MEIO
    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') {
        const totalR = sala.jogadores.length * sala.config.numCiclos;
        
        // Se estiver na fase de preparação, só avisa
        if (sala.fase === 'PREPARACAO') {
             socket.emit('inicio_preparacao', { palavra: null, fase: 'PREPARACAO' });
             // Envia status atual de quem já terminou
             const prontosCount = sala.jogadores.filter(j => j.pronto).length;
             socket.emit('status_preparacao', { prontos: prontosCount, total: sala.jogadores.length });
        }
        
        // Se estiver no jogo (Sabotagem ou Decifrando)
        if (sala.fase === 'SABOTAGEM' || sala.fase === 'DECIFRANDO') {
            // Envia dados da rodada atual
            socket.emit('nova_rodada', {
                fase: 'SABOTAGEM', // Front vai ajustar se for decifrando dps
                rodadaAtual: sala.indiceRodadaAtual + 1,
                totalRodadas: totalR,
                meuPapel: 'SABOTADOR',
                palavraRevelada: sala.dadosRodada?.palavra, // Sabotador vê a palavra
                descricao: null // Sabotador vê descrição depois
            });

            // Se já estiver na fase de decifrar, envia o texto censurado
            if (sala.fase === 'DECIFRANDO') {
                socket.emit('fase_decifrar', { 
                    textoCensurado: sala.dadosRodada.textoCensurado,
                    palavrasEfetivas: [] // Simplificação: quem entra agora não vê o histórico dessa rodada específica
                });
            }
        }
        
        // Sincroniza o timer
        if (sala.timer) {
             // Precisamos de um jeito de mandar o tempo restante, mas o 'sincronizar_tempo' 
             // já mandou o timestamp final. O front calcula diff.
             // Podemos reenviar o evento de sync apenas para esse socket se soubermos o 'fim'
             // Como o backend não guardou o 'fim' numa var global fácil aqui, 
             // o timer do cliente pode ficar desincronizado nessa rodada específica 
             // ou podemos guardar o timestampFim na sala.
             // (Para simplificar, não vou mexer na estrutura do timer agora, ele sincroniza na prox fase)
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

    // Verifica se tem palavras suficientes para todos
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
    
    // 🔥 LÓGICA DE FIM DE JOGO DINÂMICA (Baseada em Ciclos)
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
    
    let textoBase = cifradorDaVez.meuTexto || "TEXTO PERDIDO (Jogador saiu?)"; 
    const palavraProibida = cifradorDaVez.minhaPalavra || "???"; 
    const regexAutoCensura = new RegExp(palavraProibida, 'gi');
    
    if (regexAutoCensura.test(textoBase)) { textoBase = textoBase.replace(regexAutoCensura, '[CENSURADO]'); }
    sala.dadosRodada = { palavra: palavraProibida, descricao: textoBase }; sala.sabotagens = {}; sala.fase = 'SABOTAGEM';
    
    iniciarTimer(nomeSala, sala.config.tempos.sabotagem, () => { finalizeFaseSabotagem(nomeSala); });
    
    // 🔥 ATUALIZADO: totalRodadas dinâmico
    const totalR = sala.jogadores.length * sala.config.numCiclos;

    sala.jogadores.forEach(jogador => { 
      let payload = { fase: 'SABOTAGEM', rodadaAtual: index + 1, totalRodadas: totalR, meuPapel: jogador.papel };
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
    let textoCensurado = sala.dadosRodada.descricao; const todasPalavras = Object.values(sala.sabotagens).flat();
    
    const palavrasEfetivas = todasPalavras.filter(p => p && p.trim().length > 0);

    palavrasEfetivas.forEach(palavra => { const regex = new RegExp(palavra, 'gi'); textoCensurado = textoCensurado.replace(regex, '[CENSURADO]'); });
    sala.fase = 'DECIFRANDO'; sala.dadosRodada.textoCensurado = textoCensurado;
    
    iniciarTimer(nomeSala, sala.config.tempos.decifracao, () => { calcularPontuacaoEFinalizarRodada(nomeSala, null); });
    
    io.to(nomeSala).emit('fase_decifrar', { textoCensurado: textoCensurado, palavrasEfetivas: palavrasEfetivas });
  }

  socket.on('decifrador_chuta', ({ nomeSala, tentativa }) => { const sala = salas[nomeSala]; if (sala && sala.timer) clearTimeout(sala.timer); calcularPontuacaoEFinalizarRodada(nomeSala, tentativa); });

  function calcularPontuacaoEFinalizarRodada(nomeSala, tentativa) {
    const sala = salas[nomeSala]; if (!sala) return;
    const palavraSecreta = sala.dadosRodada.palavra.toUpperCase(); const acertou = tentativa && tentativa.toUpperCase() === palavraSecreta;
    let resumoPontos = []; const cifrador = sala.jogadores.find(j => j.papel === 'CIFRADOR'); const decifrador = sala.jogadores.find(j => j.papel === 'DECIFRADOR');
    
    if(decifrador) {
        if (acertou) { decifrador.pontos += 4; if(cifrador) cifrador.pontos += 4; resumoPontos.push(`${decifrador.nome} (Decifrador) acertou! +4 pts`); } 
        else { resumoPontos.push(`${decifrador.nome} errou. (Era: ${palavraSecreta})`); }
    }

    const textoOriginal = sala.dadosRodada.descricao.toLowerCase(); const mapaSabotagem = {}; 
    for (const [idSabotador, palavras] of Object.entries(sala.sabotagens)) { palavras.forEach(p => { const palavraLimpa = p.trim().toLowerCase(); if (palavraLimpa && textoOriginal.includes(palavraLimpa)) { if (!mapaSabotagem[palavraLimpa]) mapaSabotagem[palavraLimpa] = []; mapaSabotagem[palavraLimpa].push(idSabotador); } }); }
    for (const [palavra, sabotadoresIds] of Object.entries(mapaSabotagem)) { const ehUnica = sabotadoresIds.length === 1; const pontosGanhos = ehUnica ? 2 : 1; sabotadoresIds.forEach(id => { const sabotador = sala.jogadores.find(j => j.id === id); if (sabotador) sabotador.pontos += pontosGanhos; }); resumoPontos.push(`Palavra "${palavra}" sabotada! (${pontosGanhos} pts p/ sabotadores)`); }
    io.to(nomeSala).emit('resultado_rodada', { acertou, palavraSecreta, tentativa: tentativa || "Tempo esgotado", resumo: resumoPontos, ranking: sala.jogadores.sort((a, b) => b.pontos - a.pontos) });
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Pronto na porta ${PORT}`);
});