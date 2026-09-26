import type {
  Card,
  Declaration,
  GameState,
  Phase,
  PlayerId,
  Suit,
  Trick,
} from "../types.js";

// FR-10のスコープ（後半）: サーバーが持つ完全なGameStateから、特定のプレイヤーに見せてよい情報だけを切り出す。
//
// クライアントに送るとき・CPU(AI)に判断させるときは、必ずこの関数の戻り値を使い、GameStateを直接渡さないこと。
// 画面に表示しないだけでは、通信内容（ブラウザの開発者ツール）を見れば副官が分かってしまう。
// AIにGameStateを直接渡すと、副官を知ったうえで動く「ズル」になってしまう。
//
// 見せ方のルール:
//   - 自分の手札 → 見える / 他人の手札 → 枚数だけ
//   - 副官指定カード(fukukanCard) → 全員に公開（何が指定されたかは皆知っている）
//   - 誰が副官か → 副官本人だけが知っている（ナポレオンも知らない）
//   - 独り立ちかどうか → ナポレオンだけが知っている（自分の手札か場札で指定カードを見ているため）
//   - FR-12で公開された後(fukukanRevealed) → 全員に見える

// 他のプレイヤーの情報（手札の中身は持たせない）
export interface PublicPlayerInfo {
  id: PlayerId;
  name: string;
  isHuman: boolean;
  handCount: number;
}

export interface PlayerView {
  viewerId: PlayerId; // このビューを見ているプレイヤー
  phase: Phase;

  myHand: Card[];
  players: PublicPlayerInfo[]; // 自分を含む5人分。手札は枚数だけ
  widowCount: number; // 場札は裏向きなので枚数だけ

  declarations: Declaration[];
  trumpSuit: Suit | null;
  declaredCount: number | null;
  napoleonId: PlayerId | null;

  fukukanCard: Card | null; // 全員に公開
  isFukukan: boolean; // 自分が副官か（副官本人のビューでだけ true になる）
  fukukanId: PlayerId | null; // 公開前は副官本人のビューにだけ自分のIDが入る。それ以外は null
  hitoridachi: boolean | null; // 知らされていない人・まだ確定していないときは null
  fukukanRevealed: boolean;

  currentTrick: Trick | null;
  trickHistory: Trick[];
  capturedCards: Record<PlayerId, Card[]>; // 獲得した絵札は表向きなので全員に公開
  turnOrder: PlayerId[];
}

export function toPlayerView(state: GameState, viewerId: PlayerId): PlayerView {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) {
    throw new Error(`プレイヤー${viewerId}が見つかりません`);
  }

  const isFukukan = state.fukukanId !== null && state.fukukanId === viewerId;
  const isNapoleon = state.napoleonId !== null && state.napoleonId === viewerId;
  const isDecided = state.fukukanId !== null || state.hitoridachi; // FR-10の確定処理が済んでいるか

  // 誰が副官か: 公開後は全員、公開前は副官本人だけ
  const visibleFukukanId = state.fukukanRevealed || isFukukan ? state.fukukanId : null;

  // 独り立ちかどうか: 公開後は全員、公開前はナポレオンだけ（確定前は誰にも null）
  const visibleHitoridachi =
    isDecided && (state.fukukanRevealed || isNapoleon) ? state.hitoridachi : null;

  return {
    viewerId,
    phase: state.phase,

    myHand: [...viewer.hand],
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      handCount: player.hand.length,
    })),
    widowCount: state.widow.length,

    declarations: [...state.declarations],
    trumpSuit: state.trumpSuit,
    declaredCount: state.declaredCount,
    napoleonId: state.napoleonId,

    fukukanCard: state.fukukanCard,
    isFukukan,
    fukukanId: visibleFukukanId,
    hitoridachi: visibleHitoridachi,
    fukukanRevealed: state.fukukanRevealed,

    currentTrick: state.currentTrick,
    trickHistory: [...state.trickHistory],
    capturedCards: { ...state.capturedCards },
    turnOrder: [...state.turnOrder],
  };
}
