import { describe, expect, it } from "vitest";
import type { Card, GameState, Rank, Suit } from "./types.js";
import { HUMAN_SEAT, setupDeal } from "./deal.js";
import { fallbackCpuDiscard } from "./cpu-discard-fallback.js";
import { parsePlayerAction } from "./protocol.js";
import type { PlayerAction } from "./protocol.js";
import { buildStateUpdate, getActorId, handleHumanAction, startGame } from "./game-flow.js";
import { cpuDeclaration } from "./rules/cpu-declaration.js";
import { cpuFukukanNomination } from "./rules/cpu-fukukan-nomination.js";
import { chooseCpuTrickCard } from "./rules/cpu-trick-play.js";
import { toPlayerView } from "./rules/player-view.js";
import { cardsEqual } from "./rules/trick-start.js";
import { seededRng } from "./test-helpers.js";

const c = (suit: Suit, rank: Rank): Card => ({ type: "normal", suit, rank });

// 人間の席にもCPUと同じ判断をさせて、人間の操作の経路(handleHumanAction)も通すためのテスト用の操作者
function humanAutoPlayer(state: GameState, rng: () => number): PlayerAction {
  const view = toPlayerView(state, HUMAN_SEAT);

  switch (state.phase) {
    case "declaration": {
      const declaration = cpuDeclaration(view.myHand, HUMAN_SEAT, view.declarations, rng(), rng());
      return declaration.suit === null || declaration.declaredCardCount === null
        ? { type: "pass" }
        : { type: "declare", suit: declaration.suit, count: declaration.declaredCardCount };
    }
    case "fukukanNomination":
      return {
        type: "nominateFukukan",
        card: cpuFukukanNomination(view.myHand, state.trumpSuit!, rng(), rng()),
      };
    case "cardExchange":
      return { type: "discard", cards: fallbackCpuDiscard(view.myHand, state.trumpSuit!) };
    case "trick": {
      const choice = chooseCpuTrickCard(view, rng());
      return { type: "playCard", card: choice.card, leadJokerSuit: choice.leadJokerSuit };
    }
    default:
      throw new Error("操作するフェーズではありません");
  }
}

// 1局を最後まで進める。無限ループ防止のため、人間の操作は多めの上限を置く
function playToEnd(seed: number): GameState {
  const rng = seededRng(seed);
  let state = startGame(rng);

  for (let i = 0; i < 200 && state.phase !== "result"; i++) {
    expect(getActorId(state)).toBe(HUMAN_SEAT);
    state = handleHumanAction(state, humanAutoPlayer(state, rng), rng);
  }
  return state;
}

describe("game-flow: ゲーム開始", () => {
  it("開始すると、人間の番か宣言フェーズの途中で止まる（CPUの手は処理済み）", () => {
    const state = startGame(seededRng(1));
    expect(state.phase).toBe("declaration");
    expect(getActorId(state)).toBe(HUMAN_SEAT);
  });

  it("人間以外の番では操作できない", () => {
    const rng = seededRng(1);
    const state = setupDeal(rng);
    const outOfTurn: GameState = { ...state, turnOrder: [1, 2, 3, 4, 0] };
    expect(() => handleHumanAction(outOfTurn, { type: "pass" }, rng)).toThrow("あなたの番ではありません");
  });

  it("対局の途中で startGame を送っても、対局は作り直されない", () => {
    const rng = seededRng(1);
    const state = startGame(rng);
    expect(() => handleHumanAction(state, { type: "startGame" }, rng)).toThrow("今はその操作はできません");
  });

  it("フェーズに合わない操作は拒否する", () => {
    const rng = seededRng(1);
    const state = startGame(rng);
    expect(() =>
      handleHumanAction(state, { type: "playCard", card: { type: "joker" } }, rng),
    ).toThrow("今はその操作はできません");
  });

  it("直前より弱い宣言は拒否する（ルール側の検証がそのまま効く）", () => {
    const rng = seededRng(1);
    const state = setupDeal(rng);
    const declared: GameState = {
      ...state,
      declarations: [{ playerId: 4, suit: "spade", declaredCardCount: 15 }],
      turnOrder: [0, 1, 2, 3, 4],
    };
    expect(() =>
      handleHumanAction(declared, { type: "declare", suit: "club", count: 12 }, rng),
    ).toThrow();
  });
});

