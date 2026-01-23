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

    if (game.deck.length) game.hands[playerId].push(game.deck.pop());

    nextTurn(game);
    emitRoomState(roomId);
    startTurnTimer(roomId);
  }, TURN_TIME);
}

/* ---------------- SOCKET ---------------- */

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("findMatch", playerName => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomId = "room-" + Date.now();
      rooms[roomId] = { players: [], game: null, chat: [] };

      io.to(waitingPlayer.id).emit("matchFound", roomId);
      socket.emit("matchFound", roomId);

      waitingPlayer = null;
    } else {
      waitingPlayer = { id: socket.id, name: playerName };
      socket.emit("systemMessage", "Waiting for opponent...");
    }
  });

  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (!rooms[roomId]) return;

    socket.join(roomId);

    rooms[roomId].players.push({ id: socket.id, name: playerName });

    if (rooms[roomId].players.length === 2) {
      rooms[roomId].game = createGame(rooms[roomId].players);
      startTurnTimer(roomId);
    }

    emitRoomState(roomId);
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

    nextTurn(game);
    emitRoomState(roomId);
    startTurnTimer(roomId);
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
});
