import { describe, expect, it } from "vitest";
import {
  isValidDeclaredCardCount,
  MAX_DECLARED_CARD_COUNT,
  MIN_DECLARED_CARD_COUNT,
} from "./declaration-limit.js";

describe("FR-07: isValidDeclaredCardCount（宣言できる枚数の範囲チェック）", () => {
  it("最低枚数は11枚、最大枚数は20枚である", () => {
    expect(MIN_DECLARED_CARD_COUNT).toBe(11);
    expect(MAX_DECLARED_CARD_COUNT).toBe(20);
  });

  it("パス（null）は常に有効", () => {
    expect(isValidDeclaredCardCount(null)).toBe(true);
  });

  it("下限ちょうど（11枚）は有効", () => {
    expect(isValidDeclaredCardCount(11)).toBe(true);
  });

  it("上限ちょうど（20枚）は有効", () => {
    expect(isValidDeclaredCardCount(20)).toBe(true);
  });

  it("範囲の中（15枚）は有効", () => {
    expect(isValidDeclaredCardCount(15)).toBe(true);
  });

  it("下限未満（10枚）は無効", () => {
    expect(isValidDeclaredCardCount(10)).toBe(false);
  });

  it("上限超え（21枚）は無効", () => {
    expect(isValidDeclaredCardCount(21)).toBe(false);
  });

  it("整数でない枚数（11.5枚）は無効", () => {
    expect(isValidDeclaredCardCount(11.5)).toBe(false);
  });
});