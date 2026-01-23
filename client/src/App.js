import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function App() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [roomState, setRoomState] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    socket.on("matchFound", id => {
      setRoomId(id);
      socket.emit("joinRoom", { roomId: id, playerName: name });
    });

    socket.on("state", state => {
      setRoomState(state);
    });

    socket.on("chatUpdate", msg => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off("matchFound");
      socket.off("state");
      socket.off("chatUpdate");
    };
  }, [name]);

  /* ---------------- LOBBY ---------------- */

  if (!roomId) {
    return (
      <div style={{ padding: 40 }}>
        <h1>UNO Online</h1>
        <input
          placeholder="Enter Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={() => socket.emit("findMatch", name)}>
          Find Match
        </button>
      </div>
    );
  }

  /* ---------------- GAME ROOM ---------------- */

  if (!roomState.game) return <h2>Waiting for opponent...</h2>;

  const myTurn = roomState.game.turn === socket.id;
  const myHand = roomState.game.hand || [];

  const sendChat = () => {
    socket.emit("sendChat", { roomId, message: chatInput });
    setChatInput("");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>UNO Game</h2>
      <h3>{myTurn ? "🟢 Your Turn" : "⏳ Opponent Turn"}</h3>

      {/* TOP CARD */}
      <h3>Top Card</h3>
      <div style={{
        width: 70,
        height: 100,
        background: roomState.game.topCard.color === "wild" ? "black" : roomState.game.topCard.color,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        fontSize: 22
      }}>
        {roomState.game.topCard.value}
      </div>

      {/* OPPONENT */}
      <h3>Opponent Cards: {roomState.game.opponentCount}</h3>

      {/* YOUR HAND */}
      <h3>Your Hand</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {myHand.map((card, index) => (
          <div
            key={index}
            style={{
              width: 60,
              height: 90,
              background: card.color === "wild" ? "black" : card.color,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              cursor: myTurn ? "pointer" : "not-allowed",
              opacity: myTurn ? 1 : 0.5
            }}
            onClick={() =>
              myTurn &&
              socket.emit("playCard", { roomId, index, chosenColor: "red" })
            }
          >
            {card.value}
          </div>
        ))}
      </div>

      <button onClick={() => socket.emit("drawCard", roomId)}>
        Draw Card
      </button>

      {/* CHAT */}
      <h3>Chat</h3>
      <div style={{ border: "1px solid black", height: 150, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.name}</b>: {m.message}
          </div>
        ))}
      </div>

      <input
        value={chatInput}
        onChange={e => setChatInput(e.target.value)}
      />
      <button onClick={sendChat}>Send</button>

    </div>
  );
}
