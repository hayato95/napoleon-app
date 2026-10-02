import type { Card, GameState, Player, PlayerId, Rank, Suit } from "./types.js";

// 0以上1未満の乱数を返す関数。本番では Math.random、テストでは固定の乱数列を渡す。
export type Rng = () => number;

// 本アプリは人間1人 × CPU4人。人間の席は常にこの番号（座席のランダム化は FR-33 で扱う）
export const HUMAN_SEAT: PlayerId = 0;

const SUITS: Suit[] = ["spade", "diamond", "heart", "club"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];

// 各プレイヤーに配る枚数（5人×10枚＋場札3枚＝53枚）
const CARDS_PER_PLAYER = 10;
const PLAYER_COUNT = 5;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ type: "normal", suit, rank });
    }
  }
  deck.push({ type: "joker" });
  return deck;
}

// Fisher-Yatesで混ぜた新しい配列を返す（引数の配列は書き換えない）
export function shuffleDeck(deck: Card[], rng: Rng): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[]): { hands: Card[][]; widow: Card[] } {
  const hands: Card[][] = Array.from({ length: PLAYER_COUNT }, () => []);
  const dealtCount = CARDS_PER_PLAYER * PLAYER_COUNT;

  for (let i = 0; i < dealtCount; i++) {
    hands[i % PLAYER_COUNT].push(deck[i]);
  }

  return { hands, widow: deck.slice(dealtCount) };
}

function createPlayers(hands: Card[][]): Player[] {
  return hands.map((hand, index) => {
    const id = index as PlayerId;
    const isHuman = id === HUMAN_SEAT;
    return { id, name: isHuman ? "あなた" : `CPU ${id}`, isHuman, hand };
  });
}

// 配札が済んだ、宣言（せり）開始時点のゲーム状態を作る。配り直し(FR-05)でも同じ関数を使う。
export function setupDeal(rng: Rng): GameState {
  const { hands, widow } = dealCards(shuffleDeck(createDeck(), rng));

  return {
    phase: "declaration",
    players: createPlayers(hands),
    widow,

    declarations: [],
    trumpSuit: null,
    declaredCount: null,

    napoleonId: null,
    fukukanCard: null,
    fukukanId: null,
    hitoridachi: false,
    fukukanRevealed: false,

    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],

    turnOrder: [0, 1, 2, 3, 4],
  };
}
