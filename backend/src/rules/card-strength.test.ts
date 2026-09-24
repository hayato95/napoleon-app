import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "../types.js";
import { CARD_STRENGTH_TIER, getCardStrength } from "./card-strength.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

const joker: Card = { type: "joker" };

const baseContext = { trumpSuit: "diamond" as const, leadSuit: "heart" as const };

describe("getCardStrength", () => {
  it("スペードのAはオールマイティ(tier1)、切り札やリードスートと無関係に最強", () => {
    const strength = getCardStrength(card("spade", "A"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.mighty);
  });

  it("ジョーカーは台札かどうかに関係なく常にtier2", () => {
    const strength = getCardStrength(joker, baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.joker);
  });

  it("切り札スートのJは正ジャック(tier3)", () => {
    const strength = getCardStrength(card("diamond", "J"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.correctJack);
  });

  it("切り札と同じ色のもう一方のスートのJは裏ジャック(tier4)", () => {
    // 切り札がdiamond(赤) -> 同色はheart
    const strength = getCardStrength(card("heart", "J"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.backJack);
  });

  it("正ジャック・裏ジャック以外のJで、そのスートがリードスートなら普通のカードとしてtier7になる", () => {
    // 切り札diamond、リードclub -> clubのJは正ジャックでも裏ジャックでもない普通のカード
    const strength = getCardStrength(card("club", "J"), { trumpSuit: "diamond", leadSuit: "club" });
    const clubTen = getCardStrength(card("club", 10), { trumpSuit: "diamond", leadSuit: "club" });
    const clubQueen = getCardStrength(card("club", "Q"), { trumpSuit: "diamond", leadSuit: "club" });

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.leadSuit);
    expect(strength.numberStrength).toBeGreaterThan(clubTen.numberStrength);
    expect(strength.numberStrength).toBeLessThan(clubQueen.numberStrength);
  });

  it("正ジャック・裏ジャック以外のJで、切り札でもリードスートでもなければtier8(その他)", () => {
    // 切り札diamond、リードheart -> spadeのJはどちらにも当てはまらない
    const strength = getCardStrength(card("spade", "J"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.other);
  });

  it("切り札スートのA〜2はtier5(切り札)で、ランクが高いほどnumberStrengthが大きい", () => {
    const ace = getCardStrength(card("diamond", "A"), baseContext);
    const king = getCardStrength(card("diamond", "K"), baseContext);

    expect(ace.tier).toBe(CARD_STRENGTH_TIER.trump);
    expect(king.tier).toBe(CARD_STRENGTH_TIER.trump);
    expect(ace.numberStrength).toBeGreaterThan(king.numberStrength);
  });

  it("リードと同じスートのA〜2はtier7(リードと同じスート)", () => {
    const strength = getCardStrength(card("heart", "K"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.leadSuit);
  });

  it("切り札でもリードスートでもないカードはtier8(その他)", () => {
    const strength = getCardStrength(card("club", "K"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.other);
  });

  it("切り札がそのままリードスートでもある場合、tier5(切り札)が優先される", () => {
    // 切り札diamond、リードもdiamond -> diamondのカードはtier7ではなくtier5になるべき
    const strength = getCardStrength(card("diamond", "K"), { trumpSuit: "diamond", leadSuit: "diamond" });

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.trump);
  });
});
