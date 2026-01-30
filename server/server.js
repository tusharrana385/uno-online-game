
const io = require("socket.io")(3001, {
  cors: { origin: "http://localhost:3000" }
});

console.log("UNO server running on port 3001");

const rooms = {};
let waitingPlayer = null;
const TURN_TIME = 30000;
const turnTimers = {};

/* ---------------- HELPERS ---------------- */

function shuffle(deck) {
  return deck.sort(() => Math.random() - 0.5);
}

function createDeck() {
  const colors = ["red", "yellow", "green", "blue"];
  const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","+2"];
  let deck = [];

  colors.forEach(c => values.forEach(v => deck.push({ color: c, value: v })));

  for (let i = 0; i < 4; i++) {
    deck.push({ color: "wild", value: "wild" });
    deck.push({ color: "wild", value: "+4" });
  }

  return shuffle(deck);
}

function createGame(players) {
  const deck = createDeck();
  const hands = {};

  players.forEach(p => hands[p.id] = deck.splice(0, 7));

  return {
    players: players.map(p => p.id),
    playerInfo: players,
    hands,
    deck,
    topCard: deck.pop(),
    currentColor: null,
    turn: 0,
    direction: 1
  };
}

function nextTurn(game) {
  game.turn = (game.turn + game.direction + game.players.length) % game.players.length;
}

/* -------- UNO RULE FUNCTIONS -------- */

function isValidMove(card, game) {
  const top = game.topCard;

  if (card.color === "wild") return true;
  if (game.currentColor && card.color === game.currentColor) return true;
  if (card.color === top.color) return true;
  if (card.value === top.value) return true;

  return false;
}

function applyCardEffect(card, game) {
  const nextIndex = (game.turn + game.direction + game.players.length) % game.players.length;
  const nextPlayerId = game.players[nextIndex];

  switch (card.value) {
    case "skip":
      nextTurn(game);
      break;

    case "reverse":
      game.direction *= -1;
      break;

    case "+2":
      if (game.deck.length >= 2) {
        game.hands[nextPlayerId].push(game.deck.pop(), game.deck.pop());
      }
      nextTurn(game);
      break;

    case "+4":
      if (game.deck.length >= 4) {
        for (let i = 0; i < 4; i++) game.hands[nextPlayerId].push(game.deck.pop());
      }
      nextTurn(game);
      break;
  }

    if (card.value === "+2") {
      game.drawStack = (game.drawStack || 0) + 2;
    }
    else if (card.value === "+4") {
      game.drawStack = (game.drawStack || 0) + 4;
    }

    if (game.drawStack && card.value !== "+2" && card.value !== "+4") {
    // Must draw stacked cards
    for (let i = 0; i < game.drawStack; i++) {
      game.hands[playerId].push(game.deck.pop());
    }
    game.drawStack = 0;
    nextTurn(game);
    emitRoomState(roomId);
    return;
  }


}

function addBot(roomId) {
  const botId = "bot_" + Date.now();

  rooms[roomId].players.push({
    id: botId,
    name: "UNO Bot",
    isBot: true
  });
}


/* -------- PUBLIC STATE -------- */

function getPublicState(room, socketId) {
  return {
    players: room.players.map(p => ({ id: p.id, name: p.name })),
    chat: room.chat,
    game: room.game ? {
      topCard: room.game.topCard,
      currentColor: room.game.currentColor,
      turn: room.game.players[room.game.turn],
      hand: room.game.hands[socketId] || [],
      opponentCount: Object.keys(room.game.hands)
        .filter(id => id !== socketId)
        .map(id => room.game.hands[id].length)[0] || 0
    } : null
  };
}

function emitRoomState(roomId) {
  const room = rooms[roomId];
  if (!room || !room.players) return;

  room.players.forEach(p => {
    io.to(p.id).emit("state", getPublicState(room, p.id));
  });
}

/* -------- TIMER -------- */

function startTurnTimer(roomId) {
  const room = rooms[roomId];
  if (!room || !room.game) return;

  clearTimeout(turnTimers[roomId]);

  turnTimers[roomId] = setTimeout(() => {
    const game = room.game;
    const playerId = game.players[game.turn];
  }, TURN_TIME);
}

