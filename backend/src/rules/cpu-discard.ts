import type { Card, Rank, Suit } from "../types.js";
import { isMighty, isYoromekiQueen } from "./yoromeki.js";

// FR-31のスコープ: ナポレオンになったCPUが、カード交換で捨てる3枚を選んで返す。
// 実際に手札から抜く・捨て札を公開する(revealDiscardedFaceCards, FR-14)のは呼び出し側の仕事。
// この関数は「どの3枚を捨てるか」を返すだけで、受け取った hand は書き換えない（並べ替えも削除もコピーの上でやる）。
// 呼ぶ時点で、場札3枚はもう手札に入っている（giveWidowToNapoleon のあと）ので、手札は13枚。
//
// issue #38 から変えたところ（PRで確認したい）:
//   - 「積極モード」を追加した。1回目のトリックは必ずナポレオンがリードする（trick-start.ts）ので、
//     1回目のトリックで勝てそうなカード（勝ち札）を持っていれば、切り札でない10・J・Qを先に捨てる。
//     捨てた絵札は1回目のトリックの勝者のものになる（FR-14）ので、自分で勝てば
//     「後で取られるかもしれない点」が「確定した点」になる。
//   - 勝ち札があっても、40%で積極モードをやめてissue通りの捨て方にする（揺らぎ）
//   - 積極モードで、副官指定カードがマイティなら♥Q（よろめき）を必ず捨てる（♥が切り札でも、独り立ちでも）。
//     公開されるので、副官は♥Qを気にせずマイティを出せる。独り立ちのときは連合軍へのブラフにもなる
//   - 通常モードでも、切り札でない絵札を切り札の数字より先に捨てる（issueは切り札の数字が先）
//   - 切り札でない2（セイム2用）と♠3（ジョーカー請求用）は、切り札でない3〜9より後に回す
//
// 勝ち札は、20万回のランダム配札で「1回目のトリックで相手に上から取られうる確率」が約20%以下のもの:
//   ジョーカー(4.0%) / マイティ(5.5%) / 正J・切り札が♠以外(9.5%) / 裏J・♠のJ以外(12.5%) /
//   切り札でないA・裏Jのスートは除く(20.7%)
// （相手は取れるなら必ず取る・副官も敵として数える、という悲観的な仮定での値）
//
// 実際に1回目のトリックで勝ち札を出すかどうかは FR-32（トリック中のカード選択）次第。
// 今のFR-32は1回目のトリックを特別扱いしていないので、PRで共有する。

// 勝ち札があっても、積極モードをやめてissue通りの捨て方にする確率
export const CPU_DISCARD_CAUTIOUS_RATE = 0.4;

// 捨てる枚数
const DISCARD_COUNT = 3;

// 切り札と同じ色のもう一方のスート（裏ジャックの判定に使う）。
// card-strength.ts にも同じ表があるが export されていないので、ここに持っている。
const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: "club",
  club: "spade",
  diamond: "heart",
  heart: "diamond",
};

// 切り札でないカードで同じ数字が複数あり、手札でのスートの枚数も同じときに先に捨てる順。
// （チームでまだ決めていない。仮の順番）
const SUIT_TIE_ORDER: Suit[] = ["club", "heart", "diamond", "spade"];

// 切り札でないカードを捨てる順（前ほど先に捨てる）。
// "spade3" は切り札でない♠3、"heartQ" は切り札でない♥Q。数字の 3 には♠3は入らない（♠4〜♠9は普通の数字）。
// 切り札でないAは、♠A（マイティ）を除いたもの（マイティは先に別扱いになる）。
type NonTrumpSlot = Rank | "spade3" | "heartQ";

// 通常モード: 数字(3〜9) → ♠3 → 2 → 10 → J → Q → K → ♥Q → A
const NORMAL_NON_TRUMP_ORDER: NonTrumpSlot[] = [3, 4, 5, 6, 7, 8, 9, "spade3", 2, 10, "J", "Q", "K", "heartQ", "A"];
// 積極モード: 10 → J → Q → 数字(3〜9) → ♠3 → 2 → K → ♥Q → A
const AGGRESSIVE_NON_TRUMP_ORDER: NonTrumpSlot[] = [10, "J", "Q", 3, 4, 5, 6, 7, 8, 9, "spade3", 2, "K", "heartQ", "A"];

// 切り札（役札を除く）を捨てる順。両モード共通。
// 切り札のJは正ジャック、切り札が♠なら切り札のAはマイティなので、ここには出てこない。
const TRUMP_ORDER: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "Q", "K", "A"];
// 切り札が♠のとき: ♠3はジョーカー請求に使うので、QとKの間まで残す
const SPADE_TRUMP_ORDER: Rank[] = [2, 4, 5, 6, 7, 8, 9, 10, "Q", 3, "K"];

// 区切りの番号（小さいほど先に捨てる）。区切りの中の順番は上の表で決める
// 切り札でない → 切り札（役なし） → 裏J → 正J → ジョーカー → マイティ
const ZONE_NON_TRUMP = 0;
const ZONE_TRUMP = 100;
const ZONE_BACK_JACK = 200;
const ZONE_CORRECT_JACK = 201;
const ZONE_JOKER = 202;
const ZONE_MIGHTY = 203;

/**
 * 1回目のトリックの勝ち札かどうか（リードしたときに上から取られにくいカード）。
 * FR-32 で「1回目のトリックにナポレオンCPUが何を出すか」を決めるときにも使える。
 * @param card 調べるカード
 * @param trumpSuit 確定した切り札
 */
