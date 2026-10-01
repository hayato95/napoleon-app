import { describe, expect, it } from "vitest";
import type { Card, Declaration, PlayerId, Rank, Suit } from "../types.js";
import { cardsDeclarationJudgement, cpuDeclaration } from "./cpu-declaration.js";

function card(suit: Suit, rank: Rank): Card {
  return { type: "normal", suit, rank };
}

function declare(playerId: PlayerId, suit: Suit, count: number): Declaration {
  return { playerId, suit, declaredCardCount: count };
}

function pass(playerId: PlayerId): Declaration {
  return { playerId, suit: null, declaredCardCount: null };
}

const joker: Card = { type: "joker" };

// ♠が強い手札: ♠17点 / ♦13点 / ♥13点 / ♣10点（最大宣言は16枚で頭打ち）
const strongSpadeHand: Card[] = [
  card("spade", "A"),
  card("spade", "K"),
  card("spade", 10),
  card("spade", 7),
  card("spade", 3),
  card("heart", "Q"),
  card("heart", 5),
  card("diamond", "J"),
  card("club", 9),
  joker,
];

// ♥が強い手札: ♠0点 / ♦6点 / ♥15点 / ♣0点
const strongHeartHand: Card[] = [
  card("heart", "J"),
  card("diamond", "J"),
  card("heart", "A"),
  card("heart", "K"),
  card("heart", 10),
  card("heart", 9),
  card("heart", 8),
  card("club", 2),
  card("club", 3),
  card("diamond", 4),
];

// 弱い手札: 全スート0点
const weakHand: Card[] = [
  card("heart", 2),
  card("heart", 4),
  card("diamond", 5),
  card("diamond", 6),
  card("club", 7),
  card("club", 8),
  card("spade", 9),
  card("spade", 10),
  card("diamond", 9),
  card("club", 2),
];

// 全スート同点(10点)の手札: マイティ3 + ジョーカー3 + ♠3 1 + よろめき1 + 組み合わせ2
const tieHand: Card[] = [
  card("spade", "A"),
  joker,
  card("spade", 3),
  card("heart", "Q"),
  card("diamond", 2),
  card("diamond", 4),
  card("club", 5),
  card("club", 6),
  card("heart", 7),
  card("spade", 9),
];

// 乱数: 15%パスもお得パスも起きない値
const NO_PASS = 0.9;

describe("cardsDeclarationJudgement", () => {
  it("役札・組み合わせボーナス・4枚以上ボーナスを ♠♦♥♣ の順に数える", () => {
    // ♠: マイティ3 + ジョーカー3 + ♠3 1 + よろめき1 + 組み合わせ2 + ♠5枚(5+1) + K 1 = 17（Aはマイティなので加点しない）
    // ♦: 共通10 + 正J(♦J)3 = 13
    // ♥: 共通10 + 裏J(♦J)3 = 13（♥は2枚なので4枚以上ボーナスなし）
    // ♣: 共通10
    expect(cardsDeclarationJudgement(strongSpadeHand)).toEqual([17, 13, 13, 10]);
  });

  it("正J・裏J・4枚以上ボーナス・A/Kの加点をスートごとに数える", () => {
    // ♥: 正J3 + 裏J3 + ♥6枚(5+2) + A・K 2 = 15
    // ♦: 正J(♦J)3 + 裏J(♥J)3 = 6
    expect(cardsDeclarationJudgement(strongHeartHand)).toEqual([0, 6, 15, 0]);
  });

  it("役札も4枚以上のスートもなければ全部0点", () => {
    expect(cardsDeclarationJudgement(weakHand)).toEqual([0, 0, 0, 0]);
  });
});

