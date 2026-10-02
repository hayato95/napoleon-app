interface WaitingPanelProps {
  message: string // 例：「CPU 3 が副官指名中です」
}

// ほかの人が操作している間、テーブルの上に重ねて出すパネル。
// 後ろの「．．．」は CSS のアニメーションで1つずつ増える（将来の対人戦でも使える形にしている）
export function WaitingPanel({ message }: WaitingPanelProps) {
  return (
    <div className="panel waiting-panel" role="status">
      {message}
      <span className="waiting-dots" aria-hidden="true" />
    </div>
  )
}
