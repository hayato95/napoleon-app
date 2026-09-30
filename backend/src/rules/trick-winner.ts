import type { GameState, PlayerId, Suit, Trick } from "../types.js";
import { getCardStrength } from "./card-strength.js";
import { getYoromekiWinner } from "./yoromeki.js";
import { checkSame2 } from "./same2.js";



export function determineTrickWinner(
  state: GameState,
  trick: Trick,
): PlayerId {
  if (trick.plays.length !== 5) {
    throw new Error("5枚そろっていないトリックの勝者は決められません");
  }

  // よろめきが成立した場合は、ハートQを出したプレイヤーが勝者
  const yoromekiWinner = getYoromekiWinner(trick.plays);
  if (yoromekiWinner !== null) {
    return yoromekiWinner;
  }

  const same2Winner = checkSame2(
  trick.plays,
  state.trickHistory.length === 0,
);



  const firstCard = trick.plays[0].card;

  // 通常カードがリードなら、そのスートが台札。
  // ジョーカーがリードなら、leadJokerSuitを台札として扱う。
  const leadSuit: Suit =
    firstCard.type === "normal"
      ? firstCard.suit
      : trick.leadJokerSuit!;

  if (state.trumpSuit === null) {
    throw new Error("切り札が決まっていません");
  }

    let winner = trick.plays[0];
  let winnerStrength =
    same2Winner === winner.playerId
      ? { tier: 6, numberStrength: 0 }
      : getCardStrength(winner.card, {
          trumpSuit: state.trumpSuit,
          leadSuit,
        });

  for (const play of trick.plays.slice(1)) {
        const strength =
      same2Winner === play.playerId
        ? { tier: 6, numberStrength: 0 }
        : getCardStrength(play.card, {
            trumpSuit: state.trumpSuit,
            leadSuit,
          });

    if (
      strength.tier < winnerStrength.tier ||
      (strength.tier === winnerStrength.tier &&
        strength.numberStrength > winnerStrength.numberStrength)
    ) {
      winner = play;
      winnerStrength = strength;
    }
  }

  return winner.playerId;
}