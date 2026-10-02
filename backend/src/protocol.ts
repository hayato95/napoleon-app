import type { Card, PlayerId, Rank, Suit } from "./types.js";
import type { GameResult } from "./rules/game-result.js";
import type { PlayerView } from "./rules/player-view.js";

// クライアント⇔サーバーでやり取りするデータの型と、クライアントから届いたデータの検証。
// クライアントから届くデータは何でも入りうるので、parsePlayerAction で形を確かめてから使う（FR-60）。

// 人間プレイヤーが行える操作。誰の操作か(playerId)はサーバーがソケットから決めるので、ここには含めない。
export type PlayerAction =
  | { type: "startGame" }
  | { type: "declare"; suit: Suit; count: number }
  | { type: "pass" }
  | { type: "nominateFukukan"; card: Card }
  | { type: "discard"; cards: Card[] }
  | { type: "playCard"; card: Card; leadJokerSuit?: Suit };

// サーバーが状態の変わるたびに送る内容（イベント名 "stateUpdate"）
export interface StateUpdate {
  view: PlayerView; // 見せてよい情報だけに絞った状態（toPlayerView）
  actorId: PlayerId | null; // 今操作する必要があるプレイヤー。ゲーム終了後は null
  playableCards: Card[]; // トリック中で自分の番のときだけ、手札のうち出せるカード。それ以外は空
  result: GameResult | null; // 勝敗判定フェーズに入ったときだけ入る
}

const SUITS: readonly Suit[] = ["spade", "diamond", "heart", "club"];
const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
const DISCARD_COUNT = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSuit(value: unknown): Suit {
  if (typeof value === "string" && (SUITS as readonly string[]).includes(value)) {
    return value as Suit;
  }
  throw new Error("スートが正しくありません");
}

export function parseCard(value: unknown): Card {
  if (!isRecord(value)) {
    throw new Error("カードの形式が正しくありません");
  }
  if (value.type === "joker") {
    return { type: "joker" };
  }
  if (value.type === "normal") {
    const rank = value.rank;
    if (!(RANKS as readonly unknown[]).includes(rank)) {
      throw new Error("カードのランクが正しくありません");
    }
    return { type: "normal", suit: parseSuit(value.suit), rank: rank as Rank };
  }
  throw new Error("カードの種類が正しくありません");
}

/**
 * クライアントから届いたデータを PlayerAction に変換する。形が正しくなければ Error を投げる。
 * ゲームのルール上その操作が許されるか（手番・フェーズ・手札にあるか）は、ここでは見ない（game-flow側の責務）。
 */
export function parsePlayerAction(raw: unknown): PlayerAction {
  if (!isRecord(raw)) {
    throw new Error("操作の形式が正しくありません");
  }

  switch (raw.type) {
    case "startGame":
      return { type: "startGame" };
    case "declare": {
      const count = raw.count;
      if (typeof count !== "number" || !Number.isInteger(count)) {
        throw new Error("宣言枚数が正しくありません");
      }
      return { type: "declare", suit: parseSuit(raw.suit), count };
    }
    case "pass":
      return { type: "pass" };
    case "nominateFukukan":
      return { type: "nominateFukukan", card: parseCard(raw.card) };
    case "discard": {
      if (!Array.isArray(raw.cards) || raw.cards.length !== DISCARD_COUNT) {
        throw new Error(`捨てるカードは${DISCARD_COUNT}枚選んでください`);
      }
      return { type: "discard", cards: raw.cards.map(parseCard) };
    }
    case "playCard": {
      const card = parseCard(raw.card);
      if (raw.leadJokerSuit === undefined || raw.leadJokerSuit === null) {
        return { type: "playCard", card };
      }
      return { type: "playCard", card, leadJokerSuit: parseSuit(raw.leadJokerSuit) };
    }
    default:
      throw new Error("未対応の操作です");
  }
}
