import type { Card, Rank, Suit, TrickPlay } from "../types.js";
import { SUIT_STRENGTH_ORDER } from "../types.js";
import { canPlayCard } from "./card-follow.js";
import { getCardStrength } from "./card-strength.js";
import { isFaceCard } from "./face-card-capture.js";
import type { PlayerView } from "./player-view.js";
import { isMighty } from "./yoromeki.js";

// FR-32のスコープ: 自分の番が来たCPUが、トリックで出すカードを1枚決める。
// 実際にカードを出す（playLeadCard / playCard を呼ぶ）のと、手番を次に回すのは呼び出し側の仕事。
//
// 入力は GameState ではなく PlayerView（FR-10）。CPUが他人の手札や副官を知ったうえで動く「ズル」を防ぐため。
//
// - ナポレオンCPU: 出せる中で一番強いカードを出す（20%の確率で、わざと2番目に強いカードにする）
// - 連合軍CPU:
//     絵札が出ているトリックで、勝てそうなら「勝てる中で一番弱いカード」で勝ちにいく。
//     勝てそうになければ一番弱いカードを出して温存する。
//     絵札が出ていないトリックは、一番弱いカードで温存する。
//     絵札が出ているトリックでは、15%の確率でわざと判断を誤る（勝てるのに温存する／勝てないのに一番強いカードを出す）。
//     自分が親のときは、副官指定カードと同じスートの一番弱いカードを出す（副官をあぶり出す）。無ければ一番弱いカード。
// - 副官CPU（FR-34）:
//     基本は連合軍CPUと全く同じロジックで動き、見分けがつかないようにする。
//     ただし、ナポレオンが勝てそうで、そのスートが台札になるのが2回目以降なら、一番弱い絵札を渡す。
//     副官指定カードは、他に出せるカードがある限り出さない（出した瞬間に正体が公開されるため）。
//     正体が公開された後、または7トリック目以降は、隠すのをやめてナポレオン側として動く:
//       ナポレオンが勝てそうなら一番弱い絵札を渡す（無ければ一番弱いカード）。
//       それ以外で、自分が勝てる（または自分が親）なら一番強いカードを出す。
//       勝てないトリックには絵札を出さない（絵札以外で一番弱いカードを出す）。
//     ※ FR-71（終盤に絵札を乗せる／不利なトリックでは絵札を出さない）も、この動きに含まれる。
//       FR-71のissueは「9・10トリック目から」だが、ここでは7トリック目から（FUKUKAN_CPU_OPEN_FROM_TRICK）にしている。
//
// 割り切っているところ:
//   - 「勝てそうか」は、すでに出ているカードとだけ比べる（後から出す人のカードは分からないので考えない）
//   - よろめき・セイム2は「勝てそうか」の判定に入れていない（強さはFR-18の getCardStrength だけで比べる）
//   - 親でジョーカーを出すときの台札のスートは chooseLeadJokerSuit を参照（オールマイティに負けないスートを選ぶ）

// ナポレオンCPUが、わざと2番目に強いカードを出す確率
export const NAPOLEON_CPU_MISPLAY_RATE = 0.2;
// 連合軍CPUが、絵札が出ているトリックでわざと判断を誤る確率
export const ALLIED_CPU_MISJUDGE_RATE = 0.15;
// FR-34: 副官CPUは、正体が公開されていなくても、このトリック目からはナポレオン側として動く（全10トリック）
export const FUKUKAN_CPU_OPEN_FROM_TRICK = 7;

// getCardStrength の tier で、切り札（役札を除く）を表す値。これ以下なら切り札か役札
const TRUMP_TIER = 5;

export interface CpuTrickChoice {
  card: Card;
  leadJokerSuit?: Suit; // 親でジョーカーを出すときだけ入る（playLeadCard にそのまま渡す）
}

// 強さが同じカード同士（例: 台札でも切り札でもないカード）の並び順を決めるための、ランクそのものの大きさ
const RANK_VALUE: Record<Rank, number> = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * FR-32: CPUがトリックで出すカードを決める。
 * @param view 自分（CPU）から見える情報（toPlayerView の戻り値）
 * @param random 0以上1未満の乱数。わざと外す(20%/15%)かどうかに使う。本番では Math.random() を渡す
 * @returns 出すカード（親でジョーカーを出すときは台札のスートも）
 */
