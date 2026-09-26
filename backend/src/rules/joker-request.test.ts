import { describe, expect, it } from "vitest";
import type { Card, PlayerId, Rank, Suit, TrickPlay } from "../types.js";
import { isJokerForced } from "./joker-request.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

function play(playerId: PlayerId, suit: Suit, rank: Rank): TrickPlay {
  return { playerId, card: card(suit, rank) };
}

const joker: Card = { type: "joker" };

describe("isJokerForced", () => {
  it("親がスペードの3を出していて、手札にジョーカーがあれば true", () => {
    const hand = [card("heart", 5), joker];
    const plays = [play(0, "spade", 3)];

    expect(isJokerForced(hand, plays)).toBe(true);
  });

  it("スペードの3が親以外(トリックの途中)で出ていても true", () => {
    const hand = [card("club", 9), joker];
    const plays = [play(0, "heart", "K"), play(1, "spade", 3)];

    expect(isJokerForced(hand, plays)).toBe(true);
  });

  it("台札のスートを持っていても、スペードの3が出ていてジョーカーがあれば true", () => {
    const hand = [card("heart", 5), card("heart", 9), joker];
    const plays = [play(0, "heart", "K"), play(1, "spade", 3)];

    expect(isJokerForced(hand, plays)).toBe(true);
  });

  it("スペードの3が出ていても、手札にジョーカーがなければ false", () => {
    const hand = [card("heart", 5), card("club", 9)];
    const plays = [play(0, "spade", 3)];

    expect(isJokerForced(hand, plays)).toBe(false);
  });

  it("手札にジョーカーがあっても、スペードの3が出ていなければ false", () => {
    const hand = [card("heart", 5), joker];
    const plays = [play(0, "spade", 4), play(1, "club", 3)];

    expect(isJokerForced(hand, plays)).toBe(false);
  });

  it("スペード以外の3では false", () => {
    const hand = [joker];
    const plays = [play(0, "heart", 3), play(1, "diamond", 3), play(2, "club", 3)];

    expect(isJokerForced(hand, plays)).toBe(false);
  });

  it("親(まだ誰も出していない)のときは false", () => {
    const hand = [joker, card("spade", 3)];

    expect(isJokerForced(hand, [])).toBe(false);
  });

  it("親がジョーカーでリードした後にスペードの3が出ても、ジョーカーはもう場にあるので false", () => {
    const hand = [card("spade", 5)];
    const plays: TrickPlay[] = [{ playerId: 0, card: joker }, play(1, "spade", 3)];

    expect(isJokerForced(hand, plays)).toBe(false);
  });
});