import { describe, expect, it } from "vitest";
import type { GameState, Player, PlayerId } from "../types.js";
import { submitDeclaration } from "./declaration.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(): GameState {
  return {
    phase: "declaration",
    players: PLAYER_IDS.map(createPlayer),
    widow: [],
    declarations: [],
    trumpSuit: null,
    declaredCount: null,
    napoleonId: null,
    designatedCard: null,
    fukukanId: null,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    turnOrder: [0, 1, 2, 3, 4],
  };
}

describe("submitDeclaration", () => {
  it("宣言をdeclarationsに記録する", () => {
    const state = createState();

    const next = submitDeclaration(state, 0, "spade", 12);

    expect(next.declarations).toEqual([{ playerId: 0, suit: "spade", declaredCardCount: 12 }]);
  });

  it("パス(suit/declaredCardCountがnull)も記録できる", () => {
    const state = createState();

    const next = submitDeclaration(state, 0, null, null);

    expect(next.declarations).toEqual([{ playerId: 0, suit: null, declaredCardCount: null }]);
  });

  it("turnOrderの先頭を末尾に回して次の手番に進める", () => {
    const state = createState();

    const next = submitDeclaration(state, 0, "spade", 12);

    expect(next.turnOrder).toEqual([1, 2, 3, 4, 0]);
  });

  it("元のstateを変更しない", () => {
    const state = createState();

    submitDeclaration(state, 0, "spade", 12);

    expect(state.declarations).toEqual([]);
    expect(state.turnOrder).toEqual([0, 1, 2, 3, 4]);
  });
});
