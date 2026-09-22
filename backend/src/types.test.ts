import { describe, expect, it } from "vitest";
import { SUIT_STRENGTH_ORDER } from "./types.js";

// テスト環境が動くことを確認するためのスモークテスト。
// 各FRの実装が進んだら、実際のルールエンジンのテストをここに足していく。
describe("テスト環境の動作確認", () => {
  it("SUIT_STRENGTH_ORDERが♠>♦>♡>クローバーの順になっている", () => {
    expect(SUIT_STRENGTH_ORDER).toEqual(["spade", "diamond", "heart", "club"]);
  });
});
