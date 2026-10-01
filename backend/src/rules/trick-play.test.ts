import { describe, expect, it } from "vitest";
import type { Card, GameState } from "../types.js";
import { playCard } from "./trick-play.js";

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "trick",
    players: [
      { id: 0, name: "Player 0", isHuman: true, hand: [] },
      { id: 1, name: "Player 1", isHuman: true, hand: [] },
      { id: 2, name: "Player 2", isHuman: true, hand: [] },
      { id: 3, name: "Player 3", isHuman: true, hand: [] },
      { id: 4, name: "Player 4", isHuman: true, hand: [] },
    ],
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 10,
    napoleonId: 0,
    fukukanCard: null,
    fukukanId: null,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const CLUB_TWO: Card = { type: "normal", suit: "club", rank: 2 };

describe("playCard", () => {
  it("FR-12: フォローで副官指定カードを出すと、副官が公開される", () => {
    const state = createState({
      fukukanCard: HEART_QUEEN,
      fukukanId: 3,
      currentTrick: {
        leaderId: 0,
        plays: [{ playerId: 0, card: CLUB_TWO }],
      },
      players: [
        { id: 0, name: "Player 0", isHuman: true, hand: [] },
        { id: 1, name: "Player 1", isHuman: true, hand: [HEART_QUEEN] },
        { id: 2, name: "Player 2", isHuman: true, hand: [] },
        { id: 3, name: "Player 3", isHuman: true, hand: [] },
        { id: 4, name: "Player 4", isHuman: true, hand: [] },
      ],
    });

    const result = playCard(state, 1, HEART_QUEEN);

    expect(result.fukukanRevealed).toBe(true);
  });

  it("FR-20: トリックが完了すると、勝者がそのトリックの絵札をまとめて獲得する", () => {
    const SPADE_A: Card = { type: "normal", suit: "spade", rank: "A" }; // オールマイティ（絵札）
    const HEART_K: Card = { type: "normal", suit: "heart", rank: "K" }; // 絵札（プレイヤー1が出す）
    const CLUB_TWO_CARD: Card = { type: "normal", suit: "club", rank: 2 };
    const DIAMOND_FIVE: Card = { type: "normal", suit: "diamond", rank: 5 };
    const CLUB_SEVEN: Card = { type: "normal", suit: "club", rank: 7 }; // 絵札ではない

    const state = createState({
      currentTrick: {
        leaderId: 0,
        plays: [
          { playerId: 0, card: SPADE_A },
          { playerId: 1, card: HEART_K },
          { playerId: 2, card: CLUB_TWO_CARD },
          { playerId: 3, card: DIAMOND_FIVE },
        ],
      },
      players: [
        { id: 0, name: "Player 0", isHuman: true, hand: [] },
        { id: 1, name: "Player 1", isHuman: true, hand: [] },
        { id: 2, name: "Player 2", isHuman: true, hand: [] },
        { id: 3, name: "Player 3", isHuman: true, hand: [] },
        { id: 4, name: "Player 4", isHuman: true, hand: [CLUB_SEVEN] },
      ],
    });

    const result = playCard(state, 4, CLUB_SEVEN);

    // スペードA（オールマイティ）が最強なので、リードしたplayer 0が勝つ
    expect(result.trickHistory[0].winnerId).toBe(0);
    // 勝者はトリック中の絵札(スペードA・ハートK)を、誰が出したかに関わらずまとめて獲得する
    expect(result.capturedCards[0]).toEqual([SPADE_A, HEART_K]);
  });
});
