import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { assignFukukan } from "./fukukan-assignment.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "fukukanNomination",
    players: PLAYER_IDS.map(createPlayer),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 12,
    napoleonId: 0,
    fukukanCard: HEART_QUEEN,
    fukukanId: null,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

// 指定したプレイヤーに手札を持たせた状態を作る
function withHand(state: GameState, id: PlayerId, hand: Card[]): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === id ? { ...player, hand } : player)),
  };
}

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const CLUB_3: Card = { type: "normal", suit: "club", rank: 3 };
const JOKER: Card = { type: "joker" };

describe("FR-10: assignFukukan（副官の確定）", () => {
  it("ナポレオン以外の誰かが指定カードを持っていれば、その人が副官になる", () => {
    const state = withHand(createState(), 3, [CLUB_3, HEART_QUEEN]);

    const result = assignFukukan(state);

    expect(result.fukukanId).toBe(3);
    expect(result.hitoridachi).toBe(false);
  });

  it("指定カードが場札(widow)にあれば独り立ち", () => {
    const state = createState({ widow: [CLUB_3, HEART_QUEEN, JOKER] });

    const result = assignFukukan(state);

    expect(result.fukukanId).toBeNull();
    expect(result.hitoridachi).toBe(true);
  });

  it("ナポレオンが自分の手札のカードを指定したら独り立ち", () => {
    const state = withHand(createState(), 0, [HEART_QUEEN]);

    const result = assignFukukan(state);

    expect(result.fukukanId).toBeNull();
    expect(result.hitoridachi).toBe(true);
  });

  it("ナポレオンが0番以外でも、他の4人から正しく探せる", () => {
    // ナポレオン=2番、指定カードは0番が持っている
    const state = withHand(createState({ napoleonId: 2 }), 0, [HEART_QUEEN]);

    const result = assignFukukan(state);

    expect(result.fukukanId).toBe(0);
  });

  it("ジョーカーを指定した場合も探せる", () => {
    const state = withHand(createState({ fukukanCard: JOKER }), 4, [JOKER]);

    const result = assignFukukan(state);

    expect(result.fukukanId).toBe(4);
  });

  it("中身が同じ別オブジェクトのカードでも一致と判定する", () => {
    // fukukanCard と手札のカードは別々に作ったオブジェクト（=== では一致しない）
    const state = withHand(
      createState({ fukukanCard: { type: "normal", suit: "heart", rank: "Q" } }),
      1,
      [{ type: "normal", suit: "heart", rank: "Q" }],
    );

    expect(assignFukukan(state).fukukanId).toBe(1);
  });

  it("元のstateは書き換えない（新しいstateを返す）", () => {
    const state = withHand(createState(), 3, [HEART_QUEEN]);

    assignFukukan(state);

    expect(state.fukukanId).toBeNull();
  });

  it("ナポレオンが決まっていなければエラー", () => {
    expect(() => assignFukukan(createState({ napoleonId: null }))).toThrow();
  });

  it("副官指定カードが選ばれていなければエラー", () => {
    expect(() => assignFukukan(createState({ fukukanCard: null }))).toThrow();
  });

  it("既に副官が確定していればエラー", () => {
    expect(() => assignFukukan(createState({ fukukanId: 3 }))).toThrow();
    expect(() => assignFukukan(createState({ hitoridachi: true }))).toThrow();
  });
});
