import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { revealDiscardedFaceCards } from "./discard-review.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

function createPlayer(id: PlayerId): Player {
  return { id, name: `player${id}`, isHuman: false, hand: [] };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "cardExchange",
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
const CLUB_TEN: Card = { type: "normal", suit: "club", rank: 10 };
const SPADE_FIVE: Card = { type: "normal", suit: "spade", rank: 5 };
const JOKER: Card = { type: "joker" };

describe("revealDiscardedFaceCards", () => {
  it("捨てた3枚のうち絵札だけが discardedCards にセットされる", () => {
    const state = createState();

    const result = revealDiscardedFaceCards(state, [HEART_QUEEN, CLUB_TEN, SPADE_FIVE]);

    expect(result.discardedCards).toEqual([HEART_QUEEN, CLUB_TEN]);
  });

  it("絵札が1枚も無ければ discardedCards は空", () => {
    const state = createState();

    const result = revealDiscardedFaceCards(state, [SPADE_FIVE, { type: "normal", suit: "club", rank: 6 }, { type: "normal", suit: "diamond", rank: 2 }]);

    expect(result.discardedCards).toEqual([]);
  });

  it("ジョーカーは絵札として扱わない", () => {
    const state = createState();

    const result = revealDiscardedFaceCards(state, [JOKER, SPADE_FIVE, { type: "normal", suit: "club", rank: 2 }]);

    expect(result.discardedCards).toEqual([]);
  });

  it("捨てるカードが3枚以外だとエラー", () => {
    const state = createState();

    expect(() => revealDiscardedFaceCards(state, [HEART_QUEEN, CLUB_TEN])).toThrow();
  });

  it("カード交換フェーズ以外ではエラー", () => {
    const state = createState({ phase: "trick" });

    expect(() => revealDiscardedFaceCards(state, [HEART_QUEEN, CLUB_TEN, SPADE_FIVE])).toThrow();
  });
});
