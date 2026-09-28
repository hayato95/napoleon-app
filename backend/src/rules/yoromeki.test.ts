import { describe, expect, it } from "vitest";
import { getYoromekiWinner, isYoromeki } from "./yoromeki.js";
import type { PlayerId, Rank, Suit, TrickPlay } from "../types.js";

// --- テスト用の小さな道具 ---
// 毎回 { playerId: 0, card: { type: "normal", suit: "spade", rank: "A" } } と書くのは大変なので、短く書けるようにする
const play = (playerId: PlayerId, suit: Suit, rank: Rank): TrickPlay => ({
  playerId,
  card: { type: "normal", suit, rank },
});
const joker = (playerId: PlayerId): TrickPlay => ({
  playerId,
  card: { type: "joker" },
});

describe("FR-24: isYoromeki（よろめきの成立判定）", () => {
  it("♠Aと♡Qが同じトリックにあれば true", () => {
    const plays = [play(0, "spade", "A"), play(1, "heart", "Q"), play(2, "club", 5)];
    expect(isYoromeki(plays)).toBe(true);
  });

  it("♡Qが先に出ていても true（出る順番は関係ない）", () => {
    const plays = [play(3, "heart", "Q"), play(4, "heart", 2), play(0, "spade", "A")];
    expect(isYoromeki(plays)).toBe(true);
  });

  it("♠Aだけで♡Qがなければ false", () => {
    const plays = [play(0, "spade", "A"), play(1, "heart", "K"), play(2, "club", 5)];
    expect(isYoromeki(plays)).toBe(false);
  });

  it("♡Qだけで♠Aがなければ false", () => {
    const plays = [play(0, "heart", "Q"), play(1, "heart", "A"), play(2, "spade", "K")];
    expect(isYoromeki(plays)).toBe(false);
  });

  it("他のスートのQ（♠Q）では成立しない", () => {
    const plays = [play(0, "spade", "A"), play(1, "spade", "Q")];
    expect(isYoromeki(plays)).toBe(false);
  });

  it("ジョーカーが混ざっていても、♠Aと♡Qがあれば true", () => {
    const plays = [joker(0), play(1, "spade", "A"), play(2, "heart", "Q")];
    expect(isYoromeki(plays)).toBe(true);
  });

  it("空のトリックなら false", () => {
    expect(isYoromeki([])).toBe(false);
  });
});

describe("FR-24: getYoromekiWinner（よろめき成立時の勝者）", () => {
  it("よろめき成立なら♡Qを出したプレイヤーを返す", () => {
    const plays = [
      play(0, "spade", "A"),
      play(1, "club", 3),
      play(2, "heart", "Q"),
      play(3, "diamond", 9),
      play(4, "heart", 10),
    ];
    expect(getYoromekiWinner(plays)).toBe(2);
  });

  it("よろめき不成立なら null（通常の勝者判定に任せる）", () => {
    const plays = [play(0, "spade", "A"), play(1, "heart", "K")];
    expect(getYoromekiWinner(plays)).toBeNull();
  });
});
