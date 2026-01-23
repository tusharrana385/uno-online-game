import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import socket from "./socket";

export default function Lobby({ onJoinRoom, setPlayerName }) {
  const [name, setName] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState([]);

  useEffect(() => {
    socket.on("lobbyUpdate", lobby => setLobbyPlayers(lobby));

    socket.on("matchFound", roomId => {
      console.log("Match found:", roomId);
      onJoinRoom(roomId);  // go to GameRoom
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("matchFound");
    };
  }, [onJoinRoom]);

  const joinLobby = () => {
    if (!name) return alert("Enter name");
    setPlayerName(name);
    socket.emit("joinLobby", name);
  };

  const findMatch = () => {
    if (!name) return alert("Enter name first");
    setPlayerName(name);
    socket.emit("findMatch", name);
  };

  return (
    <div>
      <h2>Lobby</h2>

      <input
        placeholder="Enter your name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <button onClick={joinLobby}>Join Lobby</button>
      <button onClick={findMatch}>Find Match</button>

      <h3>Players in Lobby:</h3>
      <ul>
        {lobbyPlayers.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