export function chooseCpuTrickCard(view: PlayerView, random: number): CpuTrickChoice {
  if (view.phase !== "trick") {
    throw new Error("トリックフェーズ以外ではカードを選べません");
  }

  const trumpSuit = view.trumpSuit;
  if (trumpSuit === null) {
    throw new Error("切り札が決まっていません");
  }

  const hand = view.myHand;
  const plays = view.currentTrick?.plays ?? [];
  const leadJokerSuit = view.currentTrick?.leadJokerSuit;

  // FR-17: マストフォローなどのルール上、出してよいカードだけに絞る
  const playable = hand.filter((card) => canPlayCard(hand, plays, card, leadJokerSuit));
  if (playable.length === 0) {
    throw new Error("出せるカードがありません");
  }

  const isNapoleon = view.viewerId === view.napoleonId;
  const trickNumber = view.trickHistory.length + 1; // 今が何トリック目か（1〜10）

  // FR-34: 副官CPUが正体を隠すのをやめて、ナポレオン側として動くか
  const fukukanActsOpenly =
    view.isFukukan && (view.fukukanRevealed || trickNumber >= FUKUKAN_CPU_OPEN_FROM_TRICK);

  // FR-34: 正体を隠している間の副官CPUは、副官指定カードを出さない（出した瞬間に正体が公開されるため）。
  // マストフォローなどで副官指定カードしか出せないときだけ、仕方なく出す。
  const candidates = view.isFukukan && !fukukanActsOpenly ? withoutFukukanCard(playable, view.fukukanCard) : playable;

  // 強い順に並べる（[0]が一番強い、最後が一番弱い）
  const sorted = sortStrongestFirst(candidates, plays, trumpSuit, leadJokerSuit);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let card: Card;

  // FR-34: 副官CPUが、ナポレオンが勝てそうなトリックに絵札を渡すか。
  // 正体を隠している間は、そのスートが台札になるのが2回目以降のときだけ（最序盤は連合軍と見分けがつかないようにする）
  const napoleonLikelyToWin = view.isFukukan && isNapoleonLikelyToWin(view, plays, trumpSuit, leadJokerSuit);
  const feedNapoleon =
    napoleonLikelyToWin && (fukukanActsOpenly || isLeadSuitSeenBefore(view, plays, trumpSuit, leadJokerSuit));

  // 渡す絵札の候補。オールマイティ・正ジャック・裏ジャックは強すぎてもったいないので渡さない（強い順のまま）
  const feedableFaceCards = sorted.filter(
    (c) => isFaceCard(c) && strengthOf(c, plays, trumpSuit, leadJokerSuit).tier >= TRUMP_TIER,
  );

  if (feedNapoleon && feedableFaceCards.length > 0) {
    // --- 副官CPU: ナポレオンに一番弱い絵札を渡す ---
    card = feedableFaceCards[feedableFaceCards.length - 1];
  } else if (fukukanActsOpenly && napoleonLikelyToWin) {
    // --- 副官CPU（正体を隠さない）: ナポレオンが勝てそうで渡す絵札もない → 強いカードを無駄にしない ---
    card = weakest;
  } else if (fukukanActsOpenly && !canBeatCurrentBest(sorted, plays, trumpSuit, leadJokerSuit)) {
    // --- 副官CPU（正体を隠さない）: 勝てないトリックには絵札を出さない（FR-71: ナポレオンが不利なトリックでは絵札を出さない） ---
    card = weakestAvoidingFaceCard(sorted);
  } else if (isNapoleon || fukukanActsOpenly) {
    // --- ナポレオンCPU、および正体を隠さなくなった副官CPU（勝てる場面・自分が親の場面） ---
    const misplay = sorted.length >= 2 && random < NAPOLEON_CPU_MISPLAY_RATE;
    card = misplay ? sorted[1] : strongest;
  } else {
    // --- 連合軍CPU（正体を隠している副官CPUもここ） ---
    const hasFaceCard = plays.some((play) => isFaceCard(play.card));

    if (plays.length === 0) {
      // 自分が親 → 副官指定カードのスートで回して副官をあぶり出す。そのスートが無ければ一番弱いカード
      card = chooseAlliedLeadCard(view, sorted);
    } else if (!hasFaceCard) {
      // 絵札が出ていない → 温存
      card = weakest;
    } else {
      // 今トリックで一番強いカードに勝てるカードだけを集める（強い順のまま）
      const currentBest = strengthOf(currentWinningCard(plays, trumpSuit, leadJokerSuit), plays, trumpSuit, leadJokerSuit);
      const winningCards = sorted.filter(
        (c) => compareStrength(strengthOf(c, plays, trumpSuit, leadJokerSuit), currentBest) < 0,
      );
      const canWin = winningCards.length > 0;
      const misjudge = random < ALLIED_CPU_MISJUDGE_RATE;

      if (canWin && !misjudge) {
        card = winningCards[winningCards.length - 1]; // 勝てる中で一番弱いカード
      } else if (canWin && misjudge) {
        card = weakest; // 勝てるのに温存してしまう
      } else if (!canWin && misjudge) {
        card = strongest; // 勝てないのに勝ちにいってしまう
      } else {
        card = weakest; // 勝てないので温存
      }
    }
  }

  // 親でジョーカーを出すときは、台札のスートを指定する必要がある
  if (plays.length === 0 && card.type === "joker") {
    return { card, leadJokerSuit: chooseLeadJokerSuit(view, trumpSuit) };
  }
  return { card };
}

