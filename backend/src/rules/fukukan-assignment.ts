import type { GameState } from "../types.js";
import { cardsEqual } from "./trick-start.js";

// FR-10のスコープ（前半）: FR-09で選ばれた副官指定カードを、ナポレオン以外の4人のうち誰が持っているかを探し、
// 見つかればその人を副官(fukukanId)、見つからなければ独り立ち(hitoridachi)として確定する。
//
// 「4人の手札にない」ケースは次の2つで、どちらも独り立ちになる（場合分けを書かなくてよい）:
//   - 指定カードが場札(widow)の3枚に入っていた
//   - ナポレオンが自分の手札にあるカードを指定した
//
// カード交換で動くのはナポレオンの手札と場札だけで、他の4人の手札は変わらない。
// そのため、この関数はカード交換の前後どちらで呼んでも同じ結果になる。
//
// 確定した結果を誰に見せるか（本人以外に秘密にする部分）は player-view.ts の責務。
export function assignFukukan(state: GameState): GameState {
  const { napoleonId, fukukanCard } = state;

  if (napoleonId === null) {
    throw new Error("ナポレオンが決まっていないため副官を確定できません");
  }

  if (fukukanCard === null) {
    throw new Error("副官指定カードが選ばれていないため副官を確定できません");
  }

  if (state.fukukanId !== null || state.hitoridachi) {
    throw new Error("副官は既に確定済みです");
  }

  // ナポレオン以外の4人から、指定カードを手札に持っている人を探す
  const holder = state.players.find(
    (player) =>
      player.id !== napoleonId && player.hand.some((card) => cardsEqual(card, fukukanCard)),
  );

  // 誰も持っていない → 独り立ち
  if (holder === undefined) {
    return { ...state, fukukanId: null, hitoridachi: true };
  }

  return { ...state, fukukanId: holder.id, hitoridachi: false };
}
