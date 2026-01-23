// src/Chat.jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import socket from "./socket";

export default function Chat({ roomId }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("chatUpdate", msg => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socket.off("chatUpdate");
  }, []);

  const sendMessage = () => {
    if (!message) return;
    socket.emit("sendChat", { roomId, message });
    setMessage("");
  };

  return (
    <div>
      <h3>Chat</h3>
      <div style={{ border: "1px solid black", height: 200, overflowY: "scroll" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.name}</b>: {m.message}
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
