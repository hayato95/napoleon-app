import type { Card, GameState, PlayerId, Suit } from "./types.js";
import { HUMAN_SEAT, setupDeal } from "./deal.js";
import type { Rng } from "./deal.js";
import { fallbackCpuDiscard } from "./cpu-discard-fallback.js";
import type { PlayerAction, StateUpdate } from "./protocol.js";
import { canPlayCard } from "./rules/card-follow.js";
import { cpuDeclaration } from "./rules/cpu-declaration.js";
import { cpuFukukanNomination } from "./rules/cpu-fukukan-nomination.js";
import { chooseCpuTrickCard } from "./rules/cpu-trick-play.js";
import { submitDeclaration } from "./rules/declaration.js";
import { revealDiscardedFaceCards } from "./rules/discard-review.js";
import { assignFukukan } from "./rules/fukukan-assignment.js";
import { nominateFukukan } from "./rules/fukukan-nomination.js";
import { judgeGameResult } from "./rules/game-result.js";
import { determineNapoleon } from "./rules/napoleon-decision.js";
import { toPlayerView } from "./rules/player-view.js";
import { shouldRedeal } from "./rules/redeal.js";
import { summarizeResult } from "./rules/result-summary.js";
import { playCard } from "./rules/trick-play.js";
import { cardsEqual, playLeadCard } from "./rules/trick-start.js";

// ゲームの進行役（#121）。rules/ の純粋関数を、フェーズの順番どおりにつなぐ。
//   宣言 → 副官指名 → カード交換 → トリック(10回) → 勝敗判定
// ソケットのことは知らない。「今の状態と操作」を受け取って「次の状態」を返すだけにしてあるので、
// サーバーを起動しなくてもテストできる。
//
// 人間(席0)の操作が必要な場面で止まり、それ以外はCPUの手をまとめて処理する。

export interface FlowOptions {
  // ナポレオンCPUが捨てる3枚を選ぶ処理。FR-31（#38）の実装が入るまでは暫定の既定値を使う
  cpuDiscard?: (hand: Card[], trumpSuit: Suit) => Card[];
}

// CPUの手を処理する回数の上限。1局は宣言・指名・交換・50手で終わるので、これを超えたら無限ループとみなす
const MAX_CPU_STEPS = 1000;

/** 今、操作する必要があるプレイヤー。ゲームが終わっていれば null */
export function getActorId(state: GameState): PlayerId | null {
  switch (state.phase) {
    case "declaration":
      return state.turnOrder[0];
    case "fukukanNomination":
    case "cardExchange":
      return requireNapoleonId(state);
    case "trick":
      return getTrickActorId(state);
    case "dealing":
    case "result":
      return null;
  }
}

function requireNapoleonId(state: GameState): PlayerId {
  if (state.napoleonId === null) {
    throw new Error("ナポレオンが決まっていません");
  }
  return state.napoleonId;
}

function getTrickActorId(state: GameState): PlayerId {
  const trick = state.currentTrick;

  // トリックの最初の1枚: 1回目はナポレオン、2回目以降は直前のトリックの勝者がリードする
  if (trick === null) {
    if (state.trickHistory.length === 0) {
      return requireNapoleonId(state);
    }
    const winnerId = state.trickHistory[state.trickHistory.length - 1].winnerId;
    if (winnerId === undefined) {
      throw new Error("直前のトリックの勝者が決まっていません");
    }
    return winnerId;
  }

  // 2枚目以降: 直前に出した人の次の人
  const lastPlayerId = trick.plays[trick.plays.length - 1].playerId;
  const index = state.turnOrder.indexOf(lastPlayerId);
  return state.turnOrder[(index + 1) % state.turnOrder.length];
}

/** 新しいゲームを作り、人間の番が来るまでCPUの手を進める */
export function startGame(rng: Rng, options: FlowOptions = {}): GameState {
  return advanceCpuTurns(setupDeal(rng), rng, options);
}

/** 人間の操作を反映し、次に人間の番が来る（またはゲームが終わる）までCPUの手を進める */
export function handleHumanAction(
  state: GameState,
  action: PlayerAction,
  rng: Rng,
  options: FlowOptions = {},
): GameState {
  const next = applyAction(state, HUMAN_SEAT, action, rng);
  return advanceCpuTurns(next, rng, options);
}

/** クライアントに送る内容を作る。toPlayerView を通すので、見せてはいけない情報は含まれない */
export function buildStateUpdate(state: GameState, viewerId: PlayerId = HUMAN_SEAT): StateUpdate {
  const view = toPlayerView(state, viewerId);
  const actorId = getActorId(state);

  let playableCards: Card[] = [];
  if (state.phase === "trick" && actorId === viewerId) {
    const plays = state.currentTrick?.plays ?? [];
    const leadJokerSuit = state.currentTrick?.leadJokerSuit;
    playableCards = view.myHand.filter((card) => canPlayCard(view.myHand, plays, card, leadJokerSuit));
  }

  return {
    view,
    actorId,
    playableCards,
    result: state.phase === "result" ? judgeGameResult(state) : null,
    resultSummary: state.phase === "result" ? summarizeResult(state) : null,
  };
}

