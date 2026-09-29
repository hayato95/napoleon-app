import { determineTrickWinner } from "./trick-winner.js";
import type { Card, GameState, PlayerId } from "../types.js";
import { cardsEqual } from "./trick-start.js";
import { canPlayCard } from "./card-follow.js";

function getNextPlayerId(
  state: GameState,
  currentPlayerId: PlayerId,
): PlayerId {
  const currentIndex = state.turnOrder.indexOf(currentPlayerId);

  if (currentIndex === -1) {
    throw new Error("プレイヤーがターン順に存在しません");
  }

  const nextIndex = (currentIndex + 1) % state.turnOrder.length;
  return state.turnOrder[nextIndex];
}

export function playCard(
  state: GameState,
  playerId: PlayerId,
  card: Card,
): GameState {
  if (state.phase !== "trick") {
    throw new Error("トリックフェーズ以外ではカードを出せません");
  }

  if (state.currentTrick === null) {
    throw new Error("現在進行中のトリックがありません");
  }

  const plays = state.currentTrick.plays;

  if (plays.length >= 5) {
    throw new Error("このトリックにはすでに5枚のカードがあります");
  }

  const lastPlayer = plays[plays.length - 1].playerId;
  const expectedPlayerId = getNextPlayerId(state, lastPlayer);

  if (playerId !== expectedPlayerId) {
    throw new Error("このプレイヤーの番ではありません");
  }

  const player = state.players[playerId];

  if (!player.hand.some((handCard) => cardsEqual(handCard, card))) {
    throw new Error("手札に無いカードは出せません");
  }

  const leadJokerSuit = state.currentTrick.leadJokerSuit;

  if (!canPlayCard(player.hand, plays, card, leadJokerSuit)) {
    throw new Error("このカードは出せません");
  }

  const newPlays = [
    ...plays,
    {
      playerId,
      card,
    },
  ];

  if (newPlays.length === 5) {
    const completedTrick = {
      ...state.currentTrick,
      plays: newPlays,
    };

    const winnerId = determineTrickWinner(state, completedTrick);

    const completedTrickWithWinner = {
      ...completedTrick,
      winnerId,
    };

    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              hand: p.hand.filter(
                (handCard) => !cardsEqual(handCard, card),
              ),
            }
          : p,
      ),
      currentTrick: null,
      trickHistory: [
        ...state.trickHistory,
        completedTrickWithWinner,
      ],
    };
  }

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId
        ? {
            ...p,
            hand: p.hand.filter(
              (handCard) => !cardsEqual(handCard, card),
            ),
          }
        : p,
    ),
    currentTrick: {
      ...state.currentTrick,
      plays: newPlays,
    },
  };
}