import { describe, expect, it } from "vitest";
import type { Card, GameState, PlayerId, Rank, Suit, Trick } from "../types.js";
import { judgeGameResult } from "./game-result.js";
import { summarizeResult } from "./result-summary.js";

const c = (suit: Suit, rank: Rank): Card => ({ type: "normal", suit, rank });
const IDS: PlayerId[] = [0, 1, 2, 3, 4];

// ナポレオン=0番、副官=3番。1トリック目の勝者は引数で指定する
function createState(firstTrickWinner: PlayerId | undefined, overrides: Partial<GameState> = {}): GameState {
  const firstTrick: Trick | null =
    firstTrickWinner === undefined ? null : { leaderId: 0, plays: [], winnerId: firstTrickWinner };
  return {
    phase: "result",
    players: IDS.map((id) => ({ id, name: `p${id}`, isHuman: id === 0, hand: [] })),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 13,
    napoleonId: 0,
    fukukanCard: c("heart", "A"),
    fukukanId: 3,
    hitoridachi: false,
    fukukanRevealed: true,
    currentTrick: null,
    trickHistory: firstTrick === null ? [] : [firstTrick],
    capturedCards: {
      0: [c("club", "A"), c("club", "K")],
      1: [c("diamond", "Q")],
      2: [c("diamond", "J"), c("diamond", 10)],
      3: [c("heart", "A")],
      4: [],
    },
    discardedCards: [c("heart", "K"), c("heart", "J")],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

describe("FR-42: summarizeResult", () => {
  it("ナポレオン軍はナポレオンと副官、連合軍はそれ以外のメンバーになる", () => {
    const summary = summarizeResult(createState(1));
    expect(summary.napoleonArmy.memberIds).toEqual([0, 3]);
    expect(summary.alliedArmy.memberIds).toEqual([1, 2, 4]);
    expect(summary.hitoridachi).toBe(false);
  });

  it("各軍の獲得した絵札は、メンバーの獲得分をまとめたものになる", () => {
    const summary = summarizeResult(createState(1));
    expect(summary.napoleonArmy.capturedCards).toEqual([c("club", "A"), c("club", "K"), c("heart", "A")]);
    expect(summary.alliedArmy.capturedCards).toEqual([c("diamond", "Q"), c("diamond", "J"), c("diamond", 10)]);
  });

  it("1トリック目の勝者が連合軍なら、捨て札の絵札は連合軍に入る", () => {
    const summary = summarizeResult(createState(1));
    expect(summary.alliedArmy.discardBonusCards).toEqual([c("heart", "K"), c("heart", "J")]);
    expect(summary.napoleonArmy.discardBonusCards).toEqual([]);
  });

  it("1トリック目の勝者がナポレオン軍（副官も含む）なら、捨て札の絵札はナポレオン軍に入る", () => {
    for (const winner of [0, 3] as PlayerId[]) {
      const summary = summarizeResult(createState(winner));
      expect(summary.napoleonArmy.discardBonusCards).toHaveLength(2);
      expect(summary.alliedArmy.discardBonusCards).toEqual([]);
    }
  });

  it("独り立ちなら、ナポレオン軍はナポレオン1人で、残り4人が連合軍になる", () => {
    const summary = summarizeResult(createState(1, { fukukanId: null, hitoridachi: true }));
    expect(summary.napoleonArmy.memberIds).toEqual([0]);
    expect(summary.alliedArmy.memberIds).toEqual([1, 2, 3, 4]);
    expect(summary.hitoridachi).toBe(true);
  });

  it("トリックが無ければ、捨て札の絵札はどちらにも入らない", () => {
    const summary = summarizeResult(createState(undefined));
    expect(summary.napoleonArmy.discardBonusCards).toEqual([]);
    expect(summary.alliedArmy.discardBonusCards).toEqual([]);
  });

  it("ナポレオン軍の枚数が、勝敗判定(FR-27)で使う枚数と一致する", () => {
    for (const winner of IDS) {
      const state = createState(winner);
      const { napoleonArmy } = summarizeResult(state);
      expect(napoleonArmy.capturedCards.length + napoleonArmy.discardBonusCards.length).toBe(
        judgeGameResult(state).napoleonArmyCount,
      );
    }
  });

  it("ナポレオンが決まっていなければエラー", () => {
    expect(() => summarizeResult(createState(1, { napoleonId: null }))).toThrow();
  });

  it("元の状態を書き換えない", () => {
    const state = createState(1);
    const before = JSON.stringify(state);
    summarizeResult(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});
