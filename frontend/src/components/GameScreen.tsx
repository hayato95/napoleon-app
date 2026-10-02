import { playerName } from '../player-utils'
import type { PlayerAction, StateUpdate } from '../protocol'
import { CardExchangeScreen } from './CardExchangeScreen'
import { DeclarationScreen } from './DeclarationScreen'
import { declarationNotes } from '../declaration-utils'
import { HighestDeclaration } from './DeclarationSeats'
import { FukukanNominationScreen } from './FukukanNominationScreen'
import { Hand } from './Hand'
import { ResultScreen } from './ResultScreen'
import { TableLayout } from './TableLayout'
import { TrickScreen } from './TrickScreen'
import { WaitingPanel } from './WaitingPanel'

interface GameScreenProps {
  update: StateUpdate
  send: (action: PlayerAction) => void
}

// サーバーから届いた phase を見て、テーブルの中央・重ねるパネルに何を出すかを選ぶ（FR-72・FR-73）。
// テーブルの枠（上部バー・座席・手札）は TableLayout が受け持つので、どのフェーズでも位置が変わらない。
export function GameScreen({ update, send }: GameScreenProps) {
  const { view, actorId } = update
  const myTurn = actorId === view.viewerId
  const actorName = actorId === null ? '' : playerName(view, actorId)
  // 操作の対象ではないときの手札（光らせず、押しても何も起きない）
  const idleHand = <Hand hand={view.myHand} isPlayable={() => true} />

  switch (view.phase) {
    case 'declaration':
      return (
        <TableLayout
          view={view}
          actorId={actorId}
          notes={declarationNotes(view)}
          center={
            <div className="declaration-center">
              <h2>宣言（せり）</h2>
              <HighestDeclaration view={view} />
              {myTurn && (
                <DeclarationScreen
                  onDeclare={(suit, count) => send({ type: 'declare', suit, count })}
                  onPass={() => send({ type: 'pass' })}
                />
              )}
            </div>
          }
          hand={idleHand}
        />
      )

    case 'fukukanNomination':
      return (
        <TableLayout
          view={view}
          actorId={actorId}
          center={null}
          overlay={
            myTurn && view.trumpSuit !== null && view.declaredCount !== null ? (
              <FukukanNominationScreen
                trumpSuit={view.trumpSuit}
                declaredCount={view.declaredCount}
                onSelect={(card) => send({ type: 'nominateFukukan', card })}
              />
            ) : (
              <WaitingPanel message={`${actorName} が副官指名中です`} />
            )
          }
          hand={idleHand}
        />
      )

    case 'cardExchange':
      return myTurn ? (
        <CardExchangeScreen
          update={update}
          onDiscard={(indexes) => send({ type: 'discard', cards: indexes.map((index) => view.myHand[index]) })}
        />
      ) : (
        <TableLayout
          view={view}
          actorId={actorId}
          center={null}
          overlay={<WaitingPanel message={`${actorName} がカード交換中です`} />}
          hand={idleHand}
        />
      )

    case 'trick':
      return (
        <TrickScreen
          update={update}
          onPlay={(card, leadJokerSuit) => send({ type: 'playCard', card, leadJokerSuit })}
        />
      )

    case 'result':
      return (
        <TableLayout
          view={view}
          actorId={null}
          center={null}
          overlay={<ResultScreen update={update} onRestart={() => send({ type: 'startGame' })} />}
          hand={idleHand}
        />
      )

    case 'dealing':
      return null
  }
}
