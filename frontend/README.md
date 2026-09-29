# frontend

React + TypeScript（Vite）のクライアント。Socket.IO経由でbackendと通信する。

プロジェクト全体の背景・意思決定の経緯・開発ルールはルートの [README](../README.md) を参照。

## セットアップ

```bash
npm install
npm run dev        # http://localhost:5173 で起動
npm run lint         # oxlint
npm run typecheck    # tsc -b --noEmit
npm run build         # 本番ビルド
```

## ディレクトリ構成

```
frontend/
├── src/
│   ├── App.tsx              # ルートコンポーネント（Socket.IO接続・画面状態の管理）
│   ├── types.ts              # Card / Suit / Rank の型定義
│   └── components/
│       ├── PlayingCard.tsx    # トランプ1枚の表示（画像・選択状態・出せるか）
│       └── Hand.tsx            # 手札全体の表示
└── public/cards/               # トランプ画像（Kenney.nl「Playing Cards Pack」, CC0）
```

## 補足

- **`src/types.ts`**: backendの `types.ts` と同じ形の型をfrontend側にも複製している。frontend/backendは別プロジェクトで共有パッケージが無いため。
- **`components/Hand.tsx`**: 「どのカードが出せるか」の判定はコンポーネント自身では行わず、`isPlayable` propとして親から渡された判定結果を使うだけの表示専用コンポーネント。ゲームルールに関する知識を持たせないための設計。
- **`public/cards/`**: 現在は [Kenney.nl](https://kenney.nl/assets/playing-cards-pack) のCC0素材を仮置きで使用している（`LICENSE.txt`同梱）。本番用のオリジナルデザインへの差し替えは別issue（FR-61）の対応範囲。
