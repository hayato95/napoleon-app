import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { nominateFukukan } from "./fukukan-nomination.js";

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
    fukukanCard: null,
    fukukanId: null,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    discardedCards: [],
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };

describe("nominateFukukan", () => {
  it("ナポレオンが副官指定カードを選ぶとfukukanCardにセットされる", () => {
    const state = createState();

    const result = nominateFukukan(state, 0, HEART_QUEEN);

    expect(result.fukukanCard).toEqual(HEART_QUEEN);
  });

  it("ナポレオン以外が選ぼうとするとエラー", () => {
    const state = createState();

    expect(() => nominateFukukan(state, 1, HEART_QUEEN)).toThrow();
  });

  it("副官指名フェーズ以外ではエラー", () => {
    const state = createState({ phase: "declaration" });

    expect(() => nominateFukukan(state, 0, HEART_QUEEN)).toThrow();
  });

  it("既に選択済みの場合は再指定できない", () => {
    const state = createState({ fukukanCard: { type: "joker" } });

    expect(() => nominateFukukan(state, 0, HEART_QUEEN)).toThrow();
  });

  it("自分の手札にないカードでも指定できる(ナポレオンゲームの仕様)", () => {
    const state = createState();

    const result = nominateFukukan(state, 0, { type: "joker" });

    expect(result.fukukanCard).toEqual({ type: "joker" });
  });
});
