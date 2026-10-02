import { SUIT_SYMBOL } from './card-utils'
import type { PlayerView } from './protocol'
import type { Declaration, PlayerId } from './types'

// そのプレイヤーが最後にした宣言（パスを含む）。まだ何も言っていなければ undefined
function latestDeclarationOf(declarations: Declaration[], playerId: PlayerId): Declaration | undefined {
  for (let i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].playerId === playerId) {
      return declarations[i]
    }
  }
  return undefined
}

export function isPass(declaration: Declaration): boolean {
  return declaration.suit === null || declaration.declaredCardCount === null
}

export function declarationText(declaration: Declaration | undefined): string {
  if (declaration === undefined) {
    return 'まだ'
  }
  if (declaration.suit === null || declaration.declaredCardCount === null) {
    return 'パス'
  }
  return `${SUIT_SYMBOL[declaration.suit]} ${declaration.declaredCardCount}枚`
}

// 宣言フェーズで、各座席に添える「最新の宣言」（FR-72：座席の札の中に出す）。
// 各座席は最新の1件だけなので、せりが何周続いても大きさは変わらない。
export function declarationNotes(view: PlayerView): Partial<Record<PlayerId, string>> {
  const notes: Partial<Record<PlayerId, string>> = {}
  for (const player of view.players) {
    notes[player.id] = declarationText(latestDeclarationOf(view.declarations, player.id))
  }
  return notes
}
