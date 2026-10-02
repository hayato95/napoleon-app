import { playerName } from '../player-utils'
import type { PlayerView } from '../protocol'
import { declarationText, isPass } from '../declaration-utils'

// いまの最高の宣言を、テーブル中央に出す一文
export function HighestDeclaration({ view }: { view: PlayerView }) {
  // 新しい宣言は必ず直前より強いので、パスでない最後の1件が最高の宣言になる
  const highest = [...view.declarations].reverse().find((declaration) => !isPass(declaration))

  return (
    <p className="highest-declaration">
      {highest === undefined
        ? 'まだ誰も宣言していません'
        : `いまの最高の宣言：${declarationText(highest)}（${playerName(view, highest.playerId)}）`}
    </p>
  )
}
