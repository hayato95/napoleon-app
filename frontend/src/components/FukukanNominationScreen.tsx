import { useState } from 'react'
import { cardImageSrc, cardLabel, cardsEqual, SUIT_SYMBOL } from '../card-utils'
import {
  cycle,
  fukukanShortcuts,
  pickerCard,
  pickerStateOf,
  PICKER_RANKS,
  PICKER_SUITS,
  type PickerState,
} from '../fukukan-picker'
import type { Card, Suit } from '../types'

interface FukukanNominationScreenProps {
  trumpSuit: Suit
  declaredCount: number
  onSelect: (card: Card) => void
}

function isRedSuit(suit: Suit | 'joker'): boolean {
  return suit === 'heart' || suit === 'diamond'
}

// 副官指名パネル（FR-37・FR-66・FR-73）。テーブルの上に重ねて出す。
// 上の4つのボタンで、よく指名されるカードを1回で選べる。◁ ▷ でスートと数字を1つずつ変えることもできる。
export function FukukanNominationScreen({ trumpSuit, declaredCount, onSelect }: FukukanNominationScreenProps) {
  const shortcuts = fukukanShortcuts(trumpSuit)
  // 最初は「正ジャック」を選んだ状態にしておく
  const [picker, setPicker] = useState<PickerState>(() => pickerStateOf(shortcuts[2].card, 'J'))
  const selectedCard = pickerCard(picker)
  const isJoker = picker.suit === 'joker'
  const shortcutName = shortcuts.find((shortcut) => cardsEqual(shortcut.card, selectedCard))?.label

  const moveSuit = (step: 1 | -1) => setPicker({ ...picker, suit: cycle(PICKER_SUITS, picker.suit, step) })
  const moveRank = (step: 1 | -1) => setPicker({ ...picker, rank: cycle(PICKER_RANKS, picker.rank, step) })

  return (
    <div className="panel fukukan-panel" role="dialog" aria-label="副官指名">
      <h2>
        副官指名
        <small>
          （宣言：切り札 <b>{SUIT_SYMBOL[trumpSuit]}</b>・<b>{declaredCount}枚</b>）
        </small>
      </h2>

      <div className="fukukan-shortcuts">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            className="fukukan-shortcut"
            data-selected={cardsEqual(shortcut.card, selectedCard)}
            onClick={() => setPicker(pickerStateOf(shortcut.card, picker.rank))}
          >
            <img src={cardImageSrc(shortcut.card)} alt="" draggable={false} />
            <span>
              {shortcut.label}
              <small>{cardLabel(shortcut.card)}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="fukukan-pick">
        <div className="fukukan-pickers">
          <div className="fukukan-picker">
            <span className="fukukan-picker-label">スート</span>
            <button type="button" aria-label="前のスート" onClick={() => moveSuit(-1)}>
              ◁
            </button>
            <span className="fukukan-picker-value" data-red={isRedSuit(picker.suit)}>
              {isJoker ? 'JOKER' : SUIT_SYMBOL[picker.suit as Suit]}
            </span>
            <button type="button" aria-label="次のスート" onClick={() => moveSuit(1)}>
              ▷
            </button>
          </div>
          <div className="fukukan-picker">
            <span className="fukukan-picker-label">数字</span>
            <button type="button" aria-label="前の数字" onClick={() => moveRank(-1)} disabled={isJoker}>
              ◁
            </button>
            <span className="fukukan-picker-value" data-red={isRedSuit(picker.suit)}>
              {isJoker ? '—' : picker.rank}
            </span>
            <button type="button" aria-label="次の数字" onClick={() => moveRank(1)} disabled={isJoker}>
              ▷
            </button>
          </div>
        </div>

        <div className="fukukan-preview">
          <img src={cardImageSrc(selectedCard)} alt={cardLabel(selectedCard)} draggable={false} />
          <span>
            {cardLabel(selectedCard)}
            {shortcutName !== undefined && shortcutName !== 'ジョーカー' && `（${shortcutName}）`}
          </span>
        </div>

        <button type="button" className="primary-button" onClick={() => onSelect(selectedCard)}>
          このカードに決定
        </button>
      </div>
    </div>
  )
}
