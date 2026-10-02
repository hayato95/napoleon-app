import { SUIT_SYMBOL } from '../card-utils'
import type { PlayerView } from '../protocol'
import { playerName } from '../player-utils'

interface DeclarationHistoryProps {
  view: PlayerView
}

export function DeclarationHistory({ view }: DeclarationHistoryProps) {
  if (view.declarations.length === 0) {
    return null
  }

  return (
    <ol className="declaration-history" aria-label="これまでの宣言">
      {view.declarations.map((declaration, index) => (
        <li key={index}>
          {playerName(view, declaration.playerId)}：
          {declaration.suit === null || declaration.declaredCardCount === null
            ? 'パス'
            : `${SUIT_SYMBOL[declaration.suit]} ${declaration.declaredCardCount}枚`}
        </li>
      ))}
    </ol>
  )
}
