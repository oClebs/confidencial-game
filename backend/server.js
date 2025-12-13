const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
// 👇 IMPORTA A INTELIGÊNCIA DE RADICAIS
const natural = require('natural'); 

// ⚠️ GARANTA QUE O ARQUIVO 'palavras.js' EXISTE NA PASTA BACKEND
const { PALAVRAS } = require('./palavras');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const salas = {};

// --- CONFIGURAÇÃO DO STEMMER (RADICAIS) EM PORTUGUÊS ---
const stemmer = natural.PorterStemmerPt; // Stemmer específico para PT
const tokenizer = new natural.WordTokenizer(); // Quebrador de palavras

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

// Regex Flexível (mantido para garantir acentuação correta na substituição)
function gerarRegexFlexivel(texto) {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const base = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const mapa = { 'a': '[aáàãâä]', 'e': '[eéèêë]', 'i': '[iíìîï]', 'o': '[oóòõôö]', 'u': '[uúùûü]', 'c': '[cç]', 'n': '[nñ]' };
    let pattern = "";
    for (let char of base) { pattern += mapa[char] || escapeRegex(char); }
    // Removemos o (es|s)? daqui pois o Stemmer já vai cuidar das variações
    return new RegExp(pattern, 'gi');
}

function iniciarTimer(nomeSala, duracaoSegundos, callbackTimeout) {
  const sala = salas[nomeSala];
  if (!sala) return;
  if (sala.timer) clearTimeout(sala.timer);
  sala.timestampFim = Date.now() + (duracaoSegundos * 1000);
  io.to(nomeSala).emit('sincronizar_tempo', { segundosRestantes: duracaoSegundos });
  sala.timer = setTimeout(() => { sala.timestampFim = null; callbackTimeout(); }, duracaoSegundos * 1000);
}

