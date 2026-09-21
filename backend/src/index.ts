import { createServer } from "node:http";
import { Server } from "socket.io";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  socket.emit("hello", { message: "backendに接続できました" });

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
