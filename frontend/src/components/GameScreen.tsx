import { cardLabel } from '../card-utils'
import type { PlayerAction, StateUpdate } from '../protocol'
import { CardExchangeScreen } from './CardExchangeScreen'
import { DeclarationHistory } from './DeclarationHistory'
import { DeclarationScreen } from './DeclarationScreen'
import { FukukanNominationScreen } from './FukukanNominationScreen'
import { Hand } from './Hand'
import { playerName } from '../player-utils'
import { TableInfo } from './TableInfo'
import { TrickScreen } from './TrickScreen'

interface GameScreenProps {
  update: StateUpdate
  send: (action: PlayerAction) => void
}

// サーバーから届いた phase を見て、どの画面を出すかを選ぶ
export function GameScreen({ update, send }: GameScreenProps) {
  const { view, actorId, result } = update
  const myTurn = actorId === view.viewerId
  const waiting = <p>他のプレイヤーの操作を待っています。</p>

  switch (view.phase) {
    case 'declaration':
      return (
        <div>
          <h2>宣言（せり）</h2>
          <Hand hand={view.myHand} isPlayable={() => true} />
          <DeclarationHistory view={view} />
          {myTurn ? (
            <DeclarationScreen
              onDeclare={(suit, count) => send({ type: 'declare', suit, count })}
              onPass={() => send({ type: 'pass' })}
            />
          ) : (
            waiting
          )}
        </div>
      )

    case 'fukukanNomination':
      return (
        <div>
          <TableInfo view={view} />
          <Hand hand={view.myHand} isPlayable={() => true} />
          {myTurn ? (
            <FukukanNominationScreen onSelect={(card) => send({ type: 'nominateFukukan', card })} />
          ) : (
            waiting
          )}
        </div>
      )

    case 'cardExchange':
      return (
        <div>
          <TableInfo view={view} />
          <h2>カード交換</h2>
          <p>場の3枚を受け取りました。いらない3枚を選んで捨ててください。</p>
          {myTurn ? (
            <CardExchangeScreen
              hand={view.myHand}
              onDiscard={(indexes) => send({ type: 'discard', cards: indexes.map((index) => view.myHand[index]) })}
            />
          ) : (
            waiting
          )}
        </div>
      )

    case 'trick':
      return (
        <TrickScreen
          update={update}
          onPlay={(card, leadJokerSuit) => send({ type: 'playCard', card, leadJokerSuit })}
        />
      )

    case 'result':
      // リザルト画面（FR-42, #51）ができるまでの仮表示
      return (
        <div>
          <TableInfo view={view} />
          <h2>対局終了</h2>
          {result !== null && (
            <p>
              {result.winner === 'napoleonArmy' ? 'ナポレオン軍の勝ち' : '連合軍の勝ち'}（ナポレオン軍{' '}
              {result.napoleonArmyCount}枚 / 宣言 {result.declaredCount}枚）
            </p>
          )}
          {view.fukukanCard !== null && (
            <p>
              副官指定カード: {cardLabel(view.fukukanCard)}
              {view.fukukanId !== null && `（副官: ${playerName(view, view.fukukanId)}）`}
            </p>
          )}
        </div>
      )

    case 'dealing':
      return null
  }
}
