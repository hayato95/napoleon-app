import type { PlayerView } from './protocol'
import type { PlayerId } from './types'

export function playerName(view: PlayerView, id: PlayerId): string {
  return view.players.find((player) => player.id === id)?.name ?? `プレイヤー${id}`
}
