import { describe, expect, it } from 'vitest'
import { trickCardRoleLabel } from './card-utils'
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