export function isFirstTrickWinner(card: Card, trumpSuit: Suit): boolean {
  // ジョーカー: ♠以外のスートを台札に指定してリードする前提（♠を指定すると♠Aを出されうる）
  if (card.type === "joker") {
    return true;
  }
  if (isMighty(card)) {
    return true;
  }
  const backJackSuit = SAME_COLOR_SUIT[trumpSuit];
  if (card.rank === "J") {
    // 正J・裏Jでも、♠のJだと♠を持っている人に♠A（マイティ）を出されうるので外す
    const isRoleJack = card.suit === trumpSuit || card.suit === backJackSuit;
    return isRoleJack && card.suit !== "spade";
  }
  if (card.rank === "A") {
    // 切り札でないA。裏Jと同じスートのAは、裏Jを持っている人がマストフォローのまま上から取れるので外す
    return card.suit !== trumpSuit && card.suit !== backJackSuit;
  }
  return false;
}

/**
 * FR-31: ナポレオンになったCPUが、カード交換で捨てる3枚を選ぶ。
 * @param hand ナポレオン（CPU）の手札。場札3枚を受け取ったあとの13枚。書き換えない
 * @param trumpSuit 確定した切り札
 * @param fukukanCard 副官指定カード（GameState.fukukanCard をそのまま渡せるよう null も受け取る）
 * @param random1 積極モードをやめるかどうかに使う 0以上1未満 の乱数。本番では Math.random() を渡す
 * @returns 捨てる3枚（先に捨てると決めた順）
 */
export function cpuDiscardCards(hand: Card[], trumpSuit: Suit, fukukanCard: Card | null, random1: number): Card[] {
  if (hand.length !== 10 + DISCARD_COUNT) {
    throw new Error("場札を受け取ったあとの13枚の手札で呼んでください");
  }

  const hasWinner = hand.some((card) => isFirstTrickWinner(card, trumpSuit));
  const isAggressive = hasWinner && random1 >= CPU_DISCARD_CAUTIOUS_RATE;

  // 受け取った hand は書き換えず、コピーから選んで抜いていく
  const handCopy = [...hand];
  const garbageCards: Card[] = [];

  // 積極モードで副官指定カードがマイティなら、♥Qを最初に捨てる（♥が切り札でも、独り立ちでも）
  if (isAggressive && fukukanCard !== null && isMighty(fukukanCard)) {
    const heartQueenIndex = handCopy.findIndex((card) => isYoromekiQueen(card));
    if (heartQueenIndex !== -1) {
      garbageCards.push(handCopy[heartQueenIndex]);
      handCopy.splice(heartQueenIndex, 1);
    }
  }

  // スートの枚数は、最初の13枚で1回だけ数える
  const suitCount = countSuits(hand);
  const nonTrumpOrder = isAggressive ? AGGRESSIVE_NON_TRUMP_ORDER : NORMAL_NON_TRUMP_ORDER;

  // 捨てる順に並べて、前から足りない枚数ぶん（handCopy はこの関数の中だけのコピーなので並べ替えてよい）
  handCopy.sort((a, b) => compareDiscardOrder(a, b, trumpSuit, nonTrumpOrder, suitCount));
  garbageCards.push(...handCopy.slice(0, DISCARD_COUNT - garbageCards.length));

  return garbageCards;
}

// --- ここから下は、捨てる順を決めるための小さな道具 ---

function countSuits(hand: Card[]): Record<Suit, number> {
  const count: Record<Suit, number> = { spade: 0, diamond: 0, heart: 0, club: 0 };
  for (const card of hand) {
    if (card.type === "normal") {
      count[card.suit]++;
    }
  }
  return count;
}

// 捨てる順の番号（小さいほど先に捨てる）
function discardPosition(card: Card, trumpSuit: Suit, nonTrumpOrder: NonTrumpSlot[]): number {
  if (card.type === "joker") {
    return ZONE_JOKER;
  }
  if (isMighty(card)) {
    return ZONE_MIGHTY;
  }
  if (card.rank === "J" && card.suit === trumpSuit) {
    return ZONE_CORRECT_JACK;
  }
  if (card.rank === "J" && card.suit === SAME_COLOR_SUIT[trumpSuit]) {
    return ZONE_BACK_JACK;
  }

  if (card.suit === trumpSuit) {
    const order = trumpSuit === "spade" ? SPADE_TRUMP_ORDER : TRUMP_ORDER;
    return ZONE_TRUMP + order.indexOf(card.rank);
  }

  // 切り札でないカード
  let slot: NonTrumpSlot = card.rank;
  if (card.suit === "spade" && card.rank === 3) {
    slot = "spade3";
  } else if (isYoromekiQueen(card)) {
    slot = "heartQ";
  }
  return ZONE_NON_TRUMP + nonTrumpOrder.indexOf(slot);
}

// a を b より先に捨てるなら負の数（Array.sort にそのまま使える形）
function compareDiscardOrder(
  a: Card,
  b: Card,
  trumpSuit: Suit,
  nonTrumpOrder: NonTrumpSlot[],
  suitCount: Record<Suit, number>,
): number {
  const positionDiff = discardPosition(a, trumpSuit, nonTrumpOrder) - discardPosition(b, trumpSuit, nonTrumpOrder);
  if (positionDiff !== 0) {
    return positionDiff;
  }
  // 同じ位置になるのは、切り札でない同じ数字のカードだけ（スートが違う）
  if (a.type !== "normal" || b.type !== "normal") {
    return 0;
  }
  // 手札での枚数が少ないスートから捨てる
  const countDiff = suitCount[a.suit] - suitCount[b.suit];
  if (countDiff !== 0) {
    return countDiff;
  }
  return SUIT_TIE_ORDER.indexOf(a.suit) - SUIT_TIE_ORDER.indexOf(b.suit);
}