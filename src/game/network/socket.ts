// game/network/socket.ts
import { io } from "socket.io-client";

export const socket = io("https://signal-be-m21o.onrender.com", {
  transports: ["websocket"],
});
