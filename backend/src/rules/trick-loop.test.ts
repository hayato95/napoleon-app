import { describe, expect, it } from "vitest";
import type { GameState, Player, PlayerId, Trick } from "../types.js";
import { finishRoundIfAllTricksDone, TOTAL_TRICKS } from "./trick-loop.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "trick",
    players: PLAYER_IDS.map((id) => createPlayer(id)),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 12,
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

// 終わったトリックを count 回分作る。この関数は「何回終わったか」しか見ないので、
// 中身（出されたカード）は空でよい
function createFinishedTricks(count: number): Trick[] {
  return Array.from({ length: count }, () => ({ leaderId: 0, plays: [], winnerId: 0 }));
}

describe("finishRoundIfAllTricksDone", () => {
  it("1局のトリック数は10回", () => {
    expect(TOTAL_TRICKS).toBe(10);
  });

  it("10トリック終わったら、勝敗判定(result)フェーズに進む", () => {
    const state = createState({ trickHistory: createFinishedTricks(10) });

    const result = finishRoundIfAllTricksDone(state);

    expect(result.phase).toBe("result");
  });

  it("9トリックまでは、トリック(trick)フェーズのまま続ける", () => {
    const state = createState({ trickHistory: createFinishedTricks(9) });

    const result = finishRoundIfAllTricksDone(state);

    expect(result.phase).toBe("trick");
  });

  it("元のstateは書き換えない（新しいstateを返す）", () => {
    const state = createState({ trickHistory: createFinishedTricks(10) });

    finishRoundIfAllTricksDone(state);

    expect(state.phase).toBe("trick");
  });
});