describe("cpuDeclaration", () => {
  it("7点以下ならパスする", () => {
    expect(cpuDeclaration(weakHand, 1, [], NO_PASS, NO_PASS)).toEqual(pass(1));
  });

  it("誰も宣言していなければ、一番点の高いスートの11枚で宣言する", () => {
    expect(cpuDeclaration(strongHeartHand, 1, [], NO_PASS, NO_PASS)).toEqual(declare(1, "heart", 11));
  });

  it("同点のスートがあれば ♠♦♥♣ の順で前のスートを選ぶ", () => {
    expect(cardsDeclarationJudgement(tieHand)).toEqual([10, 10, 10, 10]);
    expect(cpuDeclaration(tieHand, 1, [], NO_PASS, NO_PASS)).toEqual(declare(1, "spade", 11));
  });

  it("誰も宣言していなくても、random1 が 0.15 未満ならパスする", () => {
    expect(cpuDeclaration(strongSpadeHand, 1, [], 0.1, NO_PASS)).toEqual(pass(1));
  });

  it("random1 がちょうど 0.15 ならパスしない（0.15未満だけがパス）", () => {
    expect(cpuDeclaration(strongSpadeHand, 1, [], 0.15, NO_PASS)).toEqual(declare(1, "spade", 11));
  });

  it("自分のスートが強ければ、同じ枚数で上書きする（♥12 に ♠12）", () => {
    const declarations = [declare(0, "heart", 12)];
    expect(cpuDeclaration(strongSpadeHand, 1, declarations, NO_PASS, NO_PASS)).toEqual(declare(1, "spade", 12));
  });

  it("自分のスートが弱ければ、1枚上げて上書きする（♠13 に ♥14）", () => {
    const declarations = [declare(0, "spade", 13)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, NO_PASS, NO_PASS)).toEqual(declare(1, "heart", 14));
  });

  it("途中のパスは飛ばして、最後の宣言と比べる", () => {
    const declarations = [declare(0, "spade", 13), pass(2), pass(3)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, NO_PASS, NO_PASS)).toEqual(declare(1, "heart", 14));
  });

  it("最大枚数でも勝てなければパスする（最大16枚なので ♠16 には勝てない）", () => {
    const declarations = [declare(0, "spade", 16)];
    expect(cpuDeclaration(strongSpadeHand, 1, declarations, NO_PASS, NO_PASS)).toEqual(pass(1));
  });

  it("最大枚数は16枚で頭打ち（♠15 には ♠16 で勝てる）", () => {
    const declarations = [declare(0, "spade", 15)];
    expect(cpuDeclaration(strongSpadeHand, 1, declarations, NO_PASS, NO_PASS)).toEqual(declare(1, "spade", 16));
  });

  it("勝てる場合でも、random1 が 0.15 未満ならパスする", () => {
    const declarations = [declare(0, "club", 11)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, 0.1, NO_PASS)).toEqual(pass(1));
  });

  it("宣言されたスートで自分が6点以上あり、random2 が 0.5 未満ならお得パスする", () => {
    // strongHeartHand の ♦ は6点
    const declarations = [declare(0, "diamond", 13)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, NO_PASS, 0.1)).toEqual(pass(1));
  });

  it("お得パスの条件を満たしていても、random2 が 0.5 以上なら宣言する", () => {
    const declarations = [declare(0, "diamond", 13)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, NO_PASS, 0.5)).toEqual(declare(1, "heart", 14));
  });

  it("宣言されたスートで自分が6点未満なら、お得パスはしない", () => {
    // strongHeartHand の ♠ は0点
    const declarations = [declare(0, "spade", 13)];
    expect(cpuDeclaration(strongHeartHand, 1, declarations, NO_PASS, 0.1)).toEqual(declare(1, "heart", 14));
  });

  it("予定と違うスートで宣言されていても、そのスートで6点以上ならお得パスの対象になる", () => {
    // strongSpadeHand の予定は♠だが、♥も13点ある
    const declarations = [declare(0, "heart", 12)];
    expect(cpuDeclaration(strongSpadeHand, 1, declarations, NO_PASS, 0.1)).toEqual(pass(1));
  });
});