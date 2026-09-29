import { describe, expect, it } from "vitest";
import type { Card, TrickPlay } from "../types.js";
import { canPlayCard } from "./card-follow.js";

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const HEART_KING: Card = { type: "normal", suit: "heart", rank: "K" };
const SPADE_ACE: Card = { type: "normal", suit: "spade", rank: "A" };
const DIAMOND_KING: Card = { type: "normal", suit: "diamond", rank: "K" };
const JOKER: Card = { type: "joker" };

describe("canPlayCard", () => {
  it("同じスートを持っている場合、別スートのカードは出せない", () => {
    const hand: Card[] = [HEART_KING, SPADE_ACE];
    const plays: TrickPlay[] = [
      { playerId: 0, card: HEART_QUEEN },
    ];

    expect(canPlayCard(hand, plays, SPADE_ACE)).toBe(false);
  });

  it("同じスートを持っている場合、そのスートのカードは出せる", () => {
    const hand: Card[] = [HEART_KING, SPADE_ACE];
    const plays: TrickPlay[] = [
      { playerId: 0, card: HEART_QUEEN },
    ];

    expect(canPlayCard(hand, plays, HEART_KING)).toBe(true);
  });

  it("リードスートを持っていない場合、別スートのカードを出せる", () => {
    const hand: Card[] = [SPADE_ACE, DIAMOND_KING];
    const plays: TrickPlay[] = [
      { playerId: 0, card: HEART_QUEEN },
    ];

    expect(canPlayCard(hand, plays, SPADE_ACE)).toBe(true);
  });

  it("ジョーカーでリードされた場合、指定スートを持っていれば別スートのカードは出せない", () => {
    const hand: Card[] = [DIAMOND_KING, SPADE_ACE];
    const plays: TrickPlay[] = [
      { playerId: 0, card: JOKER },
    ];

    expect(canPlayCard(hand, plays, SPADE_ACE, "diamond")).toBe(false);
  });

  it("ジョーカーでリードされた場合、指定スートのカードは出せる", () => {
    const hand: Card[] = [DIAMOND_KING, SPADE_ACE];
    const plays: TrickPlay[] = [
      { playerId: 0, card: JOKER },
    ];

    expect(canPlayCard(hand, plays, DIAMOND_KING, "diamond")).toBe(true);
  });
});