import { describe, expect, it } from "vitest";
import { cardsEqual } from "./rules/trick-start.js";
import { createDeck, dealCards, HUMAN_SEAT, setupDeal, shuffleDeck } from "./deal.js";
import { seededRng } from "./test-helpers.js";

describe("deal: デッキと配札", () => {
  it("デッキは53枚（52枚＋ジョーカー1枚）で、重複がない", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(53);
    expect(deck.filter((card) => card.type === "joker")).toHaveLength(1);
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        expect(cardsEqual(deck[i], deck[j])).toBe(false);
      }
    }
  });

  it("シャッフルしても枚数と中身は変わらず、元の配列は書き換えない", () => {
    const deck = createDeck();
    const before = [...deck];
    const shuffled = shuffleDeck(deck, seededRng(1));
    expect(deck).toEqual(before);
    expect(shuffled).toHaveLength(53);
    expect(shuffled.every((card) => deck.some((original) => cardsEqual(original, card)))).toBe(true);
  });

  it("同じシードなら同じ並びになり、シードが違えば並びが変わる", () => {
    expect(shuffleDeck(createDeck(), seededRng(7))).toEqual(shuffleDeck(createDeck(), seededRng(7)));
    expect(shuffleDeck(createDeck(), seededRng(7))).not.toEqual(shuffleDeck(createDeck(), seededRng(8)));
  });

  it("5人に10枚ずつ配り、残り3枚が場札になる", () => {
    const { hands, widow } = dealCards(createDeck());
    expect(hands).toHaveLength(5);
    for (const hand of hands) {
      expect(hand).toHaveLength(10);
    }
    expect(widow).toHaveLength(3);
  });
});

describe("deal: setupDeal", () => {
  it("宣言フェーズから始まり、人間は席0だけで残り4人はCPU", () => {
    const state = setupDeal(seededRng(1));
    expect(state.phase).toBe("declaration");
    expect(state.players.map((player) => player.isHuman)).toEqual([true, false, false, false, false]);
    expect(state.players[HUMAN_SEAT].isHuman).toBe(true);
    expect(state.turnOrder).toEqual([0, 1, 2, 3, 4]);
    expect(state.widow).toHaveLength(3);
  });

  it("手札と場札の合計は53枚で、全部違うカード", () => {
    const state = setupDeal(seededRng(2));
    const all = [...state.players.flatMap((player) => player.hand), ...state.widow];
    expect(all).toHaveLength(53);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(cardsEqual(all[i], all[j])).toBe(false);
      }
    }
  });
});