/* ---------------- SOCKET ---------------- */

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("findMatch", playerName => {

    const MAX_PLAYERS = 4;

    socket.on("findMatch", playerName => {
      if (!waitingPlayer) {
        waitingPlayer = [];
      }

      waitingPlayer.push({ id: socket.id, name: playerName });

      if (waitingPlayer.length >= MAX_PLAYERS) {
        const roomId = "room-" + Date.now();
        rooms[roomId] = { players: waitingPlayer, game: null, chat: [] };

        waitingPlayer.forEach(p => {
          io.to(p.id).emit("matchFound", roomId);
        });

        waitingPlayer = [];
      }

     

    }); return;
    })

 ;


  socket.on("sayUNO", roomId => {
  const room = rooms[roomId];
  if (!room?.game) return;

  const player = room.players.find(p => p.id === socket.id);
  if (player) player.saidUNO = true;
});


  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (!rooms[roomId]) return;

    socket.join(roomId);

    rooms[roomId].players.push({ id: socket.id, name: playerName, saidUNO: false });

    if (rooms[roomId].players.length === 2) {
      rooms[roomId].game = createGame(rooms[roomId].players);
      startTurnTimer(roomId);
    }

    emitRoomState(roomId);

    socket.on("joinRoom", ({ roomId, playerName }) => {
  const room = rooms[roomId];
  if (!room) return;

  socket.join(roomId);

  room.players.push({
    id: socket.id,
    name: playerName,
    calledUno: false
  });

  function addBot(roomId) {
          const botId = "bot_" + Date.now();

          rooms[roomId].players.push({
            id: botId,
            name: "UNO Bot",
            isBot: true
          } );
        if (rooms[roomId].players.length === 1) {
          addBot(roomId);
        };
        }
  if (room.players.length >= 2) {
    room.game = createGame(room.players);
    startTurnTimer(roomId);
    botPlay(roomId);
  }

  if (game.deck.length) game.hands[playerId].push(game.deck.pop());

    nextTurn(game);
    emitRoomState(roomId);
    startTurnTimer(roomId);
    startTurnTimer(roomId);

  if (room.players.length === 2) {
    room.game = createGame(room.players);
    startTurnTimer(roomId);   // ✅ CORRECT PLACE
    botPlay(roomId);          // ✅ CORRECT PLACE
  }

  emitRoom(roomId);
});

  });

  socket.on("sendChat", ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const chatMsg = { name: player.name, message };
    room.chat.push(chatMsg);
    io.to(roomId).emit("chatUpdate", chatMsg);
  });

  /* -------- PLAY CARD (RULES APPLIED) -------- */

  socket.on("playCard", ({ roomId, index, chosenColor }) => {
    const room = rooms[roomId];
    const game = room?.game;
    if (!game) return;

    if (socket.id !== game.players[game.turn]) return;

    const card = game.hands[socket.id][index];
    if (!card) return;

    if (!isValidMove(card, game)) {
      socket.emit("systemMessage", "Invalid move!");
      return;
    }

    game.hands[socket.id].splice(index, 1);
    game.topCard = card;
    game.currentColor = card.color === "wild" ? chosenColor : null;

    applyCardEffect(card, game);

    if (game.hands[socket.id].length === 0) {
      io.to(roomId).emit("gameOver", socket.id);
      delete rooms[roomId];
      return;
    }

    // UNO check
    if (game.hands[socket.id].length === 1) {
      const player = room.players.find(p => p.id === socket.id);
      if (!player.saidUNO) {
        game.hands[socket.id].push(game.deck.pop());
        game.hands[socket.id].push(game.deck.pop());
      }
    player.saidUNO = false;
  }

  });

  /* -------- DRAW CARD (TURN PROTECTED) -------- */

  socket.on("drawCard", roomId => {
    const room = rooms[roomId];
    const game = room?.game;
    if (!game) return;

    if (socket.id !== game.players[game.turn]) return;

    if (game.deck.length) game.hands[socket.id].push(game.deck.pop());

    nextTurn(game);
    emitRoomState(roomId);
    startTurnTimer(roomId);
  
    function botPlay(roomId) {
    const room = rooms[roomId];
    const game = room.game;
    const botId = game.players[game.turn];

    if (!botId.startsWith("bot")) return;

    const hand = game.hands[botId];
    const playable = hand.findIndex(c => canPlay(c, game.topCard, game.currentColor));

    if (playable !== -1) {
      const card = hand.splice(playable, 1)[0];
      game.topCard = card;
    } else {
      hand.push(game.deck.pop());
    }

    nextTurn(game);
    emitRoomState(roomId);
  
    setTimeout(() => botPlay(roomId), 1000);

  }

  });

  socket.on("disconnect", () => {
    if (waitingPlayer?.id === socket.id) waitingPlayer = null;

    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);

      if (rooms[roomId].players.length === 0) {
        clearTimeout(turnTimers[roomId]);
        delete rooms[roomId];
      } else {
        emitRoomState(roomId);
      }
    }
  });

  socket.on("gameOver", winnerId => {
    alert(winnerId === socket.id ? "You Win! 🏆" : "You Lose!");
  });

});