/**
 * 親でジョーカーを出すときに、台札として指定するスートを決める。
 *
 * ジョーカーに勝てるのはオールマイティ(♠A)だけ。♠Aはスペードのカードなので、
 * 台札を♠にすると、スペードを持っている人は♠Aを出せてしまう（シミュレーションでは、切り札♠で
 * ♠を指定すると勝率が25%まで落ちた）。そのため、次のルールで選ぶ:
 *   1. ♠は候補から外す。ただし、自分が♠Aを持っている・♠Aがもう出ている場合は♠も候補にする
 *   2. 候補の中で「居所の分からない絵札」が一番多いスートを選ぶ（勝ったときに絵札が落ちやすい）
 *   3. 同じ枚数なら切り札のスートを優先（敵の切り札を減らせる）、それも同じならスートの強さ順
 *
 * 「居所の分からない絵札」は、そのCPUから見える情報（自分の手札・これまでに出たカード・公開された捨て札）
 * だけで数える。他人の手札は見ない。
 */
export function chooseLeadJokerSuit(view: PlayerView, trumpSuit: Suit): Suit {
  const knownCards = knownCardsOf(view);

  const mightyIsSafe = knownCards.some((card) => isMighty(card)); // 自分が持っているか、もう出ている
  const candidates = SUIT_STRENGTH_ORDER.filter((suit) => suit !== "spade" || mightyIsSafe);

  const unknownFaceCount = (suit: Suit): number => {
    const knownFaces = knownCards.filter(
      (card) => card.type === "normal" && card.suit === suit && isFaceCard(card),
    ).length;
    return FACE_CARDS_PER_SUIT - knownFaces;
  };

  // 絵札が多い順 → 切り札優先 → スートの強さ順（SUIT_STRENGTH_ORDERの並びのまま）
  return [...candidates].sort((a, b) => {
    const diff = unknownFaceCount(b) - unknownFaceCount(a);
    if (diff !== 0) return diff;
    return Number(b === trumpSuit) - Number(a === trumpSuit);
  })[0];
}

// 1スートあたりの絵札の枚数（A・K・Q・J・10）
const FACE_CARDS_PER_SUIT = 5;

/**
 * 連合軍CPUが親のときに出すカードを決める。
 * 副官指定カードと同じスートを持っていれば、その中で一番弱いカードを出す（そのスートを回して、
 * 副官指定カードを持っている人に出させる = 副官をあぶり出す）。
 * 次の場合は、これまでどおり手札で一番弱いカードを出す:
 *   - 副官がもう公開されている（あぶり出す必要がない）
 *   - 副官指定カードがジョーカー（スートが無い）
 *   - そのスートのカードを持っていない（副官指定カードそのものは数えない）
 * @param sorted 出せるカードを強い順に並べたもの
 */
