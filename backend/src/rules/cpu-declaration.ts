import type { Card, Declaration, PlayerId, Suit } from "../types.js";
import { SUIT_STRENGTH_ORDER } from "../types.js";
import { MIN_DECLARED_CARD_COUNT } from "./declaration-limit.js";
import { findLatestDeclaration, isStrongerDeclaration } from "./declaration.js";
import { isMighty, isYoromekiQueen } from "./yoromeki.js";

// FR-29のスコープ: CPUが手札の強さから、宣言するか・パスするかを決める。
// 実際に宣言を記録するのは submitDeclaration の仕事。この関数は「どう宣言するか」を返すだけ。
//
// issue #36 から変えたところ（PRで確認したい）:
//   - 点数の付け方を独自に決めた（役札+3点・絵札+1点ではなく、下の cardsDeclarationJudgement の配点）
//   - 「今の最高宣言より強くできない場合はパス」の判定のため、点数から最大宣言枚数を決めている
//   - 「お得パス」を追加: 宣言されたスートを自分も6点以上持っていれば、50%でパスして連合軍側に回る
//
// 手札はせりの途中で変わらない（場札3枚を取るのはナポレオン確定後）ので、
// 点数や最大宣言は番が来るたびに手札から計算し直している。番をまたいで覚えておく値はない。

// 宣言するのに必要な最低点。この点数で最低枚数(11枚)まで宣言できる
export const CPU_DECLARE_MIN_SCORE = 8;
// CPUが宣言する枚数の上限（ルール上の上限20枚とは別に、CPUが無理をしないための上限）
export const CPU_MAX_DECLARED_CARD_COUNT = 16;
// 強くできる場合でも、わざとパスする確率（様子見）
export const CPU_RANDOM_PASS_RATE = 0.15;
// お得パス: 宣言されたスートで自分がこの点数以上なら、お得パスの対象になる
export const CPU_OTOKU_PASS_MIN_SCORE = 6;
// お得パスの対象になったとき、実際にパスする確率
export const CPU_OTOKU_PASS_RATE = 0.5;

// 切り札と同じ色のもう一方のスート（裏ジャックの判定に使う）。
// card-strength.ts にも同じ表があるが export されていないので、ここに持っている。
const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: "club",
  club: "spade",
  diamond: "heart",
  heart: "diamond",
};

/**
 * 手札を見て、4スートそれぞれを切り札にした場合の点数を返す。
 * @param hand 自分の手札
 * @returns ♠♦♥♣ の順（SUIT_STRENGTH_ORDER の順）に並んだ4つの点数
 */
export function cardsDeclarationJudgement(hand: Card[]): number[] {
  return SUIT_STRENGTH_ORDER.map((suit) => scoreForSuit(hand, suit));
}

// 「このスートを切り札にしたら何点か」を1スート分だけ計算する
function scoreForSuit(hand: Card[], trumpSuit: Suit): number {
  const hasMighty = hand.some((card) => isMighty(card));
  const hasJoker = hand.some((card) => card.type === "joker");
  const hasSpade3 = hand.some((card) => card.type === "normal" && card.suit === "spade" && card.rank === 3);
  const hasYoromeki = hand.some((card) => isYoromekiQueen(card));
  const hasCorrectJack = hand.some((card) => card.type === "normal" && card.suit === trumpSuit && card.rank === "J");
  const hasBackJack = hand.some(
    (card) => card.type === "normal" && card.suit === SAME_COLOR_SUIT[trumpSuit] && card.rank === "J",
  );

  let score = 0;

  // --- どのスートで計算しても同じ点 ---
  if (hasMighty) score += 3;
  if (hasJoker) score += 3;
  if (hasSpade3) score += 1;
  if (hasYoromeki) score += 1;
  if (hasJoker && hasSpade3) score += 1; // ジョーカー請求されない
  if (hasMighty && hasYoromeki) score += 1; // よろめきを食らわない

  // --- スートによって変わる点 ---
  if (hasCorrectJack) score += 3;
  if (hasBackJack) score += 3;

  // そのスートの枚数と、A・K・Qの枚数を数える（マイティとよろめきは A・Q の加点に入れない）
  let trumpCount = 0;
  let honorCount = 0;
  for (const card of hand) {
    if (card.type !== "normal" || card.suit !== trumpSuit) {
      continue;
    }
    trumpCount++;
    if (isMighty(card) || isYoromekiQueen(card)) {
      continue;
    }
    if (card.rank === "A" || card.rank === "K" || card.rank === "Q") {
      honorCount++;
    }
  }

  if (trumpCount >= 4) {
    score += 5 + (trumpCount - 4) + honorCount;
  }

  return score;
}

