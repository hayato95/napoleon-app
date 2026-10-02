import { SAME_COLOR_SUIT } from './card-utils'
import type { Card, Rank, Suit } from './types'

// 副官指名パネル（FR-37・FR-66）で ◁ ▷ を押したときに回る順番
export type PickerSuit = Suit | 'joker'
export const PICKER_SUITS: PickerSuit[] = ['spade', 'diamond', 'heart', 'club', 'joker']
export const PICKER_RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A']

// パネルで今選ばれているもの。JOKER を選んでいる間も、数字は覚えておく
export interface PickerState {
  suit: PickerSuit
  rank: Rank
}

// items の中で current の次（step = 1）か前（step = -1）を返す。端まで来たら反対の端に戻る
export function cycle<T>(items: readonly T[], current: T, step: 1 | -1): T {
  const index = items.indexOf(current)
  return items[(index + step + items.length) % items.length]
}

export interface FukukanShortcut {
  label: string
  card: Card
}

// よく指名される4枚。正ジャック・裏ジャックは、宣言した切り札によって変わる
export function fukukanShortcuts(trumpSuit: Suit): FukukanShortcut[] {
  return [
    { label: 'マイティ', card: { type: 'normal', suit: 'spade', rank: 'A' } },
    { label: 'ジョーカー', card: { type: 'joker' } },
    { label: '正ジャック', card: { type: 'normal', suit: trumpSuit, rank: 'J' } },
    { label: '裏ジャック', card: { type: 'normal', suit: SAME_COLOR_SUIT[trumpSuit], rank: 'J' } },
  ]
}

// パネルの状態から、サーバーに送るカードを作る
export function pickerCard(state: PickerState): Card {
  return state.suit === 'joker' ? { type: 'joker' } : { type: 'normal', suit: state.suit, rank: state.rank }
}

// 4つのボタンのどれかを押したときの、新しいパネルの状態
export function pickerStateOf(card: Card, currentRank: Rank): PickerState {
  return card.type === 'joker' ? { suit: 'joker', rank: currentRank } : { suit: card.suit, rank: card.rank }
}
