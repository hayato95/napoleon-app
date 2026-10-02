import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "../types.js";
import { cpuDiscardCards, isFirstTrickWinner } from "./cpu-discard.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

const joker: Card = { type: "joker" };
const mighty = card("spade", "A");

describe("isFirstTrickWinner", () => {
  it("ジョーカーとマイティは常に勝ち札", () => {
    expect(isFirstTrickWinner(joker, "heart")).toBe(true);
    expect(isFirstTrickWinner(mighty, "heart")).toBe(true);
    expect(isFirstTrickWinner(mighty, "spade")).toBe(true);
  });

  it("正Jは切り札が♠以外なら勝ち札、♠なら勝ち札ではない", () => {
    expect(isFirstTrickWinner(card("heart", "J"), "heart")).toBe(true);
    expect(isFirstTrickWinner(card("spade", "J"), "spade")).toBe(false);
  });

  it("裏Jは♠のJでなければ勝ち札、♠のJ（切り札♣）なら勝ち札ではない", () => {
    expect(isFirstTrickWinner(card("diamond", "J"), "heart")).toBe(true);
    expect(isFirstTrickWinner(card("club", "J"), "spade")).toBe(true);
    expect(isFirstTrickWinner(card("spade", "J"), "club")).toBe(false);
  });

  it("役札でないJは勝ち札ではない", () => {
    expect(isFirstTrickWinner(card("club", "J"), "heart")).toBe(false);
  });

  it("切り札でないAは勝ち札。ただし裏Jと同じスートのAと、切り札のAは勝ち札ではない", () => {
    expect(isFirstTrickWinner(card("club", "A"), "heart")).toBe(true);
    expect(isFirstTrickWinner(card("diamond", "A"), "heart")).toBe(false); // 裏J(♦J)に取られる
    expect(isFirstTrickWinner(card("heart", "A"), "heart")).toBe(false); // 切り札のA
  });

  it("それ以外のカードは勝ち札ではない", () => {
    expect(isFirstTrickWinner(card("club", "K"), "heart")).toBe(false);
    expect(isFirstTrickWinner(card("heart", 2), "heart")).toBe(false);
  });
});

describe("cpuDiscardCards", () => {
  it("手札が13枚でなければエラー", () => {
    const hand = [card("club", 2), card("club", 3), card("club", 4)];
    expect(() => cpuDiscardCards(hand, "heart", mighty, 0.5)).toThrow();
  });

  it("受け取った手札は書き換えない（枚数も並びもそのまま）", () => {
    const hand = [
      card("heart", "Q"), card("club", "A"), card("club", 10), card("spade", 10), card("club", "J"),
      card("club", 4), card("spade", 5), card("heart", 6), card("diamond", 2), card("diamond", 3),
      card("diamond", 4), card("diamond", "K"), card("spade", "K"),
    ];
    const before = [...hand];
    cpuDiscardCards(hand, "diamond", mighty, 0.9);
    expect(hand).toEqual(before);
  });

  describe("勝ち札がない → 乱数に関係なく通常モード", () => {
    // 切り札♥。勝ち札なし（♦Aは裏J(♦J)のスートのAなので勝ち札ではない）
    // スートの枚数: ♣4枚・♦4枚・♥3枚・♠2枚
    const hand = [
      card("club", 5), card("club", 3), card("diamond", 3), card("diamond", 7), card("spade", 3),
      card("club", 2), card("diamond", 10), card("heart", 2), card("heart", 5), card("heart", "K"),
      card("club", "K"), card("spade", "K"), card("diamond", "A"),
    ];

    it("切り札でない数字の小さい順。同じ数字・同じ枚数なら♣が先", () => {
      expect(cpuDiscardCards(hand, "heart", mighty, 0.99)).toEqual([
        card("club", 3),
        card("diamond", 3),
        card("club", 5),
      ]);
    });
  });

  it("同じ数字なら、手札で枚数が少ないスートから捨てる", () => {
    // 切り札♥。♣は3枚・♦は2枚なので、3は♦3が先
    const hand = [
      card("club", 3), card("club", 8), card("club", "K"), card("diamond", 3), card("diamond", "K"),
      card("spade", 6), card("spade", 7), card("spade", 8), card("spade", 9), card("spade", "K"),
      card("heart", 2), card("heart", 4), card("heart", "K"),
    ];
    expect(cpuDiscardCards(hand, "heart", mighty, 0.99)).toEqual([
      card("diamond", 3),
      card("club", 3),
      card("spade", 6),
    ]);
  });

  it("通常モード: 切り札でない3〜9 → ♠3 → 2 の順", () => {
    // 切り札♥。勝ち札なし
    const hand = [
      card("spade", 3), card("club", 2), card("diamond", 9), card("heart", 5), card("heart", 6),
      card("heart", 7), card("heart", 8), card("heart", 9), card("heart", 10), card("heart", "K"),
      card("club", "K"), card("diamond", "K"), card("spade", "K"),
    ];
    expect(cpuDiscardCards(hand, "heart", mighty, 0.99)).toEqual([
      card("diamond", 9),
      card("spade", 3),
      card("club", 2),
    ]);
  });

  describe("勝ち札がある → 40%未満なら通常モード、40%以上なら積極モード", () => {
    // 切り札♥。勝ち札は♣Aだけ
    const hand = [
      card("club", "A"), card("club", 10), card("diamond", "Q"), card("spade", "J"), card("club", 4),
      card("diamond", 5), card("spade", 6), card("club", 2), card("spade", 3), card("heart", 3),
      card("heart", 4), card("heart", "K"), card("diamond", "K"),
    ];

    it("0.39なら通常モード（切り札でない数字から）", () => {
      expect(cpuDiscardCards(hand, "heart", card("heart", "J"), 0.39)).toEqual([
        card("club", 4),
        card("diamond", 5),
        card("spade", 6),
      ]);
    });

    it("ちょうど0.4なら積極モード（切り札でない10 → J → Q）", () => {
      expect(cpuDiscardCards(hand, "heart", card("heart", "J"), 0.4)).toEqual([
        card("club", 10),
        card("spade", "J"),
        card("diamond", "Q"),
      ]);
    });
  });

  describe("積極モードの♥Q", () => {
    // 切り札♦。勝ち札は♣A。スートの枚数: ♣4枚・♠3枚
    const hand = [
      card("heart", "Q"), card("club", "A"), card("club", 10), card("spade", 10), card("club", "J"),
      card("club", 4), card("spade", 5), card("heart", 6), card("diamond", 2), card("diamond", 3),
      card("diamond", 4), card("diamond", "K"), card("spade", "K"),
    ];

    it("副官指定カードがマイティなら、♥Qを最初に捨てる（10は枚数の少ない♠が先）", () => {
      expect(cpuDiscardCards(hand, "diamond", mighty, 0.9)).toEqual([
        card("heart", "Q"),
        card("spade", 10),
        card("club", 10),
      ]);
    });

    it("副官指定カードがマイティでなければ、♥Qは先に捨てない", () => {
      expect(cpuDiscardCards(hand, "diamond", card("diamond", "J"), 0.9)).toEqual([
        card("spade", 10),
        card("club", 10),
        card("club", "J"),
      ]);
    });

    it("副官指定カードが null でも落ちない（♥Qは先に捨てない）", () => {
      expect(cpuDiscardCards(hand, "diamond", null, 0.9)).toEqual([
        card("spade", 10),
        card("club", 10),
        card("club", "J"),
      ]);
    });

    it("通常モードなら、副官指定カードがマイティでも♥Qを先に捨てない", () => {
      expect(cpuDiscardCards(hand, "diamond", mighty, 0.1)).toEqual([
        card("club", 4),
        card("spade", 5),
        card("heart", 6),
      ]);
    });

    it("♥が切り札でも、副官指定カードがマイティなら♥Qを最初に捨てる", () => {
      const heartTrumpHand = [
        card("heart", "Q"), card("club", "A"), card("club", 10), card("club", 4), card("spade", 5),
        card("spade", 7), card("diamond", 2), card("heart", 2), card("heart", 3), card("heart", 4),
        card("diamond", "K"), card("spade", "K"), card("club", "K"),
      ];
      expect(cpuDiscardCards(heartTrumpHand, "heart", mighty, 0.9)).toEqual([
        card("heart", "Q"),
        card("club", 10),
        card("club", 4),
      ]);
    });

    it("独り立ち（マイティを自分で持っている）でも♥Qを捨て、マイティは捨てない", () => {
      const soloHand = [
        mighty, card("heart", "Q"), card("club", 10), card("club", 4), card("spade", 5),
        card("spade", 7), card("diamond", 2), card("heart", 2), card("heart", 3), card("heart", 4),
        card("diamond", "K"), card("spade", "K"), card("club", "K"),
      ];
      const result = cpuDiscardCards(soloHand, "heart", mighty, 0.9);
      expect(result).toEqual([card("heart", "Q"), card("club", 10), card("club", 4)]);
      expect(result).not.toContainEqual(mighty);
    });
  });

  it("切り札が♠のとき、切り札の中で♠3は♠2のすぐ次には捨てない", () => {
    // 手札が全部♠（♠A=マイティが勝ち札）。0.1なので通常モード
    const allSpades: Card[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"].map((rank) =>
      card("spade", rank as Rank),
    );
    expect(cpuDiscardCards(allSpades, "spade", card("heart", "A"), 0.1)).toEqual([
      card("spade", 2),
      card("spade", 4),
      card("spade", 5),
    ]);
  });

  it("役札（裏J・正J・ジョーカー・マイティ）は、ほかのカードが足りていれば捨てない", () => {
    // 切り札♥。役札4枚＋切り札の数字
    const hand = [
      mighty, joker, card("heart", "J"), card("diamond", "J"), card("heart", 2),
      card("heart", 3), card("heart", 4), card("heart", 5), card("heart", 6), card("heart", 7),
      card("heart", 8), card("heart", 9), card("heart", 10),
    ];
    expect(cpuDiscardCards(hand, "heart", card("club", "A"), 0.9)).toEqual([
      card("heart", 2),
      card("heart", 3),
      card("heart", 4),
    ]);
  });
});