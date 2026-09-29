# backend

Socket.IOサーバー＋ナポレオンのルールエンジン（Node.js + TypeScript）。

プロジェクト全体の背景・意思決定の経緯・開発ルールはルートの [README](../README.md) を参照。

## セットアップ

```bash
npm install
npm run dev        # http://localhost:3001 で起動（ホットリロードあり）
npm test            # ルールエンジンのユニットテスト
npm run typecheck    # tsc --noEmit
npm run build        # 本番ビルド（tsc -p tsconfig.build.json）
```

## ディレクトリ構成

```
backend/src/
├── index.ts          # Socket.IOサーバーの起動・GameStateのインメモリ管理
├── types.ts           # Card / GameState など、ルールエンジン全体の土台となる型定義
└── rules/
    ├── declaration.ts      # 宣言（せり）の受付・強さ比較
    ├── card-follow.ts       # マストフォロー（出せるカードの判定）
    ├── trick-start.ts        # リードプレイヤーがカードを出す処理
    ├── player-view.ts        # サーバーの完全な状態から、特定プレイヤーに見せてよい情報だけを切り出す
    └── ...                    # その他、FR単位で分割された純粋関数
```

`rules/` 配下は基本的に副作用のない純粋関数として実装し、ファイルごとに対応する `*.test.ts` を必ず用意する規約になっている。

`player-view.ts` は情報の非公開境界（自分の手札は見えるが他人の手札は枚数だけ、副官が誰かは本人だけが知っている、等）を担う重要なファイル。クライアントやCPU（AI）に状態を渡すときは、必ず `toPlayerView()` を経由し、`GameState` をそのまま渡さないこと。
