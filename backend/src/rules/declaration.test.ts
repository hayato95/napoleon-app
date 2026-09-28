import { describe, expect, it } from "vitest";
import type { Declaration, GameState, Player, PlayerId } from "../types.js";
import { isStrongerDeclaration, submitDeclaration } from "./declaration.js";

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
    fukukanCard: null,
    fukukanId: null,
    hitoridachi: false,
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

  it("直前の宣言より枚数が多ければ通る", () => {
    const state = { ...createState(), declarations: [{ playerId: 0, suit: "heart", declaredCardCount: 11 } satisfies Declaration] };

    const next = submitDeclaration(state, 1, "club", 12);

    expect(next.declarations[1]).toEqual({ playerId: 1, suit: "club", declaredCardCount: 12 });
  });

  it("直前の宣言より枚数が少なければ拒否される", () => {
    const state = { ...createState(), declarations: [{ playerId: 0, suit: "spade", declaredCardCount: 13 } satisfies Declaration] };

    expect(() => submitDeclaration(state, 1, "spade", 11)).toThrow();
  });

  it("枚数が同じでもスートが弱ければ拒否される", () => {
    const state = { ...createState(), declarations: [{ playerId: 0, suit: "spade", declaredCardCount: 12 } satisfies Declaration] };

    expect(() => submitDeclaration(state, 1, "club", 12)).toThrow();
  });

  it("枚数が同じでスートが強ければ通る", () => {
    const state = { ...createState(), declarations: [{ playerId: 0, suit: "club", declaredCardCount: 12 } satisfies Declaration] };

    const next = submitDeclaration(state, 1, "spade", 12);

    expect(next.declarations[1]).toEqual({ playerId: 1, suit: "spade", declaredCardCount: 12 });
  });

  it("直前がパスでも、その前の宣言と比較される", () => {
    const state = {
      ...createState(),
      declarations: [
        { playerId: 0, suit: "spade", declaredCardCount: 13 } satisfies Declaration,
        { playerId: 1, suit: null, declaredCardCount: null } satisfies Declaration,
      ],
    };

    expect(() => submitDeclaration(state, 2, "spade", 12)).toThrow();
  });

  it("誰も宣言していなければ何を宣言しても通る", () => {
    const state = createState();

    const next = submitDeclaration(state, 0, "club", 11);

    expect(next.declarations[0]).toEqual({ playerId: 0, suit: "club", declaredCardCount: 11 });
  });

  it("パスは強さに関係なく常に通る", () => {
    const state = { ...createState(), declarations: [{ playerId: 0, suit: "spade", declaredCardCount: 13 } satisfies Declaration] };

    const next = submitDeclaration(state, 1, null, null);

    expect(next.declarations[1]).toEqual({ playerId: 1, suit: null, declaredCardCount: null });
  });
});

describe("isStrongerDeclaration", () => {
  it("枚数が多い方が強い", () => {
    const a: Declaration = { playerId: 0, suit: "club", declaredCardCount: 12 };
    const b: Declaration = { playerId: 1, suit: "spade", declaredCardCount: 11 };

    expect(isStrongerDeclaration(a, b)).toBe(true);
  });

  it("枚数が同じなら、スートの強さ(♠＞♦＞♡＞クローバー)で比較する", () => {
    const spade: Declaration = { playerId: 0, suit: "spade", declaredCardCount: 12 };
    const club: Declaration = { playerId: 1, suit: "club", declaredCardCount: 12 };

    expect(isStrongerDeclaration(spade, club)).toBe(true);
    expect(isStrongerDeclaration(club, spade)).toBe(false);
  });

  it("パスを比較しようとするとエラーになる", () => {
    const pass: Declaration = { playerId: 0, suit: null, declaredCardCount: null };
    const declare: Declaration = { playerId: 1, suit: "spade", declaredCardCount: 11 };

    expect(() => isStrongerDeclaration(pass, declare)).toThrow();
  });
});
