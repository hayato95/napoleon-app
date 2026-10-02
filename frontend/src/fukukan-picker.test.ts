import { describe, expect, it } from 'vitest'
import { cycle, fukukanShortcuts, pickerCard, pickerStateOf, PICKER_RANKS, PICKER_SUITS } from './fukukan-picker'

describe('cycle', () => {
  it('▷ で次へ、◁ で前へ進む', () => {
    expect(cycle(PICKER_SUITS, 'spade', 1)).toBe('diamond')
    expect(cycle(PICKER_SUITS, 'diamond', -1)).toBe('spade')
  })

  it('端まで行ったら反対の端に戻る（JOKER の次は ♠、2 の前は A）', () => {
    expect(cycle(PICKER_SUITS, 'joker', 1)).toBe('spade')
    expect(cycle(PICKER_SUITS, 'spade', -1)).toBe('joker')
    expect(cycle(PICKER_RANKS, 2, -1)).toBe('A')
    expect(cycle(PICKER_RANKS, 'A', 1)).toBe(2)
  })
})

describe('fukukanShortcuts', () => {
  it('切り札が♦のとき、正ジャックは♦J、裏ジャックは♥J', () => {
    const shortcuts = fukukanShortcuts('diamond')
    expect(shortcuts.map((shortcut) => shortcut.label)).toEqual(['マイティ', 'ジョーカー', '正ジャック', '裏ジャック'])
    expect(shortcuts[0].card).toEqual({ type: 'normal', suit: 'spade', rank: 'A' })
    expect(shortcuts[1].card).toEqual({ type: 'joker' })
    expect(shortcuts[2].card).toEqual({ type: 'normal', suit: 'diamond', rank: 'J' })
    expect(shortcuts[3].card).toEqual({ type: 'normal', suit: 'heart', rank: 'J' })
  })

  it('切り札が♣のとき、裏ジャックは♠J', () => {
    expect(fukukanShortcuts('club')[3].card).toEqual({ type: 'normal', suit: 'spade', rank: 'J' })
  })
})

describe('pickerCard と pickerStateOf', () => {
  it('スートと数字から、指名するカードを作る', () => {
    expect(pickerCard({ suit: 'heart', rank: 10 })).toEqual({ type: 'normal', suit: 'heart', rank: 10 })
  })

  it('スートが JOKER なら、数字に関係なくジョーカーになる', () => {
    expect(pickerCard({ suit: 'joker', rank: 7 })).toEqual({ type: 'joker' })
  })

  it('ジョーカーのボタンを押しても、それまでの数字は覚えておく', () => {
    expect(pickerStateOf({ type: 'joker' }, 'Q')).toEqual({ suit: 'joker', rank: 'Q' })
  })

  it('普通のカードのボタンなら、スートと数字をそのカードに合わせる', () => {
    expect(pickerStateOf({ type: 'normal', suit: 'spade', rank: 'A' }, 'Q')).toEqual({ suit: 'spade', rank: 'A' })
  })
})
