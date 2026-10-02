import type { Card, Declaration, Phase, PlayerId, Suit, Trick } from './types'

// backend/src/protocol.ts と backend/src/rules/player-view.ts の型と同じ形を frontend 側に複製したもの。
// frontend/backend は別プロジェクトで共有パッケージが無いため、型はここで個別に持つ。

export interface PublicPlayerInfo {
  id: PlayerId
  name: string
  isHuman: boolean
  handCount: number
}

export interface PlayerView {
  viewerId: PlayerId
  phase: Phase

  myHand: Card[]
  players: PublicPlayerInfo[]
  widowCount: number

  declarations: Declaration[]
  trumpSuit: Suit | null
  declaredCount: number | null
  napoleonId: PlayerId | null

  fukukanCard: Card | null
  isFukukan: boolean
  fukukanId: PlayerId | null
  hitoridachi: boolean | null
  fukukanRevealed: boolean

  currentTrick: Trick | null
  trickHistory: Trick[]
  discardedCards: Card[]
  capturedCards: Record<PlayerId, Card[]>
  turnOrder: PlayerId[]
}

export interface GameResult {
  winner: 'napoleonArmy' | 'alliedArmy'
  napoleonArmyCount: number
  declaredCount: number
}

// ナポレオン軍・連合軍それぞれの獲得絵札の内訳（backend/src/rules/result-summary.ts と同じ形）
export interface ArmySummary {
  memberIds: PlayerId[]
  capturedCards: Card[] // 軍のメンバーがトリックで獲得した絵札
  discardBonusCards: Card[] // 1トリック目の勝者が軍にいるときだけ入る、ナポレオンの捨て札の絵札
}

export interface ResultSummary {
  napoleonArmy: ArmySummary
  alliedArmy: ArmySummary
  hitoridachi: boolean
}

// サーバーが状態の変わるたびに送ってくる内容（イベント名 "stateUpdate"）
export interface StateUpdate {
  view: PlayerView
  actorId: PlayerId | null // 今操作する必要があるプレイヤー。ゲーム終了後は null
  playableCards: Card[] // トリック中の自分の番だけ、手札のうち出せるカード
  result: GameResult | null // 勝敗判定フェーズのときだけ入る
  resultSummary: ResultSummary | null // 同じく勝敗判定フェーズのときだけ入る、獲得絵札の内訳
}

// サーバーに送る操作（イベント名 "action"）。誰の操作かはサーバーが決めるので含めない
export type PlayerAction =
  | { type: 'startGame' }
  | { type: 'declare'; suit: Suit; count: number }
  | { type: 'pass' }
  | { type: 'nominateFukukan'; card: Card }
  | { type: 'discard'; cards: Card[] }
  | { type: 'playCard'; card: Card; leadJokerSuit?: Suit }
