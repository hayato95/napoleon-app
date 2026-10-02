import { describe, expect, it } from "vitest";
import type { Card, GameState, PlayerId, Rank, Suit, TrickPlay } from "../types.js";
import { chooseCpuTrickCard, chooseLeadJokerSuit } from "./cpu-trick-play.js";
import { toPlayerView } from "./player-view.js";

// --- テスト用の小さな道具 ---
const c = (suit: Suit, rank: Rank): Card => ({ type: "normal", suit, rank });
const JOKER: Card = { type: "joker" };
const play = (playerId: PlayerId, card: Card): TrickPlay => ({ playerId, card });

// 乱数の値（わざと外す確率 20%/15% より大きい値 = 外さない、小さい値 = 外す）
const NO_MISTAKE = 0.9;
const MISTAKE = 0.1;

// 切り札=♠、ナポレオン=0番、副官=3番の対局で、CPU(me)の手札と場に出ているカードを指定して状態を作る
function createState(me: PlayerId, myHand: Card[], plays: TrickPlay[], overrides: Partial<GameState> = {}): GameState {
  const ids: PlayerId[] = [0, 1, 2, 3, 4];
  return {
    phase: "trick",
    players: ids.map((id) => ({ id, name: `player${id}`, isHuman: false, hand: id === me ? myHand : [] })),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 13,
    napoleonId: 0,
    fukukanCard: c("heart", "A"),
    fukukanId: 3,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: plays.length > 0 ? { leaderId: plays[0].playerId, plays } : null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

// CPU(me)から見える情報だけを渡してカードを選ばせる（本番と同じく toPlayerView を通す）
function choose(me: PlayerId, myHand: Card[], plays: TrickPlay[], random: number, overrides: Partial<GameState> = {}) {
  return chooseCpuTrickCard(toPlayerView(createState(me, myHand, plays, overrides), me), random);
}

describe("FR-32: ナポレオンCPU", () => {
  it("出せる中で一番強いカードを出す", () => {
    // 台札♥。♥を持っているので♥しか出せない → ♥の中で一番強いK
    const hand = [c("heart", 3), c("heart", "K"), c("spade", "J")];
    const result = choose(0, hand, [play(4, c("heart", 9))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", "K"));
  });

  it("20%の確率（乱数が0.2未満）で、わざと2番目に強いカードを出す", () => {
    const hand = [c("heart", 3), c("heart", "K"), c("heart", 7)];
    const result = choose(0, hand, [play(4, c("heart", 9))], MISTAKE);
    expect(result.card).toEqual(c("heart", 7));
  });

  it("乱数がちょうど0.2なら外さない（0.2未満だけが外す）", () => {
    const hand = [c("heart", 3), c("heart", "K"), c("heart", 7)];
    const result = choose(0, hand, [play(4, c("heart", 9))], 0.2);
    expect(result.card).toEqual(c("heart", "K"));
  });

  it("出せるカードが1枚しかなければ、乱数に関係なくそれを出す", () => {
    const hand = [c("heart", 3), c("spade", "A")];
    const result = choose(0, hand, [play(4, c("heart", 9))], MISTAKE);
    expect(result.card).toEqual(c("heart", 3));
  });

  it("親のときは、オールマイティ（♠A）が一番強い", () => {
    const hand = [c("heart", "A"), c("spade", "A"), c("spade", "K")];
    const result = choose(0, hand, [], NO_MISTAKE);
    expect(result.card).toEqual(c("spade", "A"));
  });

});

describe("FR-32: 親でジョーカーを出すときの台札のスート", () => {
  it("オールマイティを持っていなければ、切り札が♠でも♠は指定しない", () => {
    // 絵札の数は♦♥♣で同じ → 切り札(♠)は候補外なので、スートの強さ順で♦
    const result = choose(0, [JOKER, c("heart", 5)], [], NO_MISTAKE);
    expect(result).toEqual({ card: JOKER, leadJokerSuit: "diamond" });
  });

  it("居所の分からない絵札が一番多いスートを指定する", () => {
    // 自分が♦K・♦Q、♥Aを持っている → 居所不明の絵札は ♦3枚・♥4枚・♣5枚 → ♣
    const hand = [JOKER, c("diamond", "K"), c("diamond", "Q"), c("heart", "A")];
    const result = choose(0, hand, [], NO_MISTAKE);
    expect(result.leadJokerSuit).toBe("club");
  });

  it("これまでのトリックで出た絵札と、公開された捨て札の絵札も「居所が分かっている」に数える", () => {
    // ♣の絵札は ♣A・♣K（過去のトリック）、♣Q（捨て札）で3枚分かっている → ♣2枚、♦♥5枚 → ♦
    const history = [
      { leaderId: 0 as PlayerId, winnerId: 0 as PlayerId, plays: [play(0, c("club", "A")), play(1, c("club", "K"))] },
    ];
    const result = choose(0, [JOKER, c("heart", 5)], [], NO_MISTAKE, {
      trickHistory: history,
      discardedCards: [c("club", "Q")],
    });
    expect(result.leadJokerSuit).toBe("diamond");
  });

  it("自分がオールマイティを持っていれば、♠も候補になる（同数なら切り札優先）", () => {
    // ナポレオンCPUは♠Aを持っていると♠Aの方を先に出すので、スートを決める関数を直接呼んで確かめる
    const suitFor = (hand: Card[]) => chooseLeadJokerSuit(toPlayerView(createState(0, hand, []), 0), "spade");

    // ♠の居所不明の絵札は4枚（♠Aは自分）なので、5枚ある♦が選ばれる
    expect(suitFor([JOKER, c("spade", "A")])).toBe("diamond");

    // ♦♥♣の絵札を1枚ずつ持っていれば、どれも4枚で♠と同数 → 切り札の♠を優先
    expect(suitFor([JOKER, c("spade", "A"), c("diamond", "A"), c("heart", "K"), c("club", "Q")])).toBe("spade");
  });

  it("オールマイティがもう出ていれば、♠も候補になる", () => {
    const history = [{ leaderId: 1 as PlayerId, winnerId: 1 as PlayerId, plays: [play(1, c("spade", "A"))] }];
    // ♦♥♣の絵札は自分が1枚ずつ持っていて4枚ずつ。♠も♠Aが出て4枚 → 同数なので切り札の♠
    const hand = [JOKER, c("diamond", "A"), c("heart", "K"), c("club", "Q")];
    const result = choose(0, hand, [], NO_MISTAKE, { trickHistory: history });
    expect(result.leadJokerSuit).toBe("spade");
  });

  it("切り札が♠以外なら、同数のとき切り札のスートを優先する", () => {
    const result = choose(0, [JOKER, c("club", 5)], [], NO_MISTAKE, { trumpSuit: "heart" });
    expect(result.leadJokerSuit).toBe("heart");
  });
});

describe("FR-32: 連合軍CPU（絵札が出ていないトリック）", () => {
  it("絵札が出ていなければ、勝てても一番弱いカードで温存する", () => {
    // 台札♥9。♥Aで勝てるが、絵札が無いので♥2を出す
    const hand = [c("heart", "A"), c("heart", 2)];
    const result = choose(1, hand, [play(0, c("heart", 9))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", 2));
  });

  it("自分が親のときも、一番弱いカードを出す", () => {
    const hand = [c("spade", "K"), c("heart", 4), c("diamond", 8)];
    const result = choose(1, hand, [], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", 4));
  });

  it("台札のスートが無く何でも出せるときは、ランクの低いカードから捨てる（絵札を相手に渡さない）", () => {
    // 台札♥。♥が無いので何でも出せる。切り札(♠)以外で一番低い♣3を出す
    const hand = [c("club", "K"), c("club", 3), c("spade", 2)];
    const result = choose(1, hand, [play(0, c("heart", 9))], NO_MISTAKE);
    expect(result.card).toEqual(c("club", 3));
  });
});

describe("FR-32: 連合軍CPU（絵札が出ているトリック）", () => {
  it("勝てそうなら、勝てる中で一番弱いカードで勝ちにいく", () => {
    // 台札♥10（絵札）。♥Q・♥Aで勝てる → 勝てる中で弱い♥Q
    const hand = [c("heart", "A"), c("heart", "Q"), c("heart", 2)];
    const result = choose(1, hand, [play(0, c("heart", 10))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", "Q"));
  });

  it("台札のスートが無ければ、切り札で勝ちにいく", () => {
    // 台札♥K（絵札）。♥が無いので切り札♠2で勝てる
    const hand = [c("spade", 2), c("club", 5)];
    const result = choose(1, hand, [play(0, c("heart", "K"))], NO_MISTAKE);
    expect(result.card).toEqual(c("spade", 2));
  });

  it("勝てそうになければ、一番弱いカードで温存する", () => {
    // 台札♥A（絵札）。♥Kでも勝てない → ♥3
    const hand = [c("heart", "K"), c("heart", 3)];
    const result = choose(1, hand, [play(0, c("heart", "A"))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", 3));
  });

  it("15%の確率（乱数が0.15未満）で判断を誤り、勝てるのに温存する", () => {
    const hand = [c("heart", "A"), c("heart", "Q"), c("heart", 2)];
    const result = choose(1, hand, [play(0, c("heart", 10))], MISTAKE);
    expect(result.card).toEqual(c("heart", 2));
  });

  it("15%の確率で判断を誤り、勝てないのに一番強いカードを出す", () => {
    const hand = [c("heart", "K"), c("heart", 3)];
    const result = choose(1, hand, [play(0, c("heart", "A"))], MISTAKE);
    expect(result.card).toEqual(c("heart", "K"));
  });

  it("後から出た強いカードとも比べる（台札ではなく、今一番強いカードに勝てるか）", () => {
    // 台札♥5のあと、♥Kが出ている。♥Qでは勝てず、♥Aなら勝てる
    const hand = [c("heart", "A"), c("heart", "Q")];
    const plays = [play(0, c("heart", 5)), play(1, c("heart", "K"))];
    const result = choose(2, hand, plays, NO_MISTAKE);
    expect(result.card).toEqual(c("heart", "A"));
  });
});

describe("FR-32: その他", () => {
  it("副官CPU（3番）は、連合軍CPUと同じロジックで動く（FR-34で後から切り替える）", () => {
    const hand = [c("heart", "A"), c("heart", 2)];
    const result = choose(3, hand, [play(0, c("heart", 9))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", 2)); // ナポレオンなら♥Aを出すところ
  });

  it("マストフォローを守る（台札のスートがあれば、もっと強い切り札は出さない）", () => {
    const hand = [c("heart", 4), c("spade", "J")];
    const result = choose(0, hand, [play(4, c("heart", "K"))], NO_MISTAKE);
    expect(result.card).toEqual(c("heart", 4));
  });

  it("ジョーカーが台札のときは、指定されたスートに従う", () => {
    const hand = [c("diamond", 6), c("diamond", "K"), c("spade", "A")];
    const state = createState(0, hand, [], {
      currentTrick: { leaderId: 4, plays: [play(4, JOKER)], leadJokerSuit: "diamond" },
    });
    const result = chooseCpuTrickCard(toPlayerView(state, 0), NO_MISTAKE);
    expect(result.card).toEqual(c("diamond", "K"));
  });

  it("トリックフェーズ以外ではエラー", () => {
    expect(() => choose(1, [c("heart", 2)], [], NO_MISTAKE, { phase: "cardExchange" })).toThrow();
  });
});
