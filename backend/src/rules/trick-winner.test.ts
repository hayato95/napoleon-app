import { describe, expect, it } from "vitest";
import type { GameState, Trick } from "../types.js";
import { determineTrickWinner } from "./trick-winner.js";

function createState(): GameState {
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
    capturedCards: {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
},
discardedCards: [],
turnOrder: [0, 1, 2, 3, 4],
  };
}

describe("determineTrickWinner", () => {
  it("オールマイティ（♠A）が勝つ", () => {
    const state = createState();

    const trick: Trick = {
      leaderId: 0,
      plays: [
        { playerId: 0, card: { type: "normal", suit: "heart", rank: "A" } },
        { playerId: 1, card: { type: "normal", suit: "spade", rank: "A" } },
        { playerId: 2, card: { type: "normal", suit: "heart", rank: "K" } },
        { playerId: 3, card: { type: "normal", suit: "heart", rank: 10 } },
        { playerId: 4, card: { type: "normal", suit: "club", rank: "A" } },
      ],
    };

    expect(determineTrickWinner(state, trick)).toBe(1);
  });

  it("ジョーカーが勝つ", () => {
    const state = createState();

    const trick: Trick = {
      leaderId: 0,
      plays: [
        { playerId: 0, card: { type: "normal", suit: "heart", rank: "A" } },
        { playerId: 1, card: { type: "joker" } },
        { playerId: 2, card: { type: "normal", suit: "spade", rank: "K" } },
        { playerId: 3, card: { type: "normal", suit: "heart", rank: "K" } },
        { playerId: 4, card: { type: "normal", suit: "club", rank: "A" } },
      ],
    };

    expect(determineTrickWinner(state, trick)).toBe(1);
  });

  it("切り札がリードスートより強い", () => {
    const state = createState();

    const trick: Trick = {
      leaderId: 0,
      plays: [
        { playerId: 0, card: { type: "normal", suit: "heart", rank: "A" } },
        { playerId: 1, card: { type: "normal", suit: "spade", rank: 2 } },
        { playerId: 2, card: { type: "normal", suit: "heart", rank: "K" } },
        { playerId: 3, card: { type: "normal", suit: "heart", rank: "Q" } },
        { playerId: 4, card: { type: "normal", suit: "club", rank: "A" } },
      ],
    };

    expect(determineTrickWinner(state, trick)).toBe(1);
  });

  it("同じリードスートなら数字の強いカードが勝つ", () => {
    const state = createState();

    const trick: Trick = {
      leaderId: 0,
      plays: [
        { playerId: 0, card: { type: "normal", suit: "heart", rank: 10 } },
        { playerId: 1, card: { type: "normal", suit: "heart", rank: "A" } },
        { playerId: 2, card: { type: "normal", suit: "heart", rank: "K" } },
        { playerId: 3, card: { type: "normal", suit: "club", rank: "A" } },
        { playerId: 4, card: { type: "normal", suit: "heart", rank: 2 } },
      ],
    };

    expect(determineTrickWinner(state, trick)).toBe(1);
  });

  it("よろめきが成立すると♥Qが勝つ", () => {
    const state = createState();

    const trick: Trick = {
      leaderId: 0,
      plays: [
        { playerId: 0, card: { type: "normal", suit: "spade", rank: "A" } },
        { playerId: 1, card: { type: "normal", suit: "heart", rank: "Q" } },
        { playerId: 2, card: { type: "normal", suit: "heart", rank: "K" } },
        { playerId: 3, card: { type: "normal", suit: "heart", rank: 10 } },
        { playerId: 4, card: { type: "normal", suit: "club", rank: "A" } },
      ],
    };

    expect(determineTrickWinner(state, trick)).toBe(1);
  });
});


it("Same2が成立するとリードスートより強い", () => {
  const state = createState();

  state.trickHistory = [
    {
      leaderId: 0,
      plays: [],
      winnerId: 0,
    },
  ];

  const trick: Trick = {
    leaderId: 0,
    plays: [
      { playerId: 0, card: { type: "normal", suit: "heart", rank: 2 } },
      { playerId: 1, card: { type: "normal", suit: "heart", rank: "A" } },
      { playerId: 2, card: { type: "normal", suit: "heart", rank: "K" } },
      { playerId: 3, card: { type: "normal", suit: "heart", rank: "Q" } },
      { playerId: 4, card: { type: "normal", suit: "heart", rank: 10 } },
    ],
  };


  expect(determineTrickWinner(state, trick)).toBe(0);
});