import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "../types.js";
import { CARD_STRENGTH_TIER, getCardStrength } from "./cardStrength.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

const joker: Card = { type: "joker" };

const baseContext = { trumpSuit: "diamond" as const, leadSuit: "heart" as const, isLeadCard: false };

describe("getCardStrength", () => {
  it("スペードのAはオールマイティ(tier1)、切り札やリードスートと無関係に最強", () => {
    const strength = getCardStrength(card("spade", "A"), baseContext);

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.mighty);
  });

  it("先頭で出されたジョーカーはtier2(台札のジョーカー)", () => {
    const strength = getCardStrength(joker, { ...baseContext, isLeadCard: true });

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.leadingJoker);
  });

  it("先頭でないジョーカーはtier8(その他)", () => {
    const strength = getCardStrength(joker, { ...baseContext, isLeadCard: false });

    expect(strength.tier).toBe(CARD_STRENGTH_TIER.other);
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

  it("正ジャック・裏ジャック以外のJはtier8(その他)", () => {
    // 切り札diamond、同色heart以外(spade/club)のJは特別な強さを持たない
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
});
