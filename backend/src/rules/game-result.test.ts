import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { judgeGameResult } from "./game-result.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "result",
    players: PLAYER_IDS.map((id) => createPlayer(id)),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 13,
    napoleonId: 0,
    fukukanCard: null,
    fukukanId: 2,
    hitoridachi: false,
    fukukanRevealed: true,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

// 枚数だけが大事なので、同じ絵札を count 枚並べた配列を作る
function faceCards(count: number): Card[] {
  return Array.from({ length: count }, (): Card => ({ type: "normal", suit: "heart", rank: "A" }));
}

// 宣言13枚。ナポレオン(0)と副官(2)が napoleonCount と fukukanCount 枚ずつ獲得した状態を作る
function stateWithArmyCards(napoleonCount: number, fukukanCount: number): GameState {
  return createState({
    declaredCount: 13,
    capturedCards: {
      0: faceCards(napoleonCount),
      1: faceCards(3), // 連合軍の獲得札は勝敗に関係しない
      2: faceCards(fukukanCount),
      3: [],
      4: [],
    },
  });
}

describe("judgeGameResult", () => {
  it("ナポレオン軍の合計が宣言枚数と同じなら、ナポレオン軍の勝ち", () => {
    const result = judgeGameResult(stateWithArmyCards(8, 5)); // 8 + 5 = 13

    expect(result.winner).toBe("napoleonArmy");
  });

  it("ナポレオン軍の合計が宣言枚数より多ければ、ナポレオン軍の勝ち", () => {
    const result = judgeGameResult(stateWithArmyCards(8, 6)); // 14

    expect(result.winner).toBe("napoleonArmy");
  });

  it("ナポレオン軍の合計が宣言枚数より1枚でも少なければ、連合軍の勝ち", () => {
    const result = judgeGameResult(stateWithArmyCards(8, 4)); // 12

    expect(result.winner).toBe("alliedArmy");
  });

  it("結果には、ナポレオン軍の獲得枚数と宣言枚数も入っている（リザルト画面で表示するため）", () => {
    const result = judgeGameResult(stateWithArmyCards(8, 4));

    expect(result).toEqual({ winner: "alliedArmy", napoleonArmyCount: 12, declaredCount: 13 });
  });

  it("宣言枚数が決まっていなければエラー", () => {
    const state = createState({ declaredCount: null });

    expect(() => judgeGameResult(state)).toThrow("宣言枚数が決まっていない");
  });
});