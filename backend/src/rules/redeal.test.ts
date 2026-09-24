import { describe, expect, it } from "vitest";
import { shouldRedeal } from "./redeal.js";
import type { Declaration, PlayerId, Suit } from "../types.js";

// --- テスト用の小さな道具 ---
// 毎回 { playerId: 0, suit: null, count: null } と書くのは大変なので、短く書けるようにする
const pass = (playerId: PlayerId): Declaration => ({
  playerId,
  suit: null,
    declaredCardCount: null, // null = パス（types.tsの決まり）
});
const declare = (playerId: PlayerId, suit: Suit, count: number): Declaration => ({
  playerId,
  suit,
  declaredCardCount: count,
});

describe("FR-05: shouldRedeal（全員パスなら配り直し）", () => {
  it("5人全員がパスしたら true", () => {
    const declarations = [pass(0), pass(1), pass(2), pass(3), pass(4)];
    expect(shouldRedeal(declarations)).toBe(true);
  });

  it("途中の人から始まっても、5人全員パスなら true", () => {
    // FR-06Cでせりの開始者はランダムなので、0番から始まるとは限らない
    const declarations = [pass(2), pass(3), pass(4), pass(0), pass(1)];
    expect(shouldRedeal(declarations)).toBe(true);
  });

  it("誰か1人でも宣言していたら false", () => {
    const declarations = [pass(0), pass(1), pass(2), declare(3, "spade", 12)];
    expect(shouldRedeal(declarations)).toBe(false);
  });

  it("最初の人が宣言し、残り4人がパスしたら false（配り直しではなくFR-06へ）", () => {
    const declarations = [declare(0, "heart", 11), pass(1), pass(2), pass(3), pass(4)];
    expect(shouldRedeal(declarations)).toBe(false);
  });

  it("まだ一周していない（2人だけパス）なら false", () => {
    const declarations = [pass(0), pass(1)];
    expect(shouldRedeal(declarations)).toBe(false);
  });

  it("記録が空なら false", () => {
    expect(shouldRedeal([])).toBe(false);
  });
});