function chooseAlliedLeadCard(view: PlayerView, sorted: Card[]): Card {
  const weakest = sorted[sorted.length - 1];
  const fukukanCard = view.fukukanCard;

  if (view.fukukanRevealed || fukukanCard === null || fukukanCard.type === "joker") {
    return weakest;
  }

  // 副官指定カードそのものは選ばない（持っているのは副官CPUだけ。自分から正体を明かさないようにする）
  const sameSuitCards = sorted.filter(
    (c) => c.type === "normal" && c.suit === fukukanCard.suit && !sameCard(c, fukukanCard),
  );
  return sameSuitCards.length > 0 ? sameSuitCards[sameSuitCards.length - 1] : weakest;
}

/**
 * FR-34: 副官CPUから見て、このトリックはナポレオンが勝てそうか。
 * ナポレオンがもうカードを出していて、それが今一番強く、さらに次のどちらかのとき true:
 *   (a) 台札が切り札以外で、ナポレオンが切り札（または役札）を出している
 *   (b) ナポレオンのカードより強いカードが、もう残っていない
 *       （台札が切り札以外なら台札のスートの中で、台札が切り札なら全てのカードの中で調べる）
 * 「残っているか」は、副官CPUから見える情報（自分の手札・これまでに出たカード・公開された捨て札）だけで判断する。
 * セイム2・よろめきによる逆転は考えていない。
 */
function isNapoleonLikelyToWin(
  view: PlayerView,
  plays: TrickPlay[],
  trumpSuit: Suit,
  leadJokerSuit: Suit | undefined,
): boolean {
  const napoleonPlay = plays.find((play) => play.playerId === view.napoleonId);
  if (napoleonPlay === undefined) {
    return false; // ナポレオンはまだ出していない
  }

  const napoleonStrength = strengthOf(napoleonPlay.card, plays, trumpSuit, leadJokerSuit);
  const best = strengthOf(currentWinningCard(plays, trumpSuit, leadJokerSuit), plays, trumpSuit, leadJokerSuit);
  if (compareStrength(napoleonStrength, best) !== 0) {
    return false; // 今の時点でナポレオンが負けている
  }

  const leadSuit = leadSuitFor(napoleonPlay.card, plays, trumpSuit, leadJokerSuit);
  const leadIsTrump = leadSuit === trumpSuit;

  // (a) 台札が切り札以外で、ナポレオンが切り札（または役札）を出している
  if (!leadIsTrump && napoleonStrength.tier <= TRUMP_TIER) {
    return true;
  }

  // (b) ナポレオンのカードより強いカードが残っていない
  const known = knownCardsOf(view);
  const isKnown = (card: Card) => known.some((k) => sameCard(k, card));
  const strongerCardRemains = ALL_CARDS.some(
    (card) =>
      !isKnown(card) &&
      (leadIsTrump || (card.type === "normal" && card.suit === leadSuit)) &&
      compareStrength(strengthOf(card, plays, trumpSuit, leadJokerSuit), napoleonStrength) < 0,
  );
  return !strongerCardRemains;
}

// 出せるカードの中に、今トリックで一番強いカードに勝てるものがあるか。自分が親のときは true（まだ誰も出していない）
function canBeatCurrentBest(sorted: Card[], plays: TrickPlay[], trumpSuit: Suit, leadJokerSuit: Suit | undefined): boolean {
  if (plays.length === 0) {
    return true;
  }
  const currentBest = strengthOf(currentWinningCard(plays, trumpSuit, leadJokerSuit), plays, trumpSuit, leadJokerSuit);
  return compareStrength(strengthOf(sorted[0], plays, trumpSuit, leadJokerSuit), currentBest) < 0;
}

// 一番弱いカードを返す。ただし絵札以外のカードがあれば、その中から選ぶ（相手に絵札を渡さないため）
function weakestAvoidingFaceCard(sorted: Card[]): Card {
  const nonFaceCards = sorted.filter((c) => !isFaceCard(c));
  const pool = nonFaceCards.length > 0 ? nonFaceCards : sorted;
  return pool[pool.length - 1];
}

// 副官指定カードを除いた候補を返す。除くと出せるカードが無くなる場合は、そのまま返す
function withoutFukukanCard(cards: Card[], fukukanCard: Card | null): Card[] {
  if (fukukanCard === null) {
    return cards;
  }
  const others = cards.filter((c) => !sameCard(c, fukukanCard));
  return others.length > 0 ? others : cards;
}

// 今のトリックの台札のスートが、これまでのトリックでも台札になったことがあるか（=そのスートで回るのが2回目以降か）
function isLeadSuitSeenBefore(
  view: PlayerView,
  plays: TrickPlay[],
  trumpSuit: Suit,
  leadJokerSuit: Suit | undefined,
): boolean {
  if (plays.length === 0) {
    return false;
  }
  const currentLeadSuit = leadSuitFor(plays[0].card, plays, trumpSuit, leadJokerSuit);
  return view.trickHistory.some(
    (trick) =>
      trick.plays.length > 0 &&
      leadSuitFor(trick.plays[0].card, trick.plays, trumpSuit, trick.leadJokerSuit) === currentLeadSuit,
  );
}

// そのCPUから見て、居所が分かっているカード（自分の手札・これまでに出たカード・公開された捨て札）
function knownCardsOf(view: PlayerView): Card[] {
  return [
    ...view.myHand,
    ...view.trickHistory.flatMap((trick) => trick.plays.map((play) => play.card)),
    ...(view.currentTrick?.plays.map((play) => play.card) ?? []),
    ...view.discardedCards,
  ];
}

function sameCard(a: Card, b: Card): boolean {
  if (a.type === "normal" && b.type === "normal") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  return a.type === b.type;
}

// 53枚すべてのカード
const ALL_RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
const ALL_CARDS: Card[] = [
  ...SUIT_STRENGTH_ORDER.flatMap((suit) => ALL_RANKS.map((rank): Card => ({ type: "normal", suit, rank }))),
  { type: "joker" },
];

// --- ここから下は、強さを比べるための小さな道具 ---

interface Strength {
  tier: number; // 小さいほど強い
  numberStrength: number; // 同じtierなら大きいほど強い
  rankValue: number; // tierもnumberStrengthも同じなら、ランクが大きいほど強いとみなす（温存するとき低いランクから捨てるため）
}

// このトリックでの台札のスート。自分が親のときは、そのカード自身のスートが台札になる
function leadSuitFor(card: Card, plays: TrickPlay[], trumpSuit: Suit, leadJokerSuit: Suit | undefined): Suit {
  const leadCard = plays.length > 0 ? plays[0].card : card;
  if (leadCard.type === "normal") {
    return leadCard.suit;
  }
  // 台札がジョーカー: すでに出ていれば指定されたスート、自分が親なら切り札のスートを指定する
  return leadJokerSuit ?? trumpSuit;
}

function strengthOf(card: Card, plays: TrickPlay[], trumpSuit: Suit, leadJokerSuit: Suit | undefined): Strength {
  const { tier, numberStrength } = getCardStrength(card, {
    trumpSuit,
    leadSuit: leadSuitFor(card, plays, trumpSuit, leadJokerSuit),
  });
  const rankValue = card.type === "normal" ? RANK_VALUE[card.rank] : 15;
  return { tier, numberStrength, rankValue };
}

// a が b より強ければ負の数、弱ければ正の数、同じなら0（Array.sort にそのまま使える形）
function compareStrength(a: Strength, b: Strength): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.numberStrength !== b.numberStrength) return b.numberStrength - a.numberStrength;
  return b.rankValue - a.rankValue;
}

function sortStrongestFirst(cards: Card[], plays: TrickPlay[], trumpSuit: Suit, leadJokerSuit: Suit | undefined): Card[] {
  return [...cards].sort((a, b) =>
    compareStrength(strengthOf(a, plays, trumpSuit, leadJokerSuit), strengthOf(b, plays, trumpSuit, leadJokerSuit)),
  );
}

// すでに出ているカードの中で、今一番強いカード
function currentWinningCard(plays: TrickPlay[], trumpSuit: Suit, leadJokerSuit: Suit | undefined): Card {
  return sortStrongestFirst(
    plays.map((play) => play.card),
    plays,
    trumpSuit,
    leadJokerSuit,
  )[0];
}
