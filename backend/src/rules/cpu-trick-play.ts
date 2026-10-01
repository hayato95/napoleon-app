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
//     絵札が出ていないトリック（自分が親のときを含む）は、一番弱いカードで温存する。
//     絵札が出ているトリックでは、15%の確率でわざと判断を誤る（勝てるのに温存する／勝てないのに一番強いカードを出す）。
// - 副官CPUは、ここでは連合軍CPUと同じロジックで動く（FR-34で、終盤にナポレオン側の動きへ切り替える処理を追加する想定）。
//
// 割り切っているところ:
//   - 「勝てそうか」は、すでに出ているカードとだけ比べる（後から出す人のカードは分からないので考えない）
//   - よろめき・セイム2は「勝てそうか」の判定に入れていない（強さはFR-18の getCardStrength だけで比べる）
//   - 親でジョーカーを出すときの台札のスートは chooseLeadJokerSuit を参照（オールマイティに負けないスートを選ぶ）

// ナポレオンCPUが、わざと2番目に強いカードを出す確率
export const NAPOLEON_CPU_MISPLAY_RATE = 0.2;
// 連合軍CPUが、絵札が出ているトリックでわざと判断を誤る確率
export const ALLIED_CPU_MISJUDGE_RATE = 0.15;

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

  // 強い順に並べる（[0]が一番強い、最後が一番弱い）
  const sorted = sortStrongestFirst(playable, plays, trumpSuit, leadJokerSuit);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let card: Card;

  if (view.viewerId === view.napoleonId) {
    // --- ナポレオンCPU ---
    const misplay = sorted.length >= 2 && random < NAPOLEON_CPU_MISPLAY_RATE;
    card = misplay ? sorted[1] : strongest;
  } else {
    // --- 連合軍CPU（副官CPUもここ） ---
    const hasFaceCard = plays.some((play) => isFaceCard(play.card));

    if (!hasFaceCard) {
      // 絵札が出ていない（自分が親のときを含む）→ 温存
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
  const knownCards: Card[] = [
    ...view.myHand,
    ...view.trickHistory.flatMap((trick) => trick.plays.map((play) => play.card)),
    ...(view.currentTrick?.plays.map((play) => play.card) ?? []),
    ...view.discardedCards,
  ];

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