function advanceCpuTurns(state: GameState, rng: Rng, options: FlowOptions): GameState {
  let current = state;

  for (let step = 0; step < MAX_CPU_STEPS; step++) {
    const actorId = getActorId(current);
    if (actorId === null || actorId === HUMAN_SEAT) {
      return current;
    }
    current = cpuAct(current, actorId, rng, options);
  }

  throw new Error("CPUの処理が終わりませんでした");
}

// 1人分の操作を反映する。手番とフェーズが合っているかはここで確かめる（ルール自体の検証は rules/ 側）
function applyAction(state: GameState, playerId: PlayerId, action: PlayerAction, rng: Rng): GameState {
  if (getActorId(state) !== playerId) {
    throw new Error("あなたの番ではありません");
  }

  switch (state.phase) {
    case "declaration":
      if (action.type === "declare") {
        return declare(state, playerId, action.suit, action.count, rng);
      }
      if (action.type === "pass") {
        return declare(state, playerId, null, null, rng);
      }
      break;
    case "fukukanNomination":
      if (action.type === "nominateFukukan") {
        return nominate(state, playerId, action.card);
      }
      break;
    case "cardExchange":
      if (action.type === "discard") {
        return discard(state, playerId, action.cards);
      }
      break;
    case "trick":
      if (action.type === "playCard") {
        return playTrickCard(state, playerId, action.card, action.leadJokerSuit);
      }
      break;
  }

  throw new Error("今はその操作はできません");
}

function cpuAct(state: GameState, actorId: PlayerId, rng: Rng, options: FlowOptions): GameState {
  const view = toPlayerView(state, actorId);

  switch (state.phase) {
    case "declaration": {
      const declaration = cpuDeclaration(view.myHand, actorId, view.declarations, rng(), rng());
      return declare(state, actorId, declaration.suit, declaration.declaredCardCount, rng);
    }
    case "fukukanNomination": {
      const card = cpuFukukanNomination(view.myHand, requireTrumpSuit(state), rng(), rng());
      return nominate(state, actorId, card);
    }
    case "cardExchange": {
      const cpuDiscard = options.cpuDiscard ?? fallbackCpuDiscard;
      return discard(state, actorId, cpuDiscard(view.myHand, requireTrumpSuit(state)));
    }
    case "trick": {
      const choice = chooseCpuTrickCard(view, rng());
      return playTrickCard(state, actorId, choice.card, choice.leadJokerSuit);
    }
    default:
      throw new Error("CPUが操作できないフェーズです");
  }
}

function requireTrumpSuit(state: GameState): Suit {
  if (state.trumpSuit === null) {
    throw new Error("切り札が決まっていません");
  }
  return state.trumpSuit;
}

// 宣言（またはパス）を記録し、全員パスなら配り直し、せりが終わっていればナポレオンを確定する
function declare(state: GameState, playerId: PlayerId, suit: Suit | null, count: number | null, rng: Rng): GameState {
  const next = submitDeclaration(state, playerId, suit, count);

  // FR-05: 最初の一周が全員パスなら、配り直してせりをやり直す
  if (shouldRedeal(next.declarations)) {
    return setupDeal(rng);
  }

  const decided = determineNapoleon(next.declarations);
  if (decided === null) {
    return next;
  }

  return {
    ...next,
    phase: "fukukanNomination",
    napoleonId: decided.napoleonId,
    trumpSuit: decided.trumpSuit,
    declaredCount: decided.declaredCardCount,
  };
}

// 副官指定カードを決め、誰が副官か（独り立ちか）を確定して、場札3枚をナポレオンの手札に加える
function nominate(state: GameState, playerId: PlayerId, card: Card): GameState {
  const assigned = assignFukukan(nominateFukukan(state, playerId, card));

  return {
    ...assigned,
    phase: "cardExchange",
    widow: [],
    players: assigned.players.map((player) =>
      player.id === playerId ? { ...player, hand: [...player.hand, ...assigned.widow] } : player,
    ),
  };
}

// ナポレオンが3枚を捨て、捨てた絵札を公開して、トリックを始める
function discard(state: GameState, playerId: PlayerId, cards: Card[]): GameState {
  const hand = [...state.players[playerId].hand];

  for (const card of cards) {
    const index = hand.findIndex((handCard) => cardsEqual(handCard, card));
    if (index === -1) {
      throw new Error("手札にないカードは捨てられません");
    }
    hand.splice(index, 1);
  }

  const withNewHand: GameState = {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? { ...player, hand } : player)),
  };

  return { ...revealDiscardedFaceCards(withNewHand, cards), phase: "trick" };
}

// リード（トリックの最初の1枚）かフォローかで呼ぶ関数が違う
function playTrickCard(state: GameState, playerId: PlayerId, card: Card, leadJokerSuit?: Suit): GameState {
  if (state.currentTrick === null) {
    return playLeadCard(state, playerId, card, leadJokerSuit);
  }
  if (leadJokerSuit !== undefined) {
    throw new Error("台札のスートを指定できるのはリードのときだけです");
  }
  return playCard(state, playerId, card);
}
