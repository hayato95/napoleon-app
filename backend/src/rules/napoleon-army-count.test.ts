import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId, Rank, Suit, Trick } from "../types.js";
import { countNapoleonArmyFaceCards } from "./napoleon-army-count.js";

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

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

// 1トリック目の勝者だけが意味を持つトリック履歴を作る（中身のカードはこの関数では見ないので空）
function historyWithFirstWinner(winnerId: PlayerId): Trick[] {
  return [{ leaderId: 0, plays: [], winnerId }];
}

describe("countNapoleonArmyFaceCards", () => {
  it("ナポレオンと副官の獲得枚数を合計し、連合軍の獲得札は数えない", () => {
    const state = createState({
      napoleonId: 0,
      fukukanId: 2,
      capturedCards: {
        0: [card("heart", "A"), card("heart", "K"), card("heart", "Q")], // ナポレオン 3枚
        1: [card("club", "A")], // 連合軍
        2: [card("diamond", "J"), card("diamond", 10)], // 副官 2枚
        3: [card("club", "K")], // 連合軍
        4: [], // 連合軍
      },
    });

    expect(countNapoleonArmyFaceCards(state)).toBe(5);
  });

  it("独り立ちなら、ナポレオン1人分だけを数える", () => {
    const state = createState({
      napoleonId: 0,
      fukukanId: null,
      hitoridachi: true,
      capturedCards: {
        0: [card("heart", "A"), card("heart", "K")],
        1: [card("club", "A")],
        2: [card("diamond", "J")],
        3: [],
        4: [],
      },
    });

    expect(countNapoleonArmyFaceCards(state)).toBe(2);
  });

  it("1トリック目の勝者がナポレオン軍なら、捨て札の絵札も足す", () => {
    const state = createState({
      napoleonId: 0,
      fukukanId: 2,
      trickHistory: historyWithFirstWinner(2), // 副官が1トリック目に勝った
      capturedCards: { 0: [card("heart", "A")], 1: [], 2: [], 3: [], 4: [] },
      discardedCards: [card("spade", "K"), card("club", 10)],
    });

    expect(countNapoleonArmyFaceCards(state)).toBe(3);
  });

  it("1トリック目の勝者が連合軍なら、捨て札の絵札は足さない", () => {
    const state = createState({
      napoleonId: 0,
      fukukanId: 2,
      trickHistory: historyWithFirstWinner(3), // 連合軍が1トリック目に勝った
      capturedCards: { 0: [card("heart", "A")], 1: [], 2: [], 3: [], 4: [] },
      discardedCards: [card("spade", "K"), card("club", 10)],
    });

    expect(countNapoleonArmyFaceCards(state)).toBe(1);
  });

  it("ナポレオンが決まっていなければエラー", () => {
    const state = createState({ napoleonId: null });

    expect(() => countNapoleonArmyFaceCards(state)).toThrow("ナポレオンが決まっていない");
  });
});