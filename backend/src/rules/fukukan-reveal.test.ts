import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { revealFukukanIfPlayed } from "./fukukan-reveal.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "trick",
    players: PLAYER_IDS.map(createPlayer),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 12,
    napoleonId: 0,
    fukukanCard: { type: "normal", suit: "heart", rank: "Q" },
    fukukanId: 3,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const SPADE_FIVE: Card = { type: "normal", suit: "spade", rank: 5 };
const JOKER: Card = { type: "joker" };

describe("revealFukukanIfPlayed", () => {
  it("副官指定カードが出されたら公開される", () => {
    const state = createState();

    const result = revealFukukanIfPlayed(state, HEART_QUEEN);

    expect(result.fukukanRevealed).toBe(true);
  });

  it("値が同じ別オブジェクトのカードでも公開される（===ではなく中身で比較）", () => {
    const state = createState();

    const result = revealFukukanIfPlayed(state, { type: "normal", suit: "heart", rank: "Q" });

    expect(result.fukukanRevealed).toBe(true);
  });

  it("違うカードが出されても公開されない", () => {
    const state = createState();

    const result = revealFukukanIfPlayed(state, SPADE_FIVE);

    expect(result.fukukanRevealed).toBe(false);
  });

  it("ジョーカーが出されても公開されない（指定カードがジョーカーでなければ）", () => {
    const state = createState();

    const result = revealFukukanIfPlayed(state, JOKER);

    expect(result.fukukanRevealed).toBe(false);
  });

  it("既に公開済みなら何もしない", () => {
    const state = createState({ fukukanRevealed: true });

    const result = revealFukukanIfPlayed(state, SPADE_FIVE);

    expect(result).toEqual(state);
  });

  it("独り立ち(hitoridachi)の状態でも、指定カードが出されれば公開される", () => {
    const state = createState({ fukukanId: null, hitoridachi: true });

    const result = revealFukukanIfPlayed(state, HEART_QUEEN);

    expect(result.fukukanRevealed).toBe(true);
  });

  it("元のstateは変更しない", () => {
    const state = createState();

    revealFukukanIfPlayed(state, HEART_QUEEN);

    expect(state.fukukanRevealed).toBe(false);
  });
});
