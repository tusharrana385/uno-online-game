import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import socket from "./socket";

export default function GameRoom({ roomId, playerName }) {
  const [roomState, setRoomState] = useState(null);

  useEffect(() => {
    socket.emit("joinRoom", { roomId, playerName });

    socket.on("state", room => {
      console.log("ROOM STATE:", room); // DEBUG
      setRoomState(room);
    });

    return () => socket.off("state");
  }, [roomId, playerName]);

  if (!roomState || !roomState.game) return <p>Waiting for opponent...</p>;

  const game = roomState.game;
  const myHand = game.hands[socket.id] || [];

  return (
    <div>
      <h2>Room: {roomId}</h2>

      <h3>Players:</h3>
      <ul>
        {roomState.players.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      {/* TOP CARD */}
      <h3>Top Card:</h3>
      <div
        style={{
          width: 60,
          height: 90,
          backgroundColor:
            game.topCard.color === "wild" ? "black" : game.topCard.color,
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 5,
          margin: "10px 0"
        }}
      >
        {game.topCard.value}
      </div>

      {/* PLAYER HAND */}
      <h3>Your Hand:</h3>
      <div style={{ display: "flex", gap: 10 }}>
        {myHand.map((card, index) => (
          <div
            key={index}
            style={{
              width: 60,
              height: 90,
              backgroundColor:
                card.color === "wild" ? "black" : card.color,
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 5,
              cursor: "pointer"
            }}
            onClick={() =>
              socket.emit("playCard", { roomId, index, chosenColor: null })
            }
          >
            {card.value}
          </div>
        ))}
      </div>

      <br />
      <button onClick={() => socket.emit("drawCard", roomId)}>
        Draw Card
      </button>
    </div>
  );
}
