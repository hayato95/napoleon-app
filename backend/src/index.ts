import { createServer } from "node:http";
import { Server } from "socket.io";
import type { Card, Suit, Rank, Player, GameState, PlayerId } from "./types.js";

function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ["spade", "diamond", "heart", "club"];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
 
  for (const suit of suits) {
    for (const rank of ranks) {
     
      deck.push({
  type: "normal",
  suit: suit,
  rank: rank
});

}

}

deck.push({
    type: "joker"
  });

return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
for (let i = deck.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));

[deck[i], deck[j]] = [deck[j], deck[i]];
}

return deck;
}

function dealCards(deck: Card[]): { hands: Card[][]; widow: Card[] } {
const hands: Card[][] = [[], [], [], [], []];

for (let i = 0; i < 50; i++) {
  const playerIndex = i % 5;
  hands[playerIndex].push(deck[i]);
}

const widow = deck.slice(50);

return {
  hands,
  widow
};
}

function createPlayers(): Player[] {
  return [
    { id: 0, name: "Player 0", isHuman: true, hand: [] },
    { id: 1, name: "Player 1", isHuman: true, hand: [] },
    { id: 2, name: "Player 2", isHuman: true, hand: [] },
    { id: 3, name: "Player 3", isHuman: true, hand: [] },
    { id: 4, name: "Player 4", isHuman: true, hand: [] }
  ];
}

function setupDeal(): GameState {
const deck = shuffleDeck(createDeck());
const { hands, widow } = dealCards(deck);

const players = createPlayers();

for (let i = 0; i < players.length; i++) {
  players[i].hand = hands[i];
}

const gameState: GameState = {
  phase: "dealing",
  players,
  widow,

  declarations: [],
  trumpSuit: null,
  declaredCount: null,

  napoleonId: null,
  fukukanCard: null,
  fukukanId: null,
  fukukanRevealed: false,

  currentTrick: null,
  trickHistory: [],
  capturedCards: {
    0: [],
    1: [],
    2: [],
    3: [],
    4: []
  },

  turnOrder: [0, 1, 2, 3, 4]
};

return gameState;
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

let gameState = setupDeal();

const connectedPlayers = new Map<string, PlayerId>();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

io.on("connection", (socket) => {


  console.log(`client connected: ${socket.id}`);

if (connectedPlayers.size >= 5) {
  socket.emit("hello", {
    message: "プレイヤーが満員です"
  });

  socket.disconnect();
  return;
}

const playerId = connectedPlayers.size as PlayerId;
connectedPlayers.set(socket.id, playerId);
  socket.emit("hello", { message: "backendに接続できました" });

  const player = gameState.players[playerId];

socket.emit("yourHand", {
  playerId: playerId,
  hand: player.hand
});

  console.log(`Player ${playerId} として接続しました`);

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
