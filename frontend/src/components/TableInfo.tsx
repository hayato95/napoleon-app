import { cardLabel, SUIT_SYMBOL } from '../card-utils'
import type { PlayerView } from '../protocol'

interface TableInfoProps {
  view: PlayerView
}

// 宣言が終わったあと、どのフェーズでも上部バーに出しておく情報（切り札・宣言枚数・副官指定カード）。
// 誰がナポレオン・副官かは、座席の上のバッジで見せる（FR-72）ので、ここには出さない。
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
      {view.fukukanCard !== null && (
        <div>
          <dt>副官指定</dt>
          <dd>{cardLabel(view.fukukanCard)}</dd>
        </div>
      )}
      {view.hitoridachi === true && (
        <div>
          <dt>独り立ち</dt>
          <dd>副官なし</dd>
        </div>
      )}
    </dl>
  )
}
