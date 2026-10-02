import type { PlayerAction, StateUpdate } from '../protocol'
import { CardExchangeScreen } from './CardExchangeScreen'
import { DeclarationScreen } from './DeclarationScreen'
import { DeclarationSeats } from './DeclarationSeats'
import { FukukanNominationScreen } from './FukukanNominationScreen'
import { Hand } from './Hand'
import { ResultScreen } from './ResultScreen'
import { TableInfo } from './TableInfo'
import { TrickScreen } from './TrickScreen'

interface GameScreenProps {
  update: StateUpdate
  send: (action: PlayerAction) => void
}

// サーバーから届いた phase を見て、どの画面を出すかを選ぶ
export function GameScreen({ update, send }: GameScreenProps) {
  const { view, actorId } = update
  const myTurn = actorId === view.viewerId
  const waiting = <p>他のプレイヤーの操作を待っています。</p>

  switch (view.phase) {
    case 'declaration':
      return (
        <div>
          <h2>宣言（せり）</h2>
          <DeclarationSeats view={view} actorId={actorId} />
          <Hand hand={view.myHand} isPlayable={() => true} />
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
      return <ResultScreen update={update} onRestart={() => send({ type: 'startGame' })} />

    case 'dealing':
      return null
  }
}