// 点数から、宣言してよい最大枚数を決める。8点で11枚、1点ごとに+1枚、16枚で頭打ち。7点以下は null（宣言しない）
function maxDeclaredCardCount(score: number): number | null {
  if (score < CPU_DECLARE_MIN_SCORE) {
    return null;
  }
  const count = MIN_DECLARED_CARD_COUNT + (score - CPU_DECLARE_MIN_SCORE);
  return Math.min(count, CPU_MAX_DECLARED_CARD_COUNT);
}

/**
 * FR-29: CPUの番が来たときに、宣言するかパスするかを決める。
 * @param hand 自分の手札
 * @param playerId 自分のID
 * @param declarations これまでのせりの記録（PlayerView.declarations を渡す）
 * @param random1 0以上1未満の乱数。わざとパスする(15%)かどうかに使う。本番では Math.random() を渡す
 * @param random2 0以上1未満の乱数。お得パス(50%)するかどうかに使う。本番では Math.random() を渡す
 * @returns 宣言。パスのときは suit と declaredCardCount が null
 */
export function cpuDeclaration(
  hand: Card[],
  playerId: PlayerId,
  declarations: Declaration[],
  random1: number,
  random2: number,
): Declaration {
  const pass: Declaration = { playerId, suit: null, declaredCardCount: null };

  // 手札の点数から、宣言したいスートと最大枚数を決める
  const suitStrength = cardsDeclarationJudgement(hand);

  // 一番点の高いスート。同点なら ♠♦♥♣ の順で前のスートを優先する（">" なので同点では入れ替わらない）
  let bestIndex = 0;
  for (let i = 1; i < suitStrength.length; i++) {
    if (suitStrength[i] > suitStrength[bestIndex]) {
      bestIndex = i;
    }
  }
  const wantedSuit = SUIT_STRENGTH_ORDER[bestIndex];
  const maxCount = maxDeclaredCardCount(suitStrength[bestIndex]);

  // 7点以下なら宣言しない
  if (maxCount === null) {
    return pass;
  }

  const latestDeclaration = findLatestDeclaration(declarations);

  // 誰もまだ宣言していない: 15%でパス、それ以外は最低枚数で宣言
  if (latestDeclaration === null) {
    if (random1 < CPU_RANDOM_PASS_RATE) {
      return pass;
    }
    return { playerId, suit: wantedSuit, declaredCardCount: MIN_DECLARED_CARD_COUNT };
  }

  // 最大枚数でも今の最高宣言に勝てないならパス
  const declarationMaximumWanting: Declaration = { playerId, suit: wantedSuit, declaredCardCount: maxCount };
  if (!isStrongerDeclaration(declarationMaximumWanting, latestDeclaration)) {
    return pass;
  }

  // 強くできる場合でも、15%でわざとパスする（様子見）
  if (random1 < CPU_RANDOM_PASS_RATE) {
    return pass;
  }

  // お得パス: 宣言されたスートを自分も6点以上持っていれば、50%でパスして連合軍側に回る
  if (latestDeclaration.suit !== null) {
    const latestSuitScore = suitStrength[SUIT_STRENGTH_ORDER.indexOf(latestDeclaration.suit)];
    if (latestSuitScore >= CPU_OTOKU_PASS_MIN_SCORE && random2 < CPU_OTOKU_PASS_RATE) {
      return pass;
    }
  }

  // 勝てる最低枚数を探す: 最大枚数から1枚ずつ減らして、勝てなくなった1つ上が答え
  let declarationWantingNumber = maxCount;
  while (
    isStrongerDeclaration(
      { playerId, suit: wantedSuit, declaredCardCount: declarationWantingNumber },
      latestDeclaration,
    )
  ) {
    declarationWantingNumber--;
  }

  return { playerId, suit: wantedSuit, declaredCardCount: declarationWantingNumber + 1 };
}