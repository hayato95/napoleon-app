import { describe, expect, it } from "vitest";
import type { Card, GameState, Player, PlayerId } from "../types.js";
import { toPlayerView } from "./player-view.js";

const PLAYER_IDS: PlayerId[] = [0, 1, 2, 3, 4];

const HEART_QUEEN: Card = { type: "normal", suit: "heart", rank: "Q" };
const SPADE_A: Card = { type: "normal", suit: "spade", rank: "A" };
const CLUB_3: Card = { type: "normal", suit: "club", rank: 3 };

// 手札はプレイヤーごとに1枚ずつ別のカードを持たせておく（手札が漏れていないか確認しやすくするため）
function createPlayer(id: PlayerId): Player {
  const hand: Card[] = [{ type: "normal", suit: "diamond", rank: (id + 2) as 2 | 3 | 4 | 5 | 6 }];
  return { id, name: `player${id}`, isHuman: id === 0, hand };
}

// ナポレオン=0番、副官指定カード=♡Q、副官=3番（確定済み）の状態が基本
function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "trick",
    players: PLAYER_IDS.map(createPlayer),
    widow: [],
    declarations: [],
    trumpSuit: "spade",
    declaredCount: 12,
    napoleonId: 0,
    fukukanCard: HEART_QUEEN,
    fukukanId: 3,
    hitoridachi: false,
    fukukanRevealed: false,
    currentTrick: null,
    trickHistory: [],
    capturedCards: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    turnOrder: [0, 1, 2, 3, 4],
    ...overrides,
  };
}

// 独り立ちの状態（副官なし）
const hitoridachiState = () => createState({ fukukanId: null, hitoridachi: true });

describe("FR-10: toPlayerView（手札の出し分け）", () => {
  it("自分の手札は中身まで見える", () => {
    const view = toPlayerView(createState(), 1);

    expect(view.myHand).toEqual([{ type: "normal", suit: "diamond", rank: 3 }]);
  });

  it("他人の情報には手札の中身が含まれず、枚数だけ分かる", () => {
    const view = toPlayerView(createState(), 1);

    for (const player of view.players) {
      expect("hand" in player).toBe(false);
      expect(player.handCount).toBe(1);
    }
  });

  it("場札は枚数だけ分かる", () => {
    const view = toPlayerView(createState({ widow: [SPADE_A, CLUB_3, HEART_QUEEN] }), 1);

    expect(view.widowCount).toBe(3);
    expect("widow" in view).toBe(false);
  });

  it("副官指定カードは全員に見える", () => {
    for (const id of PLAYER_IDS) {
      expect(toPlayerView(createState(), id).fukukanCard).toEqual(HEART_QUEEN);
    }
  });
});

describe("FR-10: toPlayerView（副官を本人以外に秘密にする）", () => {
  it("副官本人には、自分が副官だと分かる", () => {
    const view = toPlayerView(createState(), 3);

    expect(view.isFukukan).toBe(true);
    expect(view.fukukanId).toBe(3);
  });

  it("ナポレオンには、誰が副官か分からない", () => {
    const view = toPlayerView(createState(), 0);

    expect(view.isFukukan).toBe(false);
    expect(view.fukukanId).toBeNull();
  });

  it("その他のプレイヤーには、誰が副官か分からない", () => {
    for (const id of [1, 2, 4] as PlayerId[]) {
      const view = toPlayerView(createState(), id);

      expect(view.isFukukan).toBe(false);
      expect(view.fukukanId).toBeNull();
    }
  });

  it("副官が誰であっても（独り立ちでも）、副官以外の人の見え方はまったく同じ", () => {
    // ここが一番大事なテスト。見え方が1か所でも違えば、そこから副官を推測できてしまう。
    // プレイヤー1から見て、「副官=3番」「副官=4番」「独り立ち」の3つの状態が区別できないことを確認する。
    const fukukanIs3 = toPlayerView(createState({ fukukanId: 3 }), 1);
    const fukukanIs4 = toPlayerView(createState({ fukukanId: 4 }), 1);
    const hitoridachi = toPlayerView(hitoridachiState(), 1);

    expect(fukukanIs4).toEqual(fukukanIs3);
    expect(hitoridachi).toEqual(fukukanIs3);
  });

  it("ナポレオンから見ても、副官が3番か4番かは区別できない", () => {
    const fukukanIs3 = toPlayerView(createState({ fukukanId: 3 }), 0);
    const fukukanIs4 = toPlayerView(createState({ fukukanId: 4 }), 0);

    expect(fukukanIs4).toEqual(fukukanIs3);
  });
});

describe("FR-10: toPlayerView（独り立ちの出し分け）", () => {
  it("独り立ちのとき、ナポレオンには独り立ちだと分かる", () => {
    expect(toPlayerView(hitoridachiState(), 0).hitoridachi).toBe(true);
  });

  it("副官がいるとき、ナポレオンには独り立ちではないと分かる", () => {
    expect(toPlayerView(createState(), 0).hitoridachi).toBe(false);
  });

  it("ナポレオン以外には、独り立ちかどうかは分からない（null）", () => {
    for (const id of [1, 2, 3, 4] as PlayerId[]) {
      expect(toPlayerView(hitoridachiState(), id).hitoridachi).toBeNull();
      expect(toPlayerView(createState(), id).hitoridachi).toBeNull();
    }
  });

  it("副官がまだ確定していないときは、ナポレオンにも null", () => {
    const state = createState({ phase: "fukukanNomination", fukukanId: null, hitoridachi: false });

    expect(toPlayerView(state, 0).hitoridachi).toBeNull();
  });
});

describe("FR-10: toPlayerView（FR-12で公開された後）", () => {
  it("公開後は全員に、誰が副官か分かる", () => {
    for (const id of PLAYER_IDS) {
      expect(toPlayerView(createState({ fukukanRevealed: true }), id).fukukanId).toBe(3);
    }
  });

  it("独り立ちが公開された後は、全員に独り立ちだと分かる", () => {
    const state = createState({ fukukanId: null, hitoridachi: true, fukukanRevealed: true });

    for (const id of PLAYER_IDS) {
      expect(toPlayerView(state, id).hitoridachi).toBe(true);
    }
  });
});

describe("toPlayerView（その他）", () => {
  it("存在しないプレイヤーIDならエラー", () => {
    const state = createState({ players: [createPlayer(0)] });

    expect(() => toPlayerView(state, 4)).toThrow();
  });
});
