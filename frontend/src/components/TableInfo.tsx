import { cardLabel, SUIT_SYMBOL } from '../card-utils'
import { playerName } from '../player-utils'
import type { PlayerView } from '../protocol'

interface TableInfoProps {
  view: PlayerView
}

// 宣言が終わったあと、どのフェーズでも見せておきたい情報（切り札・宣言枚数・ナポレオン・副官）
export function TableInfo({ view }: TableInfoProps) {
  if (view.napoleonId === null || view.trumpSuit === null || view.declaredCount === null) {
    return null
  }

  return (
    <dl className="table-info">
      <div>
        <dt>切り札</dt>
        <dd>{SUIT_SYMBOL[view.trumpSuit]}</dd>
      </div>
      <div>
        <dt>宣言</dt>
        <dd>{view.declaredCount}枚</dd>
      </div>
      <div>
        <dt>ナポレオン</dt>
        <dd>{playerName(view, view.napoleonId)}</dd>
      </div>
      {view.fukukanCard !== null && (
        <div>
          <dt>副官指定カード</dt>
          <dd>{cardLabel(view.fukukanCard)}</dd>
        </div>
      )}
      {view.fukukanRevealed && view.fukukanId !== null && (
        <div>
          <dt>副官</dt>
          <dd>{playerName(view, view.fukukanId)}</dd>
        </div>
      )}
      {!view.fukukanRevealed && view.isFukukan && (
        <div>
          <dt>あなたの役割</dt>
          <dd>副官（まだ公開されていません）</dd>
        </div>
      )}
      {view.hitoridachi === true && (
        <div>
          <dt>独り立ち</dt>
          <dd>指定カードを誰も持っていません</dd>
        </div>
      )}
    </dl>
  )
}
