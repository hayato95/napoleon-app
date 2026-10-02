import type { PlayerId } from './types'

// テーブルのどこに座るか。bottom が自分（手前）
export type SeatPosition = 'bottom' | 'left' | 'topLeft' | 'topRight' | 'right'

// 手番の順に並べた座席。自分の次に出す人が左に来るように、時計回りに座らせる
export const SEAT_POSITIONS: SeatPosition[] = ['bottom', 'left', 'topLeft', 'topRight', 'right']

/**
 * 手番順（turnOrder）から、各座席に誰が座るかを決める（FR-72）。
 * turnOrder は宣言のたびに先頭が入れ替わるが、一周の順番は変わらない。
 * そのため「自分から数えて何番目か」で決めれば、ゲームの途中で座る位置が動かない。
 */
export function seatPositions(turnOrder: PlayerId[], viewerId: PlayerId): Record<SeatPosition, PlayerId> {
  const start = turnOrder.indexOf(viewerId)
  if (start === -1) {
    throw new Error('手番順に自分がいません')
  }

  const result = {} as Record<SeatPosition, PlayerId>
  SEAT_POSITIONS.forEach((position, offset) => {
    result[position] = turnOrder[(start + offset) % turnOrder.length]
  })
  return result
}

// 逆引き：そのプレイヤーがどの座席にいるか（場に出たカードを、出した人の方向に置くために使う）
export function seatOf(positions: Record<SeatPosition, PlayerId>, playerId: PlayerId): SeatPosition {
  return SEAT_POSITIONS.find((position) => positions[position] === playerId) ?? 'bottom'
}
