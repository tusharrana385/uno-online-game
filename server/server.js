const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const { createGame, canPlay } = require("./game");

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

  socket.on("joinRoom", roomId => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        game: null
      };
    }

    rooms[roomId].players.push(socket.id);

    if (rooms[roomId].players.length === 2) {
      rooms[roomId].game = createGame(rooms[roomId].players);
    }

    io.to(roomId).emit("state", rooms[roomId]);
  });

  socket.on("playCard", ({ roomId, index }) => {
    const room = rooms[roomId];
    const game = room.game;
    const playerId = socket.id;

    const turnPlayer = game.players[game.turn];
    if (playerId !== turnPlayer) return;

    const card = game.hands[playerId][index];

    if (canPlay(card, game.topCard)) {
      game.topCard = card;
      game.hands[playerId].splice(index, 1);
      game.turn = (game.turn + 1) % game.players.length;
    }

    io.to(roomId).emit("state", room);
  });

});

http.listen(3000, () => {
  console.log("UNO server running on http://localhost:3000");
});
