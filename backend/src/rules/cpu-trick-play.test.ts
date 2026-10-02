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

// --- ここから下は FR-34（副官CPU）と、連合軍CPUが親のときの動き ---

// 過去のトリックを1つ作る（最初のカードが台札）
const pastTrick = (...cards: Card[]) => ({
  leaderId: 0 as PlayerId,
  winnerId: 0 as PlayerId,
  plays: cards.map((card, i) => play(i as PlayerId, card)),
});

// 台札が♣の、中身に意味のない過去のトリックを n 個作る（「今が何トリック目か」を進めるため）
const dummyTricks = (n: number) =>
  [2, 3, 4, 5, 6, 7, 8, 9].slice(0, n).map((rank) => pastTrick(c("club", rank as Rank)));

describe("連合軍CPUが親のとき（副官をあぶり出す）", () => {
  // createState では副官指定カード = ♥A

  it("副官指定カードと同じスートの、一番弱いカードを出す", () => {
    const hand = [c("club", 2), c("heart", 7), c("heart", "K")];
    expect(choose(1, hand, [], NO_MISTAKE).card).toEqual(c("heart", 7));
  });

  it("そのスートを持っていなければ、手札で一番弱いカードを出す", () => {
    const hand = [c("club", 2), c("diamond", 7)];
    expect(choose(1, hand, [], NO_MISTAKE).card).toEqual(c("club", 2));
  });

  it("副官指定カードがジョーカーなら、手札で一番弱いカードを出す", () => {
    const hand = [c("club", 2), c("heart", 7)];
    expect(choose(1, hand, [], NO_MISTAKE, { fukukanCard: JOKER }).card).toEqual(c("club", 2));
  });

  it("副官がもう公開されていれば、あぶり出さずに一番弱いカードを出す", () => {
    const hand = [c("club", 2), c("heart", 7)];
    expect(choose(1, hand, [], NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("club", 2));
  });

  it("副官CPUも同じ動きをするが、副官指定カードそのものは出さない", () => {
    // ♥が他にあれば、連合軍と同じく♥の一番弱いカード
    expect(choose(3, [c("heart", "A"), c("heart", 6), c("club", 2)], [], NO_MISTAKE).card).toEqual(c("heart", 6));
    // ♥が副官指定カード(♥A)だけなら、それは出さずに一番弱いカード
    expect(choose(3, [c("heart", "A"), c("club", 5)], [], NO_MISTAKE).card).toEqual(c("club", 5));
  });
});

describe("FR-34: 副官CPUがナポレオンに絵札を渡す（正体を隠している間）", () => {
  // ナポレオン=0番、副官=3番、切り札=♠。♥が台札になるのは2回目、という状況を作る
  const heartLedBefore = { trickHistory: [pastTrick(c("heart", 2))] };
  // 4番が♥5でリードし、ナポレオンが切り札♠3で切っている
  const napoleonRuffs = [play(4, c("heart", 5)), play(0, c("spade", 3))];

  it("ナポレオンが切り札で切っていて、そのスートが2回目以降なら、一番弱い絵札を渡す", () => {
    const hand = [c("heart", "K"), c("heart", 10), c("heart", 3)];
    expect(choose(3, hand, napoleonRuffs, NO_MISTAKE, heartLedBefore).card).toEqual(c("heart", 10));
  });

  it("そのスートが台札になるのが1回目なら、渡さない（連合軍と同じ動き）", () => {
    const hand = [c("heart", "K"), c("heart", 10), c("heart", 3)];
    expect(choose(3, hand, napoleonRuffs, NO_MISTAKE).card).toEqual(c("heart", 3));
  });

  it("ナポレオンのカードより強いカードが残っていなければ、渡す", () => {
    // ♥Aは過去のトリックで出ている。ナポレオンの♥Kより強い♥は残っていない
    const state = { trickHistory: [pastTrick(c("heart", 2), c("heart", "A"))], fukukanCard: c("club", "A") };
    const hand = [c("heart", "Q"), c("heart", 10), c("heart", 4)];
    expect(choose(3, hand, [play(0, c("heart", "K"))], NO_MISTAKE, state).card).toEqual(c("heart", 10));
  });

  it("ナポレオンのカードより強いカードがまだ残っていれば、渡さない", () => {
    // ♥Aの居所が分からない → ナポレオンの♥Kは負けるかもしれない
    const state = { ...heartLedBefore, fukukanCard: c("club", "A") };
    const hand = [c("heart", "Q"), c("heart", 10), c("heart", 4)];
    expect(choose(3, hand, [play(0, c("heart", "K"))], NO_MISTAKE, state).card).toEqual(c("heart", 4));
  });

  it("ナポレオンが今負けていれば、渡さない", () => {
    // ナポレオンの♥9は、4番の♥Jに負けている
    const plays = [play(4, c("heart", "J")), play(0, c("heart", 9))];
    const hand = [c("heart", 10), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE, heartLedBefore).card).toEqual(c("heart", 3));
  });

  it("オールマイティ・正ジャック・裏ジャックは渡さない", () => {
    // ♥が無いので何でも出せる。絵札は正ジャック(♠J)と♣10 → ♣10を渡す
    const hand = [c("spade", "J"), c("club", 10), c("diamond", 3)];
    expect(choose(3, hand, napoleonRuffs, NO_MISTAKE, heartLedBefore).card).toEqual(c("club", 10));
  });

  it("副官ではない連合軍CPUは、同じ状況でも絵札を渡さない", () => {
    const hand = [c("heart", "K"), c("heart", 10), c("heart", 3)];
    expect(choose(1, hand, napoleonRuffs, NO_MISTAKE, heartLedBefore).card).toEqual(c("heart", 3));
  });
});

describe("FR-34: 副官CPUが正体を隠すのをやめる（公開後・7トリック目以降）", () => {
  const hand = [c("heart", "A"), c("heart", 2)];
  const plays = [play(4, c("heart", 9))]; // 絵札なし。連合軍ロジックなら♥2を出す場面

  it("正体が公開された後は、一番強いカードを出す", () => {
    expect(choose(3, hand, plays, NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("heart", "A"));
  });

  it("公開されていなくても、7トリック目からは一番強いカードを出す", () => {
    expect(choose(3, hand, plays, NO_MISTAKE, { trickHistory: dummyTricks(6) }).card).toEqual(c("heart", "A"));
  });

  it("6トリック目までは、連合軍と同じ動きをする", () => {
    expect(choose(3, hand, plays, NO_MISTAKE, { trickHistory: dummyTricks(5) }).card).toEqual(c("heart", 2));
  });

  it("公開後は、そのスートが1回目でも、ナポレオンが勝てそうなら絵札を渡す", () => {
    const napoleonRuffs = [play(4, c("heart", 5)), play(0, c("spade", 3))];
    const h = [c("heart", "K"), c("heart", 10), c("heart", 3)];
    expect(choose(3, h, napoleonRuffs, NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("heart", 10));
  });

  it("公開後、ナポレオンが勝てそうで渡す絵札が無ければ、一番弱いカードを出す（強いカードを無駄にしない）", () => {
    const napoleonRuffs = [play(4, c("heart", 5)), play(0, c("spade", 3))];
    const h = [c("heart", 9), c("heart", 3)];
    expect(choose(3, h, napoleonRuffs, NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("heart", 3));
  });

  it("公開後に親になったら、一番強いカードを出す", () => {
    const h = [c("spade", "K"), c("heart", 4), c("diamond", 8)];
    expect(choose(3, h, [], NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("spade", "K"));
  });

  it("副官ではない連合軍CPUは、7トリック目以降も連合軍の動きのまま", () => {
    expect(choose(1, hand, plays, NO_MISTAKE, { trickHistory: dummyTricks(6) }).card).toEqual(c("heart", 2));
  });
});

describe("FR-34: 正体を隠している間は、副官指定カードを出さない", () => {
  // 副官=3番、副官指定カード=♥A。4番が♥K（絵札）でリードしていて、♥Aを出せば勝てる場面
  const plays = [play(4, c("heart", "K"))];

  it("他に出せるカードがあれば、勝てる場面でも副官指定カードは出さない", () => {
    const hand = [c("heart", "A"), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE).card).toEqual(c("heart", 3));
  });

  it("判断を誤る15%に当たっても、副官指定カードは出さない", () => {
    const hand = [c("heart", "A"), c("heart", 7), c("heart", 3)];
    expect(choose(3, hand, plays, MISTAKE).card).not.toEqual(c("heart", "A"));
  });

  it("マストフォローで副官指定カードしか出せないときは、出す", () => {
    const hand = [c("heart", "A"), c("club", 5)];
    expect(choose(3, hand, plays, NO_MISTAKE).card).toEqual(c("heart", "A"));
  });

  it("7トリック目以降は、副官指定カードも普通に出す", () => {
    const hand = [c("heart", "A"), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE, { trickHistory: dummyTricks(6) }).card).toEqual(c("heart", "A"));
  });
});

describe("FR-71: 副官CPUの終盤の立ち回り", () => {
  it("9トリック目で、ナポレオンが勝てそうな手を出していれば、温存していた絵札を乗せる", () => {
    // 正体は未公開。4番が♥5でリードし、ナポレオンが切り札♠3で切っている
    const plays = [play(4, c("heart", 5)), play(0, c("spade", 3))];
    const hand = [c("heart", "K"), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE, { trickHistory: dummyTricks(8) }).card).toEqual(c("heart", "K"));
  });

  it("ナポレオンが不利で自分も勝てないトリックには、絵札を出さない", () => {
    // 4番の♥Aが勝っていて、ナポレオンの♥9は負けている。自分の♥Kでも勝てない → 絵札ではない♥3
    const plays = [play(4, c("heart", "A")), play(0, c("heart", 9))];
    const hand = [c("heart", "K"), c("heart", 10), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("heart", 3));
  });

  it("ナポレオンが不利でも、自分が勝てるなら一番強いカードで勝ちにいく", () => {
    const plays = [play(4, c("heart", "Q")), play(0, c("heart", 9))];
    const hand = [c("heart", "K"), c("heart", 3)];
    expect(choose(3, hand, plays, NO_MISTAKE, { fukukanRevealed: true, fukukanCard: c("club", "A") }).card).toEqual(
      c("heart", "K"),
    );
  });

  it("勝てないトリックで手札が絵札だけなら、その中で一番弱いカードを出す", () => {
    const plays = [play(4, c("heart", "A")), play(0, c("heart", 9))];
    const hand = [c("heart", "K"), c("heart", 10)];
    expect(choose(3, hand, plays, NO_MISTAKE, { fukukanRevealed: true }).card).toEqual(c("heart", 10));
  });
});