io.on('connection', (socket) => {
  console.log(`👤 Conectado: ${socket.id}`);

  socket.on('verificar_sala', (roomId) => {
    const id = roomId ? roomId.toUpperCase() : '';
    const sala = salas[id];
    if (sala) {
        socket.emit('info_sala_retorno', { existe: true, twitchAuth: sala.config.twitchAuth });
    } else {
        socket.emit('sessao_invalida');
    }
  });

  socket.on('criar_sala', ({ nomeJogador, senha, config, twitchData }) => {
    const novoId = gerarIdSala();
    const tokenSeguro = gerarTokenSeguro(); 
    const configuracoes = {
        twitchAuth: config?.twitchAuth || false,
        streamerMode: config?.streamerMode || false,
        numCiclos: parseInt(config?.numCiclos) || 1, 
        tempos: { preparacao: parseInt(config?.tempos?.preparacao)||120, sabotagem: parseInt(config?.tempos?.sabotagem)||30, decifracao: parseInt(config?.tempos?.decifracao)||45 }
    };

    salas[novoId] = { 
      id: novoId, senha: senha, config: configuracoes, hostName: nomeJogador, hostToken: tokenSeguro, 
      jogadores: [], fase: 'LOBBY', indiceRodadaAtual: 0, sabotagens: {}, timer: null, destructionTimer: null, palavrasUsadas: new Set(), timestampFim: null
    };

    socket.join(novoId);
    salas[novoId].jogadores.push({ 
      id: socket.id, nome: nomeJogador, pontos: 0, papel: null, isHost: true, 
      minhaPalavra: null, meuTexto: null, pronto: false, foto: twitchData ? twitchData.foto : null 
    });

    socket.emit('sala_criada_sucesso', { roomId: novoId, jogadores: salas[novoId].jogadores, userToken: tokenSeguro, config: configuracoes });
    console.log(`🏠 Sala criada: ${novoId}`);
  });

  socket.on('entrar_sala', ({ roomId, senha, nomeJogador, token, twitchData }) => {
    const idMaiusculo = roomId.toUpperCase(); 
    if (!salas[idMaiusculo]) { socket.emit('erro_login', 'Sala não encontrada!'); return; }
    const sala = salas[idMaiusculo];

    if (!sala.config.twitchAuth) {
        if (sala.senha !== senha) { socket.emit('erro_login', 'Senha incorreta!'); return; }
    }

    let isReturningHost = false;
    if (nomeJogador === sala.hostName && token === sala.hostToken) {
        if (sala.destructionTimer) clearTimeout(sala.destructionTimer);
        isReturningHost = true;
    } else {
        if (sala.jogadores.some(p => p.nome === nomeJogador)) { socket.emit('erro_login', 'Nome em uso!'); return; }
    }

    socket.join(idMaiusculo);
    const novoJogador = { 
      id: socket.id, nome: nomeJogador, pontos: 0, papel: 'SABOTADOR',
      isHost: isReturningHost || (sala.jogadores.length === 0 && token === sala.hostToken), 
      minhaPalavra: null, meuTexto: null, pronto: false, foto: twitchData ? twitchData.foto : null
    };

    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') { novoJogador.pronto = true; novoJogador.minhaPalavra = "AGENTE_NOVO"; }
    sala.jogadores.push(novoJogador);

    socket.emit('entrada_sucesso', { roomId: idMaiusculo, jogadores: sala.jogadores, fase: sala.fase, config: sala.config });
    io.to(idMaiusculo).emit('atualizar_sala', sala.jogadores);
    
    if (sala.fase !== 'LOBBY' && sala.fase !== 'FIM') {
        const payload = { fase: sala.fase, rodadaAtual: sala.indiceRodadaAtual + 1, totalRodadas: sala.jogadores.length * sala.config.numCiclos, meuPapel: 'SABOTADOR', protagonistas: null };
        if (sala.dadosRodada) { payload.palavraRevelada = sala.dadosRodada.palavra; }
        socket.emit('nova_rodada', payload);
        if (sala.fase === 'DECIFRANDO') socket.emit('fase_decifrar', { textoCensurado: sala.dadosRodada.textoCensurado, palavrasEfetivas: [] });
        if (sala.timestampFim) socket.emit('sincronizar_tempo', { segundosRestantes: Math.ceil((sala.timestampFim - Date.now())/1000) });
    }
  });
  
  socket.on('banir_jogador', ({ roomId, targetId }) => {
      const sala = salas[roomId]; if (!sala) return;
      const solicitante = sala.jogadores.find(j => j.id === socket.id);
      if (solicitante && solicitante.isHost) {
          const alvoIndex = sala.jogadores.findIndex(j => j.id === targetId);
          if (alvoIndex !== -1) {
              const alvoId = sala.jogadores[alvoIndex].id;
              sala.jogadores.splice(alvoIndex, 1);
              io.to(alvoId).emit('banido_da_sala', 'Banido.');
              io.to(roomId).emit('atualizar_sala', sala.jogadores);
          }
      }
  });

  socket.on('iniciar_jogo', (nomeSala) => {
    const sala = salas[nomeSala]; if (!sala) return;
    let disponiveis = PALAVRAS.filter(p => !sala.palavrasUsadas.has(p));
    if (disponiveis.length < sala.jogadores.length) { sala.palavrasUsadas.clear(); disponiveis = [...PALAVRAS]; }
    const sorteadas = embaralhar(disponiveis);
    sala.jogadores.forEach((j, index) => { j.minhaPalavra = sorteadas[index]; sala.palavrasUsadas.add(j.minhaPalavra); j.meuTexto = null; j.pronto = false; j.pontos = 0; });
    sala.fase = 'PREPARACAO';
    sala.jogadores.forEach(j => io.to(j.id).emit('inicio_preparacao', { palavra: j.minhaPalavra, fase: 'PREPARACAO' }));
    iniciarTimer(nomeSala, sala.config.tempos.preparacao, () => { sala.indiceRodadaAtual = 0; iniciarRodadaDeJogo(nomeSala); });
  });

  socket.on('enviar_preparacao', ({ nomeSala, texto }) => {
    const sala = salas[nomeSala]; if (!sala) return;
    const j = sala.jogadores.find(j => j.id === socket.id); if (j) { j.meuTexto = texto; j.pronto = true; }
    if (sala.jogadores.every(j => j.pronto)) { if (sala.timer) clearTimeout(sala.timer); sala.indiceRodadaAtual = 0; iniciarRodadaDeJogo(nomeSala); }
    else { io.to(nomeSala).emit('status_preparacao', { prontos: sala.jogadores.filter(j=>j.pronto).length, total: sala.jogadores.length }); }
  });

  socket.on('proxima_rodada', (nomeSala) => {
    const sala = salas[nomeSala]; if (!sala) return;
    sala.indiceRodadaAtual++;
    if (sala.indiceRodadaAtual >= sala.jogadores.length * sala.config.numCiclos) { sala.fase = 'FIM'; io.to(nomeSala).emit('fim_de_jogo', { ranking: sala.jogadores.sort((a,b)=>b.pontos-a.pontos) }); }
    else { iniciarRodadaDeJogo(nomeSala); }
  });

  function iniciarRodadaDeJogo(nomeSala) {
    const sala = salas[nomeSala]; if (!sala) return;
    const total = sala.jogadores.length; const idx = sala.indiceRodadaAtual; if (total===0) return;
    const cifrador = sala.jogadores[idx % total]; const decifrador = sala.jogadores[(idx + 1) % total];
    sala.jogadores.forEach(j => { if(j.id===cifrador.id) j.papel='CIFRADOR'; else if(j.id===decifrador.id) j.papel='DECIFRADOR'; else j.papel='SABOTADOR'; });
    
    // --- LÓGICA DE AUTO-CENSURA INTELIGENTE (STEMMER) ---
    let texto = cifrador.meuTexto || "Perdido"; 
    const palavraSecreta = cifrador.minhaPalavra || "???";
    
    // 1. Pega o radical da palavra secreta
    const radicalSecreto = stemmer.stem(palavraSecreta); 
    
    // 2. Quebra o texto do cifrador em palavras (tokens)
    const palavrasTexto = tokenizer.tokenize(texto);
    
    // 3. Verifica cada palavra do texto: se o radical for igual ao da secreta, censura
    const palavrasParaCensurar = new Set();
    palavrasParaCensurar.add(palavraSecreta); // Garante a original

    palavrasTexto.forEach(palavra => {
        if (stemmer.stem(palavra) === radicalSecreto) {
            palavrasParaCensurar.add(palavra);
        }
    });

    // 4. Aplica a censura no texto
    palavrasParaCensurar.forEach(p => {
        texto = texto.replace(gerarRegexFlexivel(p), '[CENSURADO]');
    });
    // ----------------------------------------------------

    sala.dadosRodada = { palavra: palavraSecreta, descricao: texto }; sala.sabotagens = {}; sala.fase = 'SABOTAGEM';
    
    iniciarTimer(nomeSala, sala.config.tempos.sabotagem, () => finalizeFaseSabotagem(nomeSala));
    const protagonistas = { cifrador: cifrador.nome, decifrador: decifrador.nome, sabotadores: sala.jogadores.filter(j=>j.id!==cifrador.id && j.id!==decifrador.id).map(j=>j.nome) };
    
    sala.jogadores.forEach(j => { 
        let d = { fase: 'SABOTAGEM', rodadaAtual: idx+1, totalRodadas: total*sala.config.numCiclos, meuPapel: j.papel, protagonistas, palavraRevelada: null, descricao: null };
        if(j.papel==='CIFRADOR') { d.descricao=sala.dadosRodada.descricao; d.palavraRevelada=sala.dadosRodada.palavra; }
        else if(j.papel==='SABOTADOR') { d.palavraRevelada=sala.dadosRodada.palavra; }
        io.to(j.id).emit('nova_rodada', d);
    });
  }

  socket.on('sabotador_envia', ({ nomeSala, previsoes }) => {
    const sala = salas[nomeSala]; if (!sala) return;
    sala.sabotagens[socket.id] = previsoes;
    if (Object.keys(sala.sabotagens).length >= sala.jogadores.filter(j=>j.papel==='SABOTADOR').length) { if(sala.timer) clearTimeout(sala.timer); finalizeFaseSabotagem(nomeSala); }
  });

  function finalizeFaseSabotagem(nomeSala) {
    const sala = salas[nomeSala]; if (!sala) return;
    let txt = sala.dadosRodada.descricao;
    
    // Recupera todas as tentativas de sabotagem
    const sabotagens = Object.values(sala.sabotagens).flat().filter(p=>p&&p.trim().length>0);
    
    // --- LÓGICA DE SABOTAGEM INTELIGENTE (STEMMER) ---
    // Agora o sabotador também é poderoso: se ele chutar "Scan", censura "Scanner"
    const tokensTexto = tokenizer.tokenize(txt); // Analisa o texto atual (já censurado parcialmente)
    
    sabotagens.forEach(tentativa => {
        const radicalTentativa = stemmer.stem(tentativa);
        const palavrasAlvo = new Set();
        palavrasAlvo.add(tentativa); // Adiciona a exata

        // Busca no texto palavras com o mesmo radical da tentativa
        tokensTexto.forEach(palavraNoTexto => {
            if (stemmer.stem(palavraNoTexto) === radicalTentativa) {
                palavrasAlvo.add(palavraNoTexto);
            }
        });

        // Censura todas as variações encontradas
        palavrasAlvo.forEach(alvo => {
            txt = txt.replace(gerarRegexFlexivel(alvo), '[CENSURADO]');
        });
    });
    // ------------------------------------------------

    sala.fase = 'DECIFRANDO'; sala.dadosRodada.textoCensurado = txt;
    iniciarTimer(nomeSala, sala.config.tempos.decifracao, () => calcularPontos(nomeSala, null));
    io.to(nomeSala).emit('fase_decifrar', { textoCensurado: txt, palavrasEfetivas: sabotagens, segundosRestantes: sala.config.tempos.decifracao });
  }

  socket.on('decifrador_chuta', ({ nomeSala, tentativa }) => { const sala=salas[nomeSala]; if(sala && sala.timer) clearTimeout(sala.timer); calcularPontos(nomeSala, tentativa); });

  function calcularPontos(nomeSala, tentativa) {
    const sala = salas[nomeSala]; if (!sala) return;
    const alvo = sala.dadosRodada.palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const chute = (tentativa||"").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    // --- COMPARAÇÃO INTELIGENTE NO CHUTE TAMBÉM ---
    // Se a palavra era "Correr" e ele chutou "Corrida", deve aceitar? 
    // Por padrão de jogo, costuma ser EXATO, mas se quiser flexível, avise.
    // Vou manter EXATO para o Decifrador (mais difícil), mas flexível para Sabotador.
    const acertou = chute === alvo; 
    // ----------------------------------------------

    const resumo = [];
    const decifrador = sala.jogadores.find(j=>j.papel==='DECIFRADOR'); const cifrador = sala.jogadores.find(j=>j.papel==='CIFRADOR');
    
    if(decifrador) {
        if(acertou) { decifrador.pontos+=4; if(cifrador) cifrador.pontos+=4; resumo.push("Decifrador acertou! (+4)"); }
        else resumo.push(`Decifrador errou. Era: ${alvo}`);
    }
    
    const txtOriginal = sala.dadosRodada.descricao;
    // Pontuação dos Sabotadores (usando Radicais)
    for(const [id, palavras] of Object.entries(sala.sabotagens)) {
        palavras.forEach(p => { 
            const radicalP = stemmer.stem(p);
            // Verifica se ALGUMA palavra do texto original tinha esse radical
            const tokensOriginais = tokenizer.tokenize(txtOriginal);
            const acertouSabotagem = tokensOriginais.some(t => stemmer.stem(t) === radicalP);
            
            if(acertouSabotagem) { 
                const s = sala.jogadores.find(j=>j.id===id); 
                if(s) s.pontos+=1; 
            } 
        });
    }
    
    io.to(nomeSala).emit('resultado_rodada', { acertou, palavraSecreta: alvo, tentativa: tentativa||"Tempo esgotado", resumo, ranking: sala.jogadores.sort((a,b)=>b.pontos-a.pontos) });
  }

  socket.on('disconnect', () => { /* Lógica de desconexão padrão */ });
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server na porta ${PORT}`));