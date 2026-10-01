import type { Card, Suit } from "../types.js";
import { cardsEqual } from "./trick-start.js";
import { isMighty, isYoromekiQueen } from "./yoromeki.js";

// FR-30のスコープ: ナポレオンになったCPUが、副官指定カードを1枚選んで返す。
// 実際に副官指定カードとしてセットするのは nominateFukukan(FR-09) の仕事。この関数は「どのカードにするか」を返すだけ。
// 副官を選ぶのはカード交換の前なので、手札はまだ10枚（場札3枚は入っていない）。
//
// 選びたい順は「強い順」ではない。ジョーカーは強さでは2番目(CARD_STRENGTH_TIER)だが、
// ♠3で請求される(FR-24)と副官がバレる(FR-12)ので、基本は4番目に置いている（issue #37 の並びのまま）。
//
// issue #37 から変えたところ（PRで確認したい）:
//   - 手札に♠3があるときは、ジョーカーを2番目に上げる（自分が♠3を持っていれば、敵はジョーカーを請求できないため）
//   - 手札に♥Qがあって♠Aがないときは、確率を 85%・10%・5% にする（自分が♥Qを持っていれば、敵はよろめきで副官のマイティを倒せないため）
//   - 候補が4つ以上のときは、上から3つだけを使う（4番目以降は選ばない）
//   - 候補が2つのときは 70%・30%（♥Q持ちのときは 90%・10%）にする
//   - 候補が0個のとき（候補を全部自分で持っている）は、50%ずつで「切り札のK」か「♠A」を返す。
//     ♠Aは必ず自分の手札にあるので独り立ちになる。切り札のKも自分で持っていた場合は、
//     その次のカードを探さずにそのままKを返す（これも独り立ちになる）

// 候補が3つ以上のときの確率の区切り（基本: 60%・25%・15%）
export const CPU_FUKUKAN_FIRST_RATE = 0.6;
export const CPU_FUKUKAN_SECOND_RATE_END = 0.85;
// 候補が3つ以上で、♥Qあり・♠Aなしのときの区切り（85%・10%・5%）
export const CPU_FUKUKAN_YOROMEKI_FIRST_RATE = 0.85;
export const CPU_FUKUKAN_YOROMEKI_SECOND_RATE_END = 0.95;
// 候補が2つのときの、1番目を選ぶ確率（基本: 70%・30%、♥Qあり・♠Aなし: 90%・10%）
export const CPU_FUKUKAN_TWO_FIRST_RATE = 0.7;
export const CPU_FUKUKAN_TWO_YOROMEKI_FIRST_RATE = 0.9;
// 候補が0個のとき、切り札のKを返す確率（それ以外は♠Aを返す）
export const CPU_FUKUKAN_NO_CANDIDATE_KING_RATE = 0.5;

// 切り札と同じ色のもう一方のスート（裏ジャックの判定に使う）。
// card-strength.ts にも同じ表があるが export されていないので、ここに持っている。
const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: "club",
  club: "spade",
  diamond: "heart",
  heart: "diamond",
};

/**
 * FR-30: ナポレオンになったCPUが、副官指定カードを1枚選ぶ。
 * @param hand ナポレオン（CPU）の手札
 * @param trumpSuit 確定した切り札
 * @param random1 候補から選ぶときに使う 0以上1未満 の乱数
 * @param random2 候補が0個のときに使う 0以上1未満 の乱数
 * @returns 副官指定カード（nominateFukukan に渡す）
 */
export function cpuFukukanNomination(hand: Card[], trumpSuit: Suit, random1: number, random2: number): Card {
  const mighty: Card = { type: "normal", suit: "spade", rank: "A" };
  const correctJack: Card = { type: "normal", suit: trumpSuit, rank: "J" }; // 正ジャック
  const backJack: Card = { type: "normal", suit: SAME_COLOR_SUIT[trumpSuit], rank: "J" }; // 裏ジャック
  const joker: Card = { type: "joker" };
  const trumpAce: Card = { type: "normal", suit: trumpSuit, rank: "A" };

  const hasSpade3 = hand.some((card) => card.type === "normal" && card.suit === "spade" && card.rank === 3);

  // 選びたい順を決める。切り札が♠なら、切り札のAはマイティと同じカードなので入れない
  let cardWantingOrder: Card[];
  if (trumpSuit === "spade") {
    if (hasSpade3) {
      cardWantingOrder = [mighty, joker, correctJack, backJack]; // ④
    } else {
      cardWantingOrder = [mighty, correctJack, backJack, joker]; // ②
    }
  } else {
    if (hasSpade3) {
      cardWantingOrder = [mighty, joker, correctJack, backJack, trumpAce]; // ③
    } else {
      cardWantingOrder = [mighty, correctJack, backJack, joker, trumpAce]; // ①
    }
  }

  // 並べ替えたあとで、手札にあるカードを抜く（並び順はそのまま）
  const cpuWantingOrder = cardWantingOrder.filter((wanted) => !hand.some((card) => cardsEqual(card, wanted)));

  // ♥Qを持っていて♠Aを持っていないときは、マイティ（必ず1番目）を選びやすくする
  const prefersMighty = !hand.some((card) => isMighty(card)) && hand.some((card) => isYoromekiQueen(card));

  if (cpuWantingOrder.length >= 3) {
    if (prefersMighty) {
      if (random1 < CPU_FUKUKAN_YOROMEKI_FIRST_RATE) {
        return cpuWantingOrder[0];
      }
      if (random1 < CPU_FUKUKAN_YOROMEKI_SECOND_RATE_END) {
        return cpuWantingOrder[1];
      }
      return cpuWantingOrder[2];
    }
    if (random1 < CPU_FUKUKAN_FIRST_RATE) {
      return cpuWantingOrder[0];
    }
    if (random1 < CPU_FUKUKAN_SECOND_RATE_END) {
      return cpuWantingOrder[1];
    }
    return cpuWantingOrder[2];
  }

  if (cpuWantingOrder.length === 2) {
    const firstRate = prefersMighty ? CPU_FUKUKAN_TWO_YOROMEKI_FIRST_RATE : CPU_FUKUKAN_TWO_FIRST_RATE;
    if (random1 < firstRate) {
      return cpuWantingOrder[0];
    }
    return cpuWantingOrder[1];
  }

  if (cpuWantingOrder.length === 1) {
    return cpuWantingOrder[0];
  }

  // 候補が0個（候補を全部自分で持っている）。
  // 切り札のKは自分で持っているかどうかを確かめずに返す（持っていれば独り立ち）。♠Aは必ず自分の手札にある
  if (random2 < CPU_FUKUKAN_NO_CANDIDATE_KING_RATE) {
    return { type: "normal", suit: trumpSuit, rank: "K" };
  }
  return mighty;
}