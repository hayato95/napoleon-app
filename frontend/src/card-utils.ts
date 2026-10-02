import type { Card, Suit } from './types'

export const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠',
  diamond: '♦',
  heart: '♥',
  club: '♣',
}

export function cardsEqual(a: Card, b: Card): boolean {
  if (a.type === 'normal' && b.type === 'normal') {
    return a.suit === b.suit && a.rank === b.rank
  }
  return a.type === b.type
}

export function cardLabel(card: Card): string {
  return card.type === 'joker' ? 'ジョーカー' : `${SUIT_SYMBOL[card.suit]}${card.rank}`
}
