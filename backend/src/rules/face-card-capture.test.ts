import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId, Rank, Suit, Trick } from "../types.js";
import { captureFaceCards, isFaceCard } from "./face-card-capture.js";

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

// テストでカードを短く書くための関数。card("heart", "A") で ♡A を作る
function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

const JOKER: Card = { type: "joker" };

// 5枚のカードを、プレイヤー0→1→2→3→4の順に出したトリックを作る。
// winnerId を省略すると「まだ勝者が決まっていないトリック」になる
function createTrick(cards: Card[], winnerId?: PlayerId): Trick {
  return {
    leaderId: 0,
    plays: cards.map((c, index) => ({ playerId: PLAYER_IDS[index], card: c })),
    winnerId,
  };
}

describe("isFaceCard", () => {
  it("A・K・Q・J・10は絵札", () => {
    expect(isFaceCard(card("heart", "A"))).toBe(true);
    expect(isFaceCard(card("heart", "K"))).toBe(true);
    expect(isFaceCard(card("heart", "Q"))).toBe(true);
    expect(isFaceCard(card("heart", "J"))).toBe(true);
    expect(isFaceCard(card("heart", 10))).toBe(true);
  });

  it("9以下の数字とジョーカーは絵札ではない", () => {
    expect(isFaceCard(card("heart", 9))).toBe(false);
    expect(isFaceCard(card("heart", 2))).toBe(false);
    expect(isFaceCard(JOKER)).toBe(false);
  });

  it("オールマイティ(♠A)や正ジャックのような特別なカードも、ランクがA・Jなので絵札", () => {
    expect(isFaceCard(card("spade", "A"))).toBe(true);
    expect(isFaceCard(card("spade", "J"))).toBe(true);
  });
});

describe("captureFaceCards", () => {
  it("トリックの中の絵札を、勝者のcapturedCardsに出された順で追加する", () => {
    const state = createState();
    const trick = createTrick(
      [card("heart", "A"), card("heart", 3), card("heart", "K"), card("club", 10), card("diamond", 2)],
      2,
    );

    const result = captureFaceCards(state, trick);

    expect(result.capturedCards[2]).toEqual([card("heart", "A"), card("heart", "K"), card("club", 10)]);
  });

  it("絵札が1枚も無いトリックでは、勝者の獲得札は増えない", () => {
    const state = createState();
    const trick = createTrick(
      [card("heart", 2), card("heart", 3), JOKER, card("club", 9), card("diamond", 4)],
      2,
    );

    const result = captureFaceCards(state, trick);

    expect(result.capturedCards[2]).toEqual([]);
  });

  it("すでに獲得していた絵札は残し、その後ろに追加する", () => {
    const state = createState({
      capturedCards: { 0: [], 1: [], 2: [card("spade", "Q")], 3: [], 4: [] },
    });
    const trick = createTrick(
      [card("heart", "A"), card("heart", 3), card("heart", 4), card("heart", 5), card("heart", 6)],
      2,
    );

    const result = captureFaceCards(state, trick);

    expect(result.capturedCards[2]).toEqual([card("spade", "Q"), card("heart", "A")]);
  });

  it("勝者以外のプレイヤーのcapturedCardsは変わらない", () => {
    const state = createState({
      capturedCards: { 0: [card("diamond", "J")], 1: [], 2: [], 3: [], 4: [] },
    });
    const trick = createTrick(
      [card("heart", "A"), card("heart", 3), card("heart", 4), card("heart", 5), card("heart", 6)],
      2,
    );

    const result = captureFaceCards(state, trick);

    expect(result.capturedCards[0]).toEqual([card("diamond", "J")]);
    expect(result.capturedCards[1]).toEqual([]);
    expect(result.capturedCards[3]).toEqual([]);
    expect(result.capturedCards[4]).toEqual([]);
  });

  it("元のstateは書き換えない（新しいstateを返す）", () => {
    const state = createState({
      capturedCards: { 0: [], 1: [], 2: [card("spade", "Q")], 3: [], 4: [] },
    });
    const trick = createTrick(
      [card("heart", "A"), card("heart", 3), card("heart", 4), card("heart", 5), card("heart", 6)],
      2,
    );

    captureFaceCards(state, trick);

    expect(state.capturedCards[2]).toEqual([card("spade", "Q")]);
  });

  it("勝者が決まっていないトリックを渡したらエラー", () => {
    const state = createState();
    const trick = createTrick([
      card("heart", "A"),
      card("heart", 3),
      card("heart", 4),
      card("heart", 5),
      card("heart", 6),
    ]);

    expect(() => captureFaceCards(state, trick)).toThrow("勝者が決まっていない");
  });

  it("5人全員がカードを出し終わっていないトリックを渡したらエラー", () => {
    const state = createState();
    const trick = createTrick([card("heart", "A"), card("heart", 3), card("heart", 4), card("heart", 5)], 2);

    expect(() => captureFaceCards(state, trick)).toThrow("全員がカードを出し終わっていない");
  });
});