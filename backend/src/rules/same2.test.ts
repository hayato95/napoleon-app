import { describe, expect, it } from "vitest";
import type { Card, PlayerId, Rank, Suit, TrickPlay } from "../types.js";
import { checkSame2 } from "./same2.js";

function play(playerId: PlayerId, suit: Suit, rank: Rank): TrickPlay {
  return { playerId, card: { type: "normal", suit, rank } };
}

const joker: Card = { type: "joker" };

describe("checkSame2", () => {
  it("5枚全て同じスートで2があれば、2を出したプレイヤーを返す", () => {
    const plays = [play(0, "club", 5), play(1, "club", 2), play(2, "club", 7), play(3, "club", 9), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBe(1);
  });

  it("親がプレイヤー0以外でも、2を出した人のPlayerIdを返す(出した順番ではない)", () => {
    const plays = [play(3, "club", 5), play(4, "club", 2), play(0, "club", 7), play(1, "club", 9), play(2, "club", "K")];

    expect(checkSame2(plays, false)).toBe(4);
  });

  it("1ターン目は不成立でnull", () => {
    const plays = [play(0, "club", 5), play(1, "club", 2), play(2, "club", 7), play(3, "club", 9), play(4, "club", "K")];

    expect(checkSame2(plays, true)).toBeNull();
  });

  it("1枚でもスートが違えばnull", () => {
    const plays = [play(0, "club", 5), play(1, "club", 2), play(2, "club", 7), play(3, "heart", 9), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBeNull();
  });

  it("5枚同じスートでも2が無ければnull", () => {
    const plays = [play(0, "club", 5), play(1, "club", 3), play(2, "club", 7), play(3, "club", 9), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBeNull();
  });

  it("違うスートの2が複数あっても打ち消し合わずnull(♣5、♣2、♥2、♦2、♣K)", () => {
    const plays = [play(0, "club", 5), play(1, "club", 2), play(2, "heart", 2), play(3, "diamond", 2), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBeNull();
  });

  it("親以外がジョーカーを出していればnull", () => {
    const plays = [play(0, "club", 5), play(1, "club", 2), { playerId: 2 as const, card: joker }, play(3, "club", 9), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBeNull();
  });

  it("親がジョーカーを出していればnull", () => {
    const plays = [{ playerId: 0 as const, card: joker }, play(1, "club", 2), play(2, "club", 7), play(3, "club", 9), play(4, "club", "K")];

    expect(checkSame2(plays, false)).toBeNull();
  });
});