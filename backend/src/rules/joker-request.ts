import type { Card, TrickPlay } from "../types.js";

// FR-24 ジョーカー請求の判定。
// このトリックでスペードの3がすでに出ていて、かつ今から出す人の手札にジョーカーがあれば true。
// true のとき、その人はジョーカーしか出せない（台札のスートを持っていても関係なし）。
// - スペードの3は台札(親のカード)に限らず、トリックの途中で出ていれば対象（チームで確認済み。要件定義書は「台札で」のままなので注意）
// - すでに自分の番を終えた人には適用されない。この関数は「今から出す人」についてだけ呼ぶ想定なので、
//   plays には自分より前に出たカードしか入っておらず、関数の中で特別なチェックは要らない。
// - 親(plays が空)のときは、スペードの3がまだ出ていないので必ず false。
export function isJokerForced(hand: Card[], plays: TrickPlay[]): boolean {
  let spade3Played = false; // スペードの3がこのトリックですでに出ていたら true
  let hasJoker = false; // 手札にジョーカーがあれば true

  // 場に出たカードを1枚ずつ見て、スペードの3を探す
  for (let n = 0; n < plays.length; n++) {
    const card = plays[n].card;

    // ジョーカーには suit も rank もないので、先に type が "normal" か確かめてから読む
    if (card.type === "normal" && card.suit === "spade" && card.rank === 3) {
      spade3Played = true;
    }
  }

  // 手札を1枚ずつ見て、ジョーカーを探す（hand の中身はそのまま Card なので .card は要らない）
  for (let n = 0; n < hand.length; n++) {
    if (hand[n].type === "joker") {
      hasJoker = true;
    }
  }

  return spade3Played && hasJoker;
}