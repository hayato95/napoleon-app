import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "../types.js";
import { cpuFukukanNomination } from "./cpu-fukukan-nomination.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

const joker: Card = { type: "joker" };

// 候補のどれにも関係しない手札（♠3・♥Qも入っていない）
const plainHand: Card[] = [
  card("club", 2),
  card("club", 5),
  card("diamond", 4),
  card("diamond", 9),
  card("heart", 6),
  card("heart", 8),
  card("spade", 7),
  card("spade", 9),
  card("club", 10),
  card("diamond", 6),
];

describe("cpuFukukanNomination", () => {
  describe("基本（♠3も♥Qもない）: ♠A・正J・裏J・ジョーカー・切り札A の順で 60%・25%・15%", () => {
    it("0.6未満なら1番目の♠Aを選ぶ", () => {
      expect(cpuFukukanNomination(plainHand, "heart", 0.59, 0)).toEqual(card("spade", "A"));
    });

    it("ちょうど0.6なら2番目の正J（切り札♥なら♥J）を選ぶ", () => {
      expect(cpuFukukanNomination(plainHand, "heart", 0.6, 0)).toEqual(card("heart", "J"));
    });

    it("ちょうど0.85なら3番目の裏J（切り札♥なら♦J）を選ぶ", () => {
      expect(cpuFukukanNomination(plainHand, "heart", 0.85, 0)).toEqual(card("diamond", "J"));
    });

    it("候補が5つあっても4番目以降（ジョーカー・切り札A）は選ばない", () => {
      expect(cpuFukukanNomination(plainHand, "heart", 0.999, 0)).toEqual(card("diamond", "J"));
    });

    it("手札にあるカードは候補から抜いて、残りを上から詰める", () => {
      // ♠Aと♥Jを持っている → ♦J・ジョーカー・♥A
      const hand = [card("spade", "A"), card("heart", "J"), ...plainHand.slice(2)];
      expect(cpuFukukanNomination(hand, "heart", 0.1, 0)).toEqual(card("diamond", "J"));
      expect(cpuFukukanNomination(hand, "heart", 0.7, 0)).toEqual(joker);
      expect(cpuFukukanNomination(hand, "heart", 0.9, 0)).toEqual(card("heart", "A"));
    });
  });

  describe("手札に♠3がある: ジョーカーを2番目に上げる", () => {
    it("ジョーカーが2番目になる", () => {
      const hand = [card("spade", 3), ...plainHand.slice(1)];
      expect(cpuFukukanNomination(hand, "diamond", 0.7, 0)).toEqual(joker);
      expect(cpuFukukanNomination(hand, "diamond", 0.9, 0)).toEqual(card("diamond", "J"));
    });

    it("並べ替えてから手札のカードを抜く（♠Aを持っていればジョーカーが1番目になる）", () => {
      const hand = [card("spade", 3), card("spade", "A"), ...plainHand.slice(2)];
      expect(cpuFukukanNomination(hand, "heart", 0.1, 0)).toEqual(joker);
    });
  });

  describe("切り札が♠: 切り札のA（♠A）はマイティと同じなので1回しか入れない", () => {
    it("♠J・♣Jを持っていれば、候補は ♠A・ジョーカー の2つ（♠Aが2回入って3つにならない）", () => {
      // ♠Aが2回入っていると候補が3つになり、0.9 で3番目の♠Aが選ばれてしまう
      const hand = [card("spade", "J"), card("club", "J"), ...plainHand.slice(2)];
      expect(cpuFukukanNomination(hand, "spade", 0.69, 0)).toEqual(card("spade", "A"));
      expect(cpuFukukanNomination(hand, "spade", 0.9, 0)).toEqual(joker);
    });

    it("♠3を持っていれば ♠A・ジョーカー・♠J・♣J の順になる", () => {
      const hand = [card("spade", 3), ...plainHand.slice(1)];
      expect(cpuFukukanNomination(hand, "spade", 0.7, 0)).toEqual(joker);
      expect(cpuFukukanNomination(hand, "spade", 0.9, 0)).toEqual(card("spade", "J"));
    });
  });

  describe("手札に♥Qがあって♠Aがない: 85%・10%・5%", () => {
    const hand = [card("heart", "Q"), ...plainHand.slice(1)];

    it("0.85未満なら♠Aを選ぶ", () => {
      expect(cpuFukukanNomination(hand, "club", 0.84, 0)).toEqual(card("spade", "A"));
    });

    it("ちょうど0.85なら2番目、ちょうど0.95なら3番目を選ぶ", () => {
      expect(cpuFukukanNomination(hand, "club", 0.85, 0)).toEqual(card("club", "J"));
      expect(cpuFukukanNomination(hand, "club", 0.95, 0)).toEqual(card("spade", "J"));
    });

    it("♠3も持っていれば、ジョーカーを2番目にしたうえで 85%・10%・5%", () => {
      const hand2 = [card("heart", "Q"), card("spade", 3), ...plainHand.slice(2)];
      expect(cpuFukukanNomination(hand2, "diamond", 0.84, 0)).toEqual(card("spade", "A"));
      expect(cpuFukukanNomination(hand2, "diamond", 0.9, 0)).toEqual(joker);
    });

    it("♠Aも持っていれば基本の 60%・25%・15% に戻す", () => {
      // 候補: ♣J・♠J・ジョーカー・♣A。0.6 は基本なら2番目、♥Q調整なら1番目
      const hand2 = [card("heart", "Q"), card("spade", "A"), ...plainHand.slice(2)];
      expect(cpuFukukanNomination(hand2, "club", 0.6, 0)).toEqual(card("spade", "J"));
    });
  });

  describe("候補が2つ: 70%・30%（♥Qあり・♠Aなしなら 90%・10%）", () => {
    it("基本はちょうど0.7で2番目に切り替わる", () => {
      // ♠A・♥J・♦Jを持っている → ジョーカー・♥A
      const hand = [card("spade", "A"), card("heart", "J"), card("diamond", "J"), ...plainHand.slice(3)];
      expect(cpuFukukanNomination(hand, "heart", 0.69, 0)).toEqual(joker);
      expect(cpuFukukanNomination(hand, "heart", 0.7, 0)).toEqual(card("heart", "A"));
    });

    it("♥Qあり・♠Aなしはちょうど0.9で2番目に切り替わる", () => {
      // ♥J・♦J・ジョーカー・♥Qを持っている → ♠A・♥A
      const hand = [card("heart", "J"), card("diamond", "J"), joker, card("heart", "Q"), ...plainHand.slice(4)];
      expect(cpuFukukanNomination(hand, "heart", 0.89, 0)).toEqual(card("spade", "A"));
      expect(cpuFukukanNomination(hand, "heart", 0.9, 0)).toEqual(card("heart", "A"));
    });
  });

  describe("候補が1つ: 必ずそれを選ぶ", () => {
    it("残った1枚を返す", () => {
      // ♠A・♥J・♦J・ジョーカーを持っている → ♥Aだけ
      const hand = [card("spade", "A"), card("heart", "J"), card("diamond", "J"), joker, ...plainHand.slice(4)];
      expect(cpuFukukanNomination(hand, "heart", 0.999, 0.999)).toEqual(card("heart", "A"));
    });
  });

  describe("候補が0個: 50%ずつで 切り札のK か ♠A", () => {
    // ♠A・♥J・♦J・ジョーカー・♥Aを全部持っている
    const hand = [
      card("spade", "A"),
      card("heart", "J"),
      card("diamond", "J"),
      joker,
      card("heart", "A"),
      ...plainHand.slice(5),
    ];

    it("random2が0.5未満なら切り札のKを返す", () => {
      expect(cpuFukukanNomination(hand, "heart", 0, 0.49)).toEqual(card("heart", "K"));
    });

    it("random2がちょうど0.5なら♠Aを返す", () => {
      expect(cpuFukukanNomination(hand, "heart", 0, 0.5)).toEqual(card("spade", "A"));
    });

    it("切り札のKを自分で持っていても、そのままKを返す", () => {
      const handWithKing = [...hand.slice(0, 5), card("heart", "K"), ...hand.slice(6)];
      expect(cpuFukukanNomination(handWithKing, "heart", 0, 0.1)).toEqual(card("heart", "K"));
    });

    it("切り札が♠なら ♠A・♠J・♣J・ジョーカーを持っていれば0個になり、♠Kを返す", () => {
      const spadeHand = [card("spade", "A"), card("spade", "J"), card("club", "J"), joker, ...plainHand.slice(4)];
      expect(cpuFukukanNomination(spadeHand, "spade", 0, 0.1)).toEqual(card("spade", "K"));
    });
  });
});