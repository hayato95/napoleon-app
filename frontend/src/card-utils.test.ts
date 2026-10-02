import { describe, expect, it } from 'vitest'
import { handDisplayOrder, trickCardRoleLabel } from './card-utils'
import type { Card, Rank, Suit } from './types'

const normal = (suit: Suit, rank: Rank): Card => ({ type: 'normal', suit, rank })

describe('trickCardRoleLabel', () => {
  // 切り札は♥、台札は♣として、各カードの名前を確かめる
  const label = (card: Card) => trickCardRoleLabel(card, 'heart', 'club')

  it('ジョーカーは「ジョーカー」', () => {
    expect(label({ type: 'joker' })).toBe('ジョーカー')
  })

  it('♠Aは「オールマイティ」', () => {
    expect(label(normal('spade', 'A'))).toBe('オールマイティ')
  })

  it('切り札のJは「正ジャック」、同じ色のJは「裏ジャック」', () => {
    expect(label(normal('heart', 'J'))).toBe('正ジャック')
    expect(label(normal('diamond', 'J'))).toBe('裏ジャック')
  })

  it('切り札のスートは「切り札」', () => {
    expect(label(normal('heart', 5))).toBe('切り札')
  })

  it('台札と同じスートは「親と同じスート」', () => {
    expect(label(normal('club', 5))).toBe('親と同じスート')
  })

  it('台札と同じスートの絵札は、絵札より「親と同じスート」を優先する', () => {
    expect(label(normal('club', 'K'))).toBe('親と同じスート')
  })

  it('それ以外の絵札（10・J・Q・K・A）は「絵札」', () => {
    expect(label(normal('diamond', 'Q'))).toBe('絵札')
    expect(label(normal('diamond', 10))).toBe('絵札')
  })

  it('それ以外の数札は名前なし', () => {
    expect(label(normal('diamond', 5))).toBeNull()
  })

  it('♠Aは、切り札が♠でも「オールマイティ」', () => {
    expect(trickCardRoleLabel(normal('spade', 'A'), 'spade', 'club')).toBe('オールマイティ')
  })

  it('切り札が♠のとき、♠Jは「正ジャック」、♣Jは「裏ジャック」', () => {
    expect(trickCardRoleLabel(normal('spade', 'J'), 'spade', null)).toBe('正ジャック')
    expect(trickCardRoleLabel(normal('club', 'J'), 'spade', null)).toBe('裏ジャック')
  })

  it('台札が決まっていないとき（null）は「親と同じスート」を付けない', () => {
    expect(trickCardRoleLabel(normal('club', 5), 'heart', null)).toBeNull()
  })
})

describe('handDisplayOrder', () => {
  const JOKER: Card = { type: 'joker' }
  // 表示順に並べたカードを返す（テストを読みやすくするため）
  const sorted = (hand: Card[], unsortedTailCount?: number) =>
    handDisplayOrder(hand, unsortedTailCount).map((index) => hand[index])

  it('スートは左から ♥ → ♣ → ♦ → ♠ の順に並ぶ', () => {
    const hand = [normal('spade', 5), normal('diamond', 5), normal('club', 5), normal('heart', 5)]
    expect(sorted(hand)).toEqual([normal('heart', 5), normal('club', 5), normal('diamond', 5), normal('spade', 5)])
  })

  it('同じスートの中では 2 → 10 → J → Q → K → A の順に並ぶ', () => {
    const hand = [normal('heart', 'A'), normal('heart', 10), normal('heart', 'K'), normal('heart', 2), normal('heart', 'J'), normal('heart', 'Q'), normal('heart', 9)]
    expect(sorted(hand)).toEqual([
      normal('heart', 2),
      normal('heart', 9),
      normal('heart', 10),
      normal('heart', 'J'),
      normal('heart', 'Q'),
      normal('heart', 'K'),
      normal('heart', 'A'),
    ])
  })

  it('ジョーカーは一番右に並ぶ', () => {
    const hand = [JOKER, normal('spade', 'A'), normal('heart', 2)]
    expect(sorted(hand)).toEqual([normal('heart', 2), normal('spade', 'A'), JOKER])
  })

  it('戻り値は元の手札の番号で、手札そのものは書き換えない', () => {
    const hand = [normal('spade', 5), normal('heart', 5)]
    expect(handDisplayOrder(hand)).toEqual([1, 0])
    expect(hand).toEqual([normal('spade', 5), normal('heart', 5)])
  })

  it('unsortedTailCount を渡すと、末尾のその枚数は並べ替えずに右端へ置く（カード交換の場札）', () => {
    // 手札3枚 + 場札3枚。場札（♥2・ジョーカー・♣K）は受け取った順のまま右端に残る
    const hand = [normal('spade', 5), normal('heart', 9), normal('club', 3), normal('heart', 2), JOKER, normal('club', 'K')]
    expect(sorted(hand, 3)).toEqual([
      normal('heart', 9),
      normal('club', 3),
      normal('spade', 5),
      normal('heart', 2),
      JOKER,
      normal('club', 'K'),
    ])
  })

  it('空の手札や、手札より大きい unsortedTailCount でも壊れない', () => {
    expect(handDisplayOrder([])).toEqual([])
    expect(handDisplayOrder([normal('spade', 5), normal('heart', 5)], 5)).toEqual([0, 1])
  })
})
