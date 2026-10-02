import type { ReactNode } from 'react'
import { playerName } from '../player-utils'
import type { PlayerView } from '../protocol'
import { seatPositions } from '../seat-layout'
import type { PlayerId } from '../types'
import { Seat } from './Seat'
import { TableInfo } from './TableInfo'

interface TableLayoutProps {
  view: PlayerView
  actorId: PlayerId | null // 今操作するプレイヤー（手番の光を付ける人）
  center: ReactNode // テーブル中央に出すもの（場のカード・宣言の操作など）
  overlay?: ReactNode // テーブルの上に重ねるパネル（副官指名・待ち・リザルト）
  hand: ReactNode // 自分の手札
  handHint?: ReactNode // 手札の上に出す一言（「光っているカードを出せます」など）
  notes?: Partial<Record<PlayerId, string>> // 座席ごとに添える一言（宣言フェーズの最新の宣言）
}

// 対局画面の枠（FR-72）。どのフェーズでも、上部バー・座席・自分の手札の位置は動かさず、
// 中央（center）と、重ねるパネル（overlay）だけを入れ替える（FR-73）。
export function TableLayout({ view, actorId, center, overlay, hand, handHint, notes = {} }: TableLayoutProps) {
  const seats = seatPositions(view.turnOrder, view.viewerId)
  const seat = (playerId: PlayerId) => (
    <Seat view={view} playerId={playerId} isTurn={actorId === playerId} note={notes[playerId]} />
  )

  const turnText =
    actorId === null ? null : actorId === view.viewerId ? 'あなたの番です' : `${playerName(view, actorId)} の番です`

  return (
    <div className="table-layout" data-phase={view.phase}>
      <header className="table-bar">
        <span className="table-title">ナポレオン</span>
        <TableInfo view={view} />
        {turnText !== null && (
          <span className="turn-banner" data-mine={actorId === view.viewerId} role="status">
            {turnText}
          </span>
        )}
      </header>

      <section className="table-felt" aria-label="テーブル">
        <div className="seat-slot seat-topLeft">{seat(seats.topLeft)}</div>
        <div className="seat-slot seat-topRight">{seat(seats.topRight)}</div>
        <div className="seat-slot seat-left">{seat(seats.left)}</div>
        <div className="seat-slot seat-right">{seat(seats.right)}</div>
        <div className="table-center">{center}</div>
        {overlay !== undefined && overlay !== null && <div className="table-veil">{overlay}</div>}
      </section>

      <section className="table-mine" aria-label="あなたの手元">
        <div className="seat-slot seat-bottom">{seat(seats.bottom)}</div>
        <div className="mine-hand">
          {handHint !== undefined && <p className="hand-hint">{handHint}</p>}
          {hand}
        </div>
      </section>
    </div>
  )
}
