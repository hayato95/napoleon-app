import type { PlayerView } from '../protocol'
import type { PlayerId } from '../types'
import { CapturedCards } from './CapturedCards'

interface SeatProps {
  view: PlayerView
  playerId: PlayerId
  isTurn: boolean // このプレイヤーの手番か
  note?: string // 名前の下に添える一言（宣言フェーズの「♠13枚」「パス」など）
}

// テーブルの座席1つぶん（FR-72）。上にバッジ、真ん中に名前の札、横か下に獲得した絵札を置く
export function Seat({ view, playerId, isTurn, note }: SeatProps) {
  const player = view.players.find((p) => p.id === playerId)
  const isMe = playerId === view.viewerId
  const isNapoleon = playerId === view.napoleonId
  // 副官は、公開されたあと（またはゲーム終了後）だけ、みんなに見せる
  const isRevealedFukukan = (view.fukukanRevealed || view.phase === 'result') && playerId === view.fukukanId
  // 自分が副官でまだ公開されていないときは、自分の画面にだけ点線のバッジを出す
  const isSecretFukukan = isMe && view.isFukukan && !isRevealedFukukan

  return (
    <div className="seat" data-turn={isTurn} data-me={isMe}>
      <div className="seat-badges">
        {isNapoleon && <span className="badge badge-napoleon">★ ナポレオン</span>}
        {isRevealedFukukan && <span className="badge badge-fukukan">◆ 副官</span>}
        {isSecretFukukan && <span className="badge badge-secret">◆ 副官（非公開）</span>}
      </div>
      <div className="seat-plate">
        {isTurn && <span className="turn-tag">▶ 手番</span>}
        <strong>{isMe ? 'あなた' : (player?.name ?? '')}</strong>
        <span>手札 {player?.handCount ?? 0}枚</span>
        {note !== undefined && <span className="seat-note">{note}</span>}
      </div>
      <CapturedCards playerId={playerId} cards={view.capturedCards[playerId] ?? []} />
    </div>
  )
}
