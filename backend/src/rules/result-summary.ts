import type { Card, GameState, PlayerId } from "../types.js";

// FR-42: リザルト画面に出す「ナポレオン軍・連合軍それぞれが獲得した絵札の内訳」を作る。
// 数え方は FR-26（napoleon-army-count.ts）と同じにしてある。画面側で数え直すと食い違うことがあるので、サーバーで作って渡す。
//   - ナポレオン軍 = ナポレオン＋副官（独り立ちならナポレオンだけ）、連合軍 = それ以外
//   - FR-14で公開された捨て札の絵札は、1トリック目の勝者がいる側の得点になる

export interface ArmySummary {
  memberIds: PlayerId[];
  capturedCards: Card[]; // 軍のメンバーがトリックで獲得した絵札
  discardBonusCards: Card[]; // 1トリック目の勝者が軍にいるときだけ入る、ナポレオンの捨て札の絵札
}

export interface ResultSummary {
  napoleonArmy: ArmySummary;
  alliedArmy: ArmySummary;
  hitoridachi: boolean;
}

export function summarizeResult(state: GameState): ResultSummary {
  if (state.napoleonId === null) {
    throw new Error("ナポレオンが決まっていないので内訳を作れません");
  }

  const napoleonIds: PlayerId[] =
    state.fukukanId === null ? [state.napoleonId] : [state.napoleonId, state.fukukanId];
  const alliedIds = state.players.map((player) => player.id).filter((id) => !napoleonIds.includes(id));

  // 1トリック目の勝者がいる側が、捨て札の絵札を受け取る（まだトリックが無ければ、どちらにも入らない）
  const firstTrickWinnerId = state.trickHistory[0]?.winnerId;
  const napoleonGetsBonus = firstTrickWinnerId !== undefined && napoleonIds.includes(firstTrickWinnerId);
  const alliedGetsBonus = firstTrickWinnerId !== undefined && !napoleonGetsBonus;

  const summarize = (ids: PlayerId[], getsBonus: boolean): ArmySummary => ({
    memberIds: ids,
    capturedCards: ids.flatMap((id) => state.capturedCards[id]),
    discardBonusCards: getsBonus ? [...state.discardedCards] : [],
  });

  return {
    napoleonArmy: summarize(napoleonIds, napoleonGetsBonus),
    alliedArmy: summarize(alliedIds, alliedGetsBonus),
    hitoridachi: state.hitoridachi,
  };
}
