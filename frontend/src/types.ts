// backend/src/types.ts の Card 定義と同じ形を frontend 側に複製したもの。
// frontend/backend は別プロジェクトで共有パッケージが無いため、型はここで個別に持つ。
export type Suit = "spade" | "diamond" | "heart" | "club";

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "J" | "Q" | "K" | "A";

export type Card = { type: "normal"; suit: Suit; rank: Rank } | { type: "joker" };
