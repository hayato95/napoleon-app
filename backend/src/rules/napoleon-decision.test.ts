import { describe, expect, it } from "vitest";
import type { Declaration, PlayerId } from "../types.js";
import { determineNapoleon } from "./napoleon-decision.js";

const pass = (playerId: PlayerId): Declaration => ({ playerId, suit: null, declaredCardCount: null });
const declare = (playerId: PlayerId, suit: Declaration["suit"], declaredCardCount: number): Declaration => ({
  playerId,
  suit,
  declaredCardCount,
});

describe("determineNapoleon", () => {
  it("誰も宣言していなければnull", () => {
    expect(determineNapoleon([])).toBeNull();
  });

  it("全員パスで誰も宣言していなければnull(FR-05の管轄)", () => {
    const declarations = [pass(0), pass(1), pass(2), pass(3), pass(4)];

    expect(determineNapoleon(declarations)).toBeNull();
  });

  it("宣言の後、まだ残り4人全員パスしていなければnull", () => {
    const declarations = [declare(0, "spade", 12), pass(1), pass(2)];

    expect(determineNapoleon(declarations)).toBeNull();
  });

  it("宣言の後、残り4人全員が連続パスしたらナポレオンが確定する", () => {
    const declarations = [declare(0, "spade", 12), pass(1), pass(2), pass(3), pass(4)];

    expect(determineNapoleon(declarations)).toEqual({
      napoleonId: 0,
      trumpSuit: "spade",
      declaredCardCount: 12,
    });
  });

  it("複数回宣言し直されても、直近の宣言者がナポレオンになる", () => {
    const declarations = [
      declare(0, "club", 11),
      pass(1),
      declare(2, "spade", 12),
      pass(3),
      pass(4),
      pass(0),
      pass(1),
    ];

    expect(determineNapoleon(declarations)).toEqual({
      napoleonId: 2,
      trumpSuit: "spade",
      declaredCardCount: 12,
    });
  });
});
