// FR-07: 宣言できる枚数の範囲（5人プレイ）
// 下限11枚は要件定義書で確定。上限20枚は絵札の総数（A・K・Q・J・10 × 4スート）。
export const MIN_DECLARED_CARD_COUNT = 11;
export const MAX_DECLARED_CARD_COUNT = 20;

/**
 * FR-07: 宣言の枚数が有効かどうかを判定する。
 * @param count 宣言枚数（null はパス）
 * @returns 有効なら true
 */
export function isValidDeclaredCardCount(count: number | null): boolean {
  // パスは枚数を持たないので、常に有効
  if (count === null) {
    return true;
  }

  // 小数などの整数でない値は無効（不正なリクエスト対策：FR-60）
  if (!Number.isInteger(count)) {
    return false;
  }

  // 11〜20枚の範囲内なら有効
  return MIN_DECLARED_CARD_COUNT <= count && count <= MAX_DECLARED_CARD_COUNT;
}