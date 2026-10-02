import { useCallback, useEffect, useState } from 'react'
import type { StateUpdate } from './protocol'

// 人間の操作のあと、サーバーは「途中の状態」を順に並べて1回で送ってくる（CPUが1手打つたびの状態）。
// それを、間を置いて1つずつ見せる。最後の状態は、次の操作が来るまで出し続ける。

// CPUが1手打ったあと、次の手を見せるまでの時間
export const CPU_MOVE_DELAY_MS = 800
// トリックが終わった状態は、全員のカードと勝者を見てもらうため、長めに止める
export const TRICK_COMPLETE_DELAY_MS = 1500

interface Playback {
  steps: StateUpdate[] // 今回受け取った、途中の状態の並び
  index: number // いま見せているのが、steps の何番目か
  base: StateUpdate | null // steps を受け取る前に見せていた状態（先頭の状態がトリック完了かの判定に使う）
}

// shown を見せたあと、次の状態に進むまでの時間。previous は、その1つ前に見せた状態
export function holdTime(previous: StateUpdate | null, shown: StateUpdate): number {
  const trickCompleted = previous !== null && shown.view.trickHistory.length > previous.view.trickHistory.length
  return trickCompleted ? TRICK_COMPLETE_DELAY_MS : CPU_MOVE_DELAY_MS
}

/**
 * 戻り値は [いま見せる状態, 新しい状態の並びを受け取る関数]。
 * 次の並びが届いたら、見せている途中でも、そちらに切り替える。
 */
export function useStepPlayback(): [StateUpdate | null, (batch: StateUpdate[]) => void] {
  const [playback, setPlayback] = useState<Playback>({ steps: [], index: 0, base: null })

  useEffect(() => {
    const { steps, index, base } = playback
    if (index >= steps.length - 1) {
      return
    }

    const previous = index === 0 ? base : steps[index - 1]
    const timer = setTimeout(() => {
      setPlayback((current) => ({ ...current, index: current.index + 1 }))
    }, holdTime(previous, steps[index]))

    // 次の並びが届いた・画面を閉じたときに、古いタイマーを止める
    return () => clearTimeout(timer)
  }, [playback])

  const push = useCallback((batch: StateUpdate[]) => {
    if (batch.length === 0) {
      return
    }
    setPlayback((current) => ({ steps: batch, index: 0, base: current.steps[current.index] ?? null }))
  }, [])

  return [playback.steps[playback.index] ?? null, push]
}
