const socket = io();
let roomId = "";
let myId = "";

socket.on("connect", () => {
  myId = socket.id;
});

function join() {
  roomId = document.getElementById("roomInput").value;
  socket.emit("joinRoom", roomId);
}

socket.on("state", data => {
  if (!data.game) return;

  const game = data.game;
  const hand = game.hands[myId] || [];

  document.getElementById("topCard").innerText =
    game.topCard.color + " " + game.topCard.value;

  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  hand.forEach((card, i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.background = card.color;
    div.innerText = card.value;
    div.onclick = () => {
      socket.emit("playCard", { roomId, index: i });
    };
    handDiv.appendChild(div);
  });

  document.getElementById("turn").innerText =
    game.players[game.turn] === myId ? "Your Turn" : "Opponent Turn";
});
