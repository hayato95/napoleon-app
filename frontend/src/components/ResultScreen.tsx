import { playerName } from '../player-utils'
import type { ArmySummary, PlayerView, StateUpdate } from '../protocol'
import type { PlayerId } from '../types'
import { PlayingCard } from './PlayingCard'
import { TableInfo } from './TableInfo'

interface ResultScreenProps {
  update: StateUpdate
  onRestart: () => void
}

// 対局が終わったあとに、勝敗と、ナポレオン軍・連合軍それぞれの獲得絵札の内訳を見せる（FR-42）
export function ResultScreen({ update, onRestart }: ResultScreenProps) {
  const { view, result, resultSummary } = update
  if (result === null || resultSummary === null) {
    return null
  }

  const napoleonArmyWon = result.winner === 'napoleonArmy'
  const shortage = result.declaredCount - result.napoleonArmyCount
  const isOnNapoleonArmy = resultSummary.napoleonArmy.memberIds.includes(view.viewerId)

  return (
    <section className="result-screen">
      <h2>{isOnNapoleonArmy === napoleonArmyWon ? 'あなたの勝ち' : 'あなたの負け'}</h2>
      <p className="result-headline">{napoleonArmyWon ? 'ナポレオン軍の勝利' : '連合軍の勝利'}</p>
      <p>
        ナポレオン軍 {result.napoleonArmyCount}枚 / 宣言 {result.declaredCount}枚
        {shortage > 0 ? `（あと${shortage}枚足りませんでした）` : '（宣言を達成しました）'}
      </p>

      <button type="button" className="restart-button" onClick={onRestart}>
        もう一度遊ぶ
      </button>

      <TableInfo view={view} />

      {resultSummary.hitoridachi && <p>今回は独り立ち（副官なし）でした。</p>}

      <div className="result-armies">
        <ArmyBreakdown title="ナポレオン軍" army={resultSummary.napoleonArmy} view={view} />
        <ArmyBreakdown title="連合軍" army={resultSummary.alliedArmy} view={view} />
      </div>
    </section>
  )
}

interface ArmyBreakdownProps {
  title: string
  army: ArmySummary
  view: PlayerView
}

function roleLabel(view: PlayerView, id: PlayerId): string {
  if (id === view.napoleonId) {
    return 'ナポレオン'
  }
  if (id === view.fukukanId) {
    return '副官'
  }
  return ''
}

function ArmyBreakdown({ title, army, view }: ArmyBreakdownProps) {
  const total = army.capturedCards.length + army.discardBonusCards.length

  return (
    <section className="army-breakdown" aria-label={title}>
      <h3>
        {title}：{total}枚
      </h3>

      <ul className="army-members">
        {army.memberIds.map((id) => (
          <li key={id}>
            {playerName(view, id)}
            {roleLabel(view, id) !== '' && `（${roleLabel(view, id)}）`}
            ：絵札 {view.capturedCards[id].length}枚
          </li>
        ))}
      </ul>

      <ul className="result-cards" aria-label={`${title}が獲得した絵札`}>
        {army.capturedCards.map((card, index) => (
          <li key={index}>
            <PlayingCard card={card} playable={true} />
          </li>
        ))}
      </ul>

      {army.discardBonusCards.length > 0 && (
        <div>
          <p>ナポレオンの捨て札にあった絵札（1トリック目の勝者の得点）：{army.discardBonusCards.length}枚</p>
          <ul className="result-cards" aria-label={`${title}の捨て札ボーナス`}>
            {army.discardBonusCards.map((card, index) => (
              <li key={index}>
                <PlayingCard card={card} playable={true} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