describe("game-flow: 配り直し(FR-05)", () => {
  it("最初の一周が全員パスなら、配り直してせりをやり直す", () => {
    const rng = seededRng(3);
    const state = setupDeal(rng);
    // 席1〜4がパスしたあと、最後に人間(席0)がパスする状況を作る
    const fourPassed: GameState = {
      ...state,
      declarations: [1, 2, 3, 4].map((id) => ({ playerId: id as 1 | 2 | 3 | 4, suit: null, declaredCardCount: null })),
      turnOrder: [0, 1, 2, 3, 4],
    };

    const next = handleHumanAction(fourPassed, { type: "pass" }, rng);

    expect(next.phase).toBe("declaration");
    // 配り直しなので、記録は空に戻る（その後にCPUが宣言し始めても、最初の一周より前の記録は残らない）
    expect(next.declarations.length).toBeLessThan(5);
    expect(next.players[HUMAN_SEAT].hand).not.toEqual(state.players[HUMAN_SEAT].hand);
  });
});

describe("game-flow: 1局を最後まで通す", () => {
  const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

  it("どのシードでも、10トリック終了後に勝敗判定フェーズで止まる", () => {
    for (const seed of SEEDS) {
      const state = playToEnd(seed);
      expect(state.phase, `seed=${seed}`).toBe("result");
      expect(state.trickHistory, `seed=${seed}`).toHaveLength(10);
      for (const trick of state.trickHistory) {
        expect(trick.plays).toHaveLength(5);
        expect(trick.winnerId).toBeDefined();
      }
      expect(getActorId(state)).toBeNull();
    }
  });

  it("全員の手札が空になり、全53枚のカードがちょうど1回ずつ使われる", () => {
    for (const seed of SEEDS) {
      const state = playToEnd(seed);
      for (const player of state.players) {
        expect(player.hand, `seed=${seed}`).toHaveLength(0);
      }
      const played = state.trickHistory.flatMap((trick) => trick.plays.map((play) => play.card));
      expect(played, `seed=${seed}`).toHaveLength(50);
      for (let i = 0; i < played.length; i++) {
        for (let j = i + 1; j < played.length; j++) {
          expect(cardsEqual(played[i], played[j]), `seed=${seed}`).toBe(false);
        }
      }
    }
  });

  it("絵札20枚は、全員の獲得分と公開された捨て札に、重複も漏れもなく分かれる", () => {
    for (const seed of SEEDS) {
      const state = playToEnd(seed);
      const captured = Object.values(state.capturedCards).reduce((sum, cards) => sum + cards.length, 0);
      expect(captured + state.discardedCards.length, `seed=${seed}`).toBe(20);
    }
  });

  it("獲得絵札の内訳は、ナポレオン軍と連合軍で20枚に過不足なく分かれ、ナポレオン軍の枚数が勝敗判定と一致する", () => {
    for (const seed of SEEDS) {
      const update = buildStateUpdate(playToEnd(seed));
      const summary = update.resultSummary;
      expect(summary, `seed=${seed}`).not.toBeNull();
      const army = (side: NonNullable<typeof summary>["napoleonArmy"]) =>
        side.capturedCards.length + side.discardBonusCards.length;

      expect(army(summary!.napoleonArmy), `seed=${seed}`).toBe(update.result!.napoleonArmyCount);
      expect(army(summary!.napoleonArmy) + army(summary!.alliedArmy), `seed=${seed}`).toBe(20);
      expect(summary!.napoleonArmy.memberIds.length + summary!.alliedArmy.memberIds.length, `seed=${seed}`).toBe(5);
    }
  });

  it("対局が終わると、副官も全員から分かる", () => {
    for (const seed of SEEDS) {
      const state = playToEnd(seed);
      const view = buildStateUpdate(state).view;
      expect(view.fukukanId, `seed=${seed}`).toBe(state.fukukanId);
      expect(view.hitoridachi, `seed=${seed}`).toBe(state.hitoridachi);
    }
  });

  it("結果は勝敗判定フェーズのときだけ stateUpdate に入る", () => {
    const rng = seededRng(5);
    const midGame = startGame(rng);
    expect(buildStateUpdate(midGame).result).toBeNull();
    expect(buildStateUpdate(midGame).resultSummary).toBeNull();

    const finished = playToEnd(5);
    const update = buildStateUpdate(finished);
    expect(update.result).not.toBeNull();
    expect(update.result?.declaredCount).toBe(finished.declaredCount);
    expect(update.actorId).toBeNull();
  });
});

