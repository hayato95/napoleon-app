import { createServer } from "node:http";
import { Server } from "socket.io";
import { buildStateUpdate, handleHumanAction, startGame } from "./game-flow.js";
import { parsePlayerAction } from "./protocol.js";
import type { GameState } from "./types.js";

// ソケット通信だけを担当する。ゲームの進め方は game-flow.ts、通信データの検証は protocol.ts にある。
//
// 人間は1人だけ（席0）。後から来た接続は断る。
// どの席の操作かはクライアントに聞かず、サーバーが決める（クライアントが送る値は信用しない）。
//
// クライアント → サーバー:
//   "action": PlayerAction（protocol.ts）… ゲーム開始・宣言・パス・副官指名・捨て札・カードを出す
// サーバー → クライアント:
//   "hello":       { message, accepted } … 接続できたか、満員かのお知らせ。accepted が false なら満員
//   "stateUpdate": StateUpdate … 状態が変わるたびに送る（自分に見せてよい情報だけ）
//   "actionError": { message } … 届いた操作を受け付けられなかったとき

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

let humanSocketId: string | null = null;
let game: GameState | null = null;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  if (humanSocketId !== null) {
    socket.emit("hello", { message: "プレイヤーが満員です", accepted: false });
    socket.disconnect();
    return;
  }

  // 接続しただけではゲームは始まらない。人間が "startGame" を送ったときに始める（FR-45）
  humanSocketId = socket.id;
  socket.emit("hello", { message: "backendに接続できました", accepted: true });

  socket.on("action", (raw: unknown) => {
    try {
      const action = parsePlayerAction(raw);

      if (action.type === "startGame") {
        // 対局の途中で作り直されないよう、始められるのは「まだ始めていない」か「終わっている」ときだけ
        if (game !== null && game.phase !== "result") {
          throw new Error("対局はすでに始まっています");
        }
        game = startGame(Math.random);
      } else {
        if (game === null) {
          throw new Error("まだ対局が始まっていません");
        }
        game = handleHumanAction(game, action, Math.random);
      }

      socket.emit("stateUpdate", buildStateUpdate(game));
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作を受け付けられませんでした";
      socket.emit("actionError", { message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
    if (humanSocketId === socket.id) {
      humanSocketId = null;
      game = null;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
