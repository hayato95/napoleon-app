interface StartScreenProps {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="start-screen">
      <p>ナポレオンを、あなた1人とCPU4人で遊びます。</p>
      <button type="button" onClick={onStart}>
        ゲーム開始
      </button>
    </section>
  )
}