describe("game-flow: stateUpdate", () => {
  it("他のプレイヤーの手札の中身は含まれず、枚数だけが入る", () => {
    const state = startGame(seededRng(2));
    const update = buildStateUpdate(state);
    const json = JSON.stringify(update);

    expect(update.view.myHand).toEqual(state.players[HUMAN_SEAT].hand);
    for (const other of state.players.filter((player) => player.id !== HUMAN_SEAT)) {
      expect(update.view.players[other.id].handCount).toBe(other.hand.length);
    }
    // 副官はまだ決まっていないが、決まったあとも本人以外には出ない（toPlayerViewの責務）。ここでは手札が漏れないことを確かめる
    expect(json).not.toContain('"hand"');
  });

  it("トリック中の自分の番では、出せるカードだけが playableCards に入る", () => {
    const rng = seededRng(11);
    let state = startGame(rng);
    for (let i = 0; i < 200 && state.phase !== "trick"; i++) {
      state = handleHumanAction(state, humanAutoPlayer(state, rng), rng);
    }
    expect(state.phase).toBe("trick");

    const update = buildStateUpdate(state);
    expect(update.actorId).toBe(HUMAN_SEAT);
    expect(update.playableCards.length).toBeGreaterThan(0);
    for (const card of update.playableCards) {
      expect(update.view.myHand.some((handCard) => cardsEqual(handCard, card))).toBe(true);
    }
  });

  it("トリック以外のフェーズでは playableCards は空", () => {
    expect(buildStateUpdate(startGame(seededRng(2))).playableCards).toEqual([]);
  });
});

describe("cpu-discard-fallback: 暫定のCPUの捨て札選び", () => {
  it("役札・絵札・切り札以外の弱い数字から捨てる", () => {
    const hand = [c("heart", 2), c("heart", 3), c("diamond", 9), c("spade", 4), c("spade", "K"), c("club", "A")];
    // 切り札は♠。♠4は切り札の数字、♠Kは絵札なので後回し → ♥2・♥3・♦9
    expect(fallbackCpuDiscard(hand, "spade")).toEqual([c("heart", 2), c("heart", 3), c("diamond", 9)]);
  });

  it("足りなければ切り札の弱い数字、それでも足りなければ絵札を捨てる", () => {
    const hand = [c("heart", 2), c("spade", 3), c("spade", 5), c("club", "A"), { type: "joker" } as Card];
    expect(fallbackCpuDiscard(hand, "spade")).toEqual([c("heart", 2), c("spade", 3), c("spade", 5)]);

    const strong = [c("spade", 3), c("club", "K"), c("club", "A"), { type: "joker" } as Card];
    expect(fallbackCpuDiscard(strong, "spade")).toEqual([c("spade", 3), c("club", "K"), c("club", "A")]);
  });

  it("ジョーカーとオールマイティは最後まで捨てない", () => {
    const hand = [
      c("spade", "A"),
      { type: "joker" } as Card,
      c("club", "K"),
      c("heart", "Q"),
      c("heart", "J"),
      c("club", 10),
    ];
    expect(fallbackCpuDiscard(hand, "diamond")).not.toContainEqual({ type: "joker" });
    expect(fallbackCpuDiscard(hand, "diamond")).not.toContainEqual(c("spade", "A"));
  });
});

describe("protocol: parsePlayerAction", () => {
  it("正しい操作はそのまま変換される", () => {
    expect(parsePlayerAction({ type: "startGame" })).toEqual({ type: "startGame" });
    expect(parsePlayerAction({ type: "pass" })).toEqual({ type: "pass" });
    expect(parsePlayerAction({ type: "declare", suit: "heart", count: 13 })).toEqual({
      type: "declare",
      suit: "heart",
      count: 13,
    });
    expect(parsePlayerAction({ type: "nominateFukukan", card: { type: "joker" } })).toEqual({
      type: "nominateFukukan",
      card: { type: "joker" },
    });
    expect(
      parsePlayerAction({ type: "playCard", card: { type: "normal", suit: "club", rank: "J" }, leadJokerSuit: null }),
    ).toEqual({ type: "playCard", card: { type: "normal", suit: "club", rank: "J" } });
  });

  it("形が正しくないものは拒否する", () => {
    const invalid: unknown[] = [
      null,
      "pass",
      [],
      {},
      { type: "unknown" },
      { type: "declare", suit: "star", count: 13 },
      { type: "declare", suit: "heart", count: 13.5 },
      { type: "declare", suit: "heart", count: "13" },
      { type: "nominateFukukan", card: { type: "normal", suit: "heart", rank: 1 } },
      { type: "nominateFukukan", card: { type: "normal", suit: "heart" } },
      { type: "discard", cards: [{ type: "joker" }] },
      { type: "discard", cards: "abc" },
      { type: "playCard", card: { type: "king" } },
      { type: "playCard", card: { type: "joker" }, leadJokerSuit: "moon" },
    ];
    for (const raw of invalid) {
      expect(() => parsePlayerAction(raw), JSON.stringify(raw)).toThrow();
    }
  });
});
