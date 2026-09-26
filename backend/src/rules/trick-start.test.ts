import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId, Trick } from "../types.js";
import { playLeadCard } from "./trick-start.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId, hand: Card[] = []): Player {
  return { id, name: `player${id}`, isHuman: false, hand };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "trick",
    players: PLAYER_IDS.map((id) => createPlayer(id)),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 12,
    napoleonId: 0,
    fukukanCard: null,
    fukukanId: null,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const SPADE_KING: Card = { type: "normal", suit: "spade", rank: "K" };
const JOKER: Card = { type: "joker" };

// 「前のトリックの勝者」役を固定するテスト用ID。winnerIdとplayLeadCardの呼び出し引数が
// 同じ人物を指していることを、値の一致ではなく名前で伝えるための定数。
const PREVIOUS_TRICK_WINNER_ID: PlayerId = 3;

describe("playLeadCard", () => {
  it("最初のトリックはナポレオンが手札から自由な1枚をリードできる", () => {
    const state = createState({
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 0 ? [HEART_QUEEN, SPADE_KING] : [])),
    });

    const result = playLeadCard(state, 0, HEART_QUEEN);

    expect(result.currentTrick).toEqual({
      leaderId: 0,
      plays: [{ playerId: 0, card: HEART_QUEEN }],
    });
  });

  it("出したカードは手札から取り除かれる", () => {
    const state = createState({
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 0 ? [HEART_QUEEN, SPADE_KING] : [])),
    });

    const result = playLeadCard(state, 0, HEART_QUEEN);

    expect(result.players[0].hand).toEqual([SPADE_KING]);
  });

  it("役札・切り札・副官指定カードも含めて自由に出せる(制約なし)", () => {
    const state = createState({
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 0 ? [JOKER] : [])),
    });

    const result = playLeadCard(state, 0, JOKER);

    expect(result.currentTrick?.plays[0].card).toEqual(JOKER);
  });

  it("最初のトリックでナポレオン以外がリードしようとするとエラー", () => {
    const state = createState({
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 1 ? [HEART_QUEEN] : [])),
    });

    expect(() => playLeadCard(state, 1, HEART_QUEEN)).toThrow();
  });

  it("2回目以降のトリックは前のトリックの勝者がリードする", () => {
    const finishedTrick: Trick = {
      leaderId: 0,
      plays: [{ playerId: 0, card: SPADE_KING }],
      winnerId: PREVIOUS_TRICK_WINNER_ID,
    };
    const state = createState({
      trickHistory: [finishedTrick],
      players: PLAYER_IDS.map((id) => createPlayer(id, id === PREVIOUS_TRICK_WINNER_ID ? [HEART_QUEEN] : [])),
    });

    const result = playLeadCard(state, PREVIOUS_TRICK_WINNER_ID, HEART_QUEEN);

    expect(result.currentTrick?.leaderId).toBe(PREVIOUS_TRICK_WINNER_ID);
  });

  it("前のトリックの勝者以外がリードしようとするとエラー", () => {
    const finishedTrick: Trick = {
      leaderId: 0,
      plays: [{ playerId: 0, card: SPADE_KING }],
      winnerId: PREVIOUS_TRICK_WINNER_ID,
    };
    const state = createState({
      trickHistory: [finishedTrick],
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 1 ? [HEART_QUEEN] : [])),
    });

    expect(() => playLeadCard(state, 1, HEART_QUEEN)).toThrow();
  });

  it("前のトリックが終わっていない(currentTrickがある)場合はエラー", () => {
    const state = createState({
      currentTrick: { leaderId: 0, plays: [{ playerId: 0, card: SPADE_KING }] },
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 1 ? [HEART_QUEEN] : [])),
    });

    expect(() => playLeadCard(state, 1, HEART_QUEEN)).toThrow();
  });

  it("トリックフェーズ以外ではエラー", () => {
    const state = createState({
      phase: "cardExchange",
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 0 ? [HEART_QUEEN] : [])),
    });

    expect(() => playLeadCard(state, 0, HEART_QUEEN)).toThrow();
  });

  it("手札に無いカードは出せない", () => {
    const state = createState({
      players: PLAYER_IDS.map((id) => createPlayer(id, id === 0 ? [SPADE_KING] : [])),
    });

    expect(() => playLeadCard(state, 0, HEART_QUEEN)).toThrow();
  });
});
