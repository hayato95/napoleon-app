import { SUIT_SYMBOL } from '../card-utils'
import { playerName } from '../player-utils'
import type { PlayerView } from '../protocol'
import type { Declaration, PlayerId } from '../types'

// そのプレイヤーが最後にした宣言（パスを含む）。まだ何も言っていなければ undefined
function latestDeclarationOf(declarations: Declaration[], playerId: PlayerId): Declaration | undefined {
  for (let i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].playerId === playerId) {
      return declarations[i]
    }
  }
  return undefined
}

function isPass(declaration: Declaration): boolean {
  return declaration.suit === null || declaration.declaredCardCount === null
}

function declarationText(declaration: Declaration | undefined): string {
  if (declaration === undefined) {
    return 'まだ'
  }
  if (declaration.suit === null || declaration.declaredCardCount === null) {
    return 'パス'
  }
  return `${SUIT_SYMBOL[declaration.suit]} ${declaration.declaredCardCount}枚`
}

interface DeclarationSeatProps {
  name: string
  declaration: Declaration | undefined
  isLatest: boolean // いま宣言した（記録の最後）
  isNext: boolean // 次に宣言する
}

// 座席1つぶん。将来、トリック画面の座席と共通の部品にまとめやすいよう、独立させている
export function DeclarationSeat({ name, declaration, isLatest, isNext }: DeclarationSeatProps) {
  return (
    <li data-latest={isLatest} data-next={isNext}>
      <strong>{name}</strong>
      <span className="declaration-text">{declarationText(declaration)}</span>
      {isLatest && <span className="seat-tag">いま宣言した</span>}
      {isNext && <span className="seat-tag seat-tag-next">次の番</span>}
    </li>
  )
}

interface DeclarationSeatsProps {
  view: PlayerView
  actorId: PlayerId | null // 次に宣言する人
}

// 宣言フェーズで、5人それぞれの最新の宣言と、いまの最高の宣言を見せる。
// 各座席は最新の1件だけなので、せりが何周続いても大きさは変わらない。
export function DeclarationSeats({ view, actorId }: DeclarationSeatsProps) {
  const { declarations } = view
  const lastDeclaration = declarations[declarations.length - 1]
  // 新しい宣言は必ず直前より強いので、パスでない最後の1件が最高の宣言になる
  const highest = [...declarations].reverse().find((declaration) => !isPass(declaration))

  return (
    <div>
      <ul className="seat-list declaration-seats" aria-label="プレイヤーの宣言">
        {view.players.map((player) => (
          <DeclarationSeat
            key={player.id}
            name={player.name}
            declaration={latestDeclarationOf(declarations, player.id)}
            isLatest={lastDeclaration?.playerId === player.id}
            isNext={actorId === player.id}
          />
        ))}
      </ul>

      <p className="highest-declaration">
        {highest === undefined
          ? 'まだ誰も宣言していません'
          : `いまの最高の宣言：${declarationText(highest)}（${playerName(view, highest.playerId)}）`}
      </p>
    </div>
  )
}
