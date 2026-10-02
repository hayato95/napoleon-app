import { describe, expect, it } from 'vitest'
import { seatPositions } from './seat-layout'

describe('seatPositions', () => {
  it('自分を手前に置き、手番の順に 左 → 左上 → 右上 → 右 と座らせる', () => {
    expect(seatPositions([0, 1, 2, 3, 4], 0)).toEqual({
      bottom: 0,
      left: 1,
      topLeft: 2,
      topRight: 3,
      right: 4,
    })
  })

  it('手番順の先頭が自分でなくても、自分から数えて並べる', () => {
    expect(seatPositions([3, 4, 0, 1, 2], 0)).toEqual({
      bottom: 0,
      left: 1,
      topLeft: 2,
      topRight: 3,
      right: 4,
    })
  })

  it('宣言のたびに手番順の先頭が入れ替わっても、座る位置は変わらない', () => {
    const before = seatPositions([0, 1, 2, 3, 4], 0)
    const after = seatPositions([1, 2, 3, 4, 0], 0)
    expect(after).toEqual(before)
  })

  it('自分が手番順に入っていなければエラーにする', () => {
    expect(() => seatPositions([1, 2, 3, 4, 1], 0)).toThrow('手番順に自分がいません')
  })
})
