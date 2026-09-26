// ナポレオンのゲーム状態を表す共通の型定義。
// FR-01(配札)をはじめ、ルールエンジン全体がこの型の上に実装される。

// --- カード ---
export type Suit = "spade" | "diamond" | "heart" | "club";

// スートの強弱順（競りの同枚数比較でのみ使用。プレイ中の強さ判定には使わない）
// ♠ > ♦ > ♡ > クローバー（チーム確認済み）
export const SUIT_STRENGTH_ORDER: Suit[] = ["spade", "diamond", "heart", "club"];

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "J" | "Q" | "K" | "A";

export type Card =
  | { type: "normal"; suit: Suit; rank: Rank }
  | { type: "joker" };

// --- プレイヤー ---
export type PlayerId = 0 | 1 | 2 | 3 | 4; // 5人固定

export interface Player {
  id: PlayerId;
  name: string;
  isHuman: boolean;
  hand: Card[];
}

// --- 宣言（せり） ---
export interface Declaration {
  playerId: PlayerId;
  suit: Suit | null; // ノートランプ（FR-08）は今回未実装だが型としては残す
  declaredCardCount: number | null; // null = パス（GameState.declaredCountは確定後の値なので区別している）
}

// --- トリック ---
export interface TrickPlay {
  playerId: PlayerId;
  card: Card;
}

export interface Trick {
  leaderId: PlayerId;
  plays: TrickPlay[]; // 出された順
  winnerId?: PlayerId; // 決着後にセット
}

// --- ゲーム全体の進行フェーズ ---
export type Phase =
  | "dealing" // 配札
  | "declaration" // 宣言（せり）
  | "fukukanNomination" // 副官指名
  | "cardExchange" // カード交換
  | "trick" // トリック
  | "result"; // 勝敗判定

// --- ゲーム状態（サーバー側のみが持つ完全な状態） ---
export interface GameState {
  phase: Phase;
  players: Player[];
  widow: Card[]; // 場に伏せられた3枚（配札後、ナポレオンが受け取るまで）

  declarations: Declaration[];
  trumpSuit: Suit | null; // 確定した切り札
  declaredCount: number | null; // 確定した宣言枚数

  napoleonId: PlayerId | null;
  fukukanCard: Card | null; // 副官指定カード
  fukukanId: PlayerId | null; // 本人以外に見せてはいけない（FR-10）
  fukukanRevealed: boolean; // FR-12で公開されたらtrue

  currentTrick: Trick | null;
  trickHistory: Trick[];
  capturedCards: Record<PlayerId, Card[]>; // 個人ごとの獲得絵札（FR-26集計・FR-40表示の両方で使う）
  discardedCards: Card[]; // FR-14で公開された、ナポレオンの捨て札に含まれていた絵札。
  // 1回目のトリック勝者の得点に加算されるまでの一時置き場（加算処理自体はFR-26の責務）

  turnOrder: PlayerId[]; // 現在の手番順
}
