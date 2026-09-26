import type { Card, GameState } from "../types.js";
import { cardsEqual } from "./trick-start.js";

// FR-12のスコープ: トリック中に副官指定カードが場に出た瞬間、副官を全員に公開する。
//
// 「カードが場に出る」経路はリード(playLeadCard)とフォロー(FR-17、未実装)の2つがあるが、
// この関数はどちらから呼ばれても同じように動く。フォロー側を実装する際は、カードを
// 手札から出す処理の中でこの関数も呼び、戻り値のstateを使うこと（呼び忘れると、
// フォローで副官指定カードが出たときに公開されないバグになる）。
//
// 既に公開済み(fukukanRevealed: true)のときや、独り立ち(hitoridachi: true)で
// そもそも副官がいないときも、単に何もせず同じstateを返す（安全に何度呼んでもよい）。
export function revealFukukanIfPlayed(state: GameState, card: Card): GameState {
  if (state.fukukanRevealed) {
    return state;
  }

  if (state.fukukanCard === null || !cardsEqual(card, state.fukukanCard)) {
    return state;
  }

  return {
    ...state,
    fukukanRevealed: true,
  };
}
