import type { PlayerId, TrickPlay } from "../types.js";

// FR-22 セイム2の成立判定。
// トリックの5枚が全て同じスートで、その中に2があれば、2を出したプレイヤーのPlayerIdを返す。
// 不成立ならnullを返す。
// この関数は勝者を決めない。成立時にその2をtier6として扱い、最終的な勝者を決めるのは
// トリック勝者決定(#25)側（tier6の予約はcard-strength.ts参照）。
// - 1ターン目(最初のトリック)は不成立。1ターン目かどうかは呼び出し側が判断して渡す。
// - ジョーカーが1枚でも含まれていれば不成立。
// - 切り札スートの5枚でも成立判定はするが、残り4枚が全て切り札(tier5以上)なので
//   tier6の2が勝つことはなく、ゲームの結果は変わらない。
export function checkSame2(plays: TrickPlay[], isFirstTrick: boolean): PlayerId | null {
  let same2 = 0; // 親と同じスートなら+1、そのうち2なら更に+1。5枚全部同じスートで2があれば6になる
  let same2player: PlayerId | null = null; // 2を出したプレイヤー。まだ誰もいなければnull
  let same2joker = false; // ジョーカーが1枚でもあればtrue

  if (isFirstTrick) {
    return null;
  }

  // まずジョーカーが混じっていないか全員分確認する
  for (let n = 0; n < plays.length; n++) {
    if (plays[n].card.type === "joker") {
      same2joker = true;
    }
  }

  if (!same2joker) {
    const leadCard = plays[0].card; // 親(最初に出した人)のカード

    for (let n = 0; n < plays.length; n++) {
      const card = plays[n].card;

      // 上でジョーカーが無いことは確認済みだが、TypeScriptはそれを知らないので
      // ここでもう一度 type === "normal" を確かめてから suit / rank を読む
      if (leadCard.type === "normal" && card.type === "normal" && leadCard.suit === card.suit) {
        same2 = same2 + 1;

        if (card.rank === 2) {
          same2 = same2 + 1;
          same2player = plays[n].playerId;
        }
      }
    }
  }

  if (same2 !== 6) {
    same2player = null;
  }

  return same2player;
}