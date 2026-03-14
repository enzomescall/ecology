import type { Game } from '../types/game.js';
import type { CardType } from '../types/card.js';
import * as gameStore from '../data/gameStore.js';

export interface UserAnalytics {
  overview: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalGamesActive: number;
  };
  scoring: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    categoryAverages: Record<string, number>;
    diversityPenaltyAverage: number;
    diversityPenaltyFrequency: Record<number, number>;
  };
  cards: {
    totalCardsPlaced: number;
    cardTypeDistribution: Record<CardType, number>;
    averagePointsPerCard: Record<CardType, number>;
    mostValuableCard: { type: CardType; avgPoints: number };
    rabbitSwapsUsed: number;
    rabbitSwapRate: number;
  };
  ecosystem: {
    averageWidth: number;
    averageHeight: number;
    averageCardCount: number;
    mostCommonShape: string;
  };
  opponents: {
    mostPlayedAgainst: { name: string; games: number } | null;
    winRateVsOpponents: Record<string, { name: string; wins: number; losses: number; winRate: number }>;
  };
}

const CATEGORIES = ['stream', 'meadow', 'wolf', 'fox', 'bear', 'trout', 'dragonfly', 'bee', 'eagle', 'deer'] as const;
const CARD_TYPES: CardType[] = ['stream', 'meadow', 'wolf', 'fox', 'bear', 'trout', 'dragonfly', 'bee', 'eagle', 'deer', 'rabbit'];

export function getUserAnalytics(userId: string): UserAnalytics {
  const allGames = gameStore.getUserGames(userId);
  const finishedGames = allGames.filter(g => g.status === 'finished' && g.scoresByPlayerId);

  if (finishedGames.length === 0) {
    return getEmptyAnalytics();
  }

  // Overview stats
  const playerGames = finishedGames.filter(g =>
    g.players.some(p => p.userId === userId && !p.leftGame)
  );

  let gamesWon = 0;
  let totalScore = 0;
  let highestScore = -Infinity;
  let lowestScore = Infinity;

  // Category tracking
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    categoryTotals[cat] = 0;
    categoryCounts[cat] = 0;
  }

  // Diversity penalty tracking
  let diversityPenaltyTotal = 0;
  const diversityPenaltyFreq: Record<number, number> = { 0: 0, '-2': 0, '-5': 0, '-10': 0 };

  // Card tracking
  const cardTypeCounts: Record<CardType, number> = {} as Record<CardType, number>;
  const cardTypePoints: Record<CardType, number[]> = {} as Record<CardType, number[]>;
  for (const type of CARD_TYPES) {
    cardTypeCounts[type] = 0;
    cardTypePoints[type] = [];
  }

  let totalRabbitsPlaced = 0;
  let totalRabbitsSwapped = 0;

  // Ecosystem stats
  let totalWidth = 0;
  let totalHeight = 0;
  let totalCardsPlaced = 0;

  // Opponent tracking
  const opponentStats: Record<string, { name: string; wins: number; losses: number; games: number }> = {};

  for (const game of playerGames) {
    const scores = game.scoresByPlayerId!;
    const playerScore = scores[userId];
    if (!playerScore) continue;

    totalScore += playerScore.total;
    highestScore = Math.max(highestScore, playerScore.total);
    lowestScore = Math.min(lowestScore, playerScore.total);

    // Check if won
    const sortedPlayers = Object.entries(scores)
      .filter(([pid]) => {
        const player = game.players.find(p => p.userId === pid);
        return player && !player.leftGame;
      })
      .sort(([, a], [, b]) => b.total - a.total);

    if (sortedPlayers[0]?.[0] === userId) {
      gamesWon++;
    }

    // Category averages
    for (const cat of CATEGORIES) {
      const val = playerScore[cat];
      if (val !== undefined) {
        categoryTotals[cat] = (categoryTotals[cat] ?? 0) + val;
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
      }
    }

    // Diversity penalty
    diversityPenaltyTotal += playerScore.diversityPenalty;
    const penaltyKey = playerScore.diversityPenalty.toString();
    if (penaltyKey in diversityPenaltyFreq) {
      (diversityPenaltyFreq as Record<string, number>)[penaltyKey]!++;
    }

    // Ecosystem analysis
    const ecosystem = game.ecosystemsByPlayerId[userId] ?? [];
    totalCardsPlaced += ecosystem.length;

    // Count card types
    for (const placed of ecosystem) {
      const type = placed.card.type;
      cardTypeCounts[type] = (cardTypeCounts[type] ?? 0) + 1;
    }

    // Count rabbits with swaps
    const playerMoves = Object.entries(game.submittedMovesByPlayerId)
      .filter(([pid]) => pid === userId);

    // Since moves are cleared after resolution, we can't track swap usage from submittedMovesByPlayerId
    // Instead, we'll estimate based on ecosystem containing rabbits
    const rabbitCount = ecosystem.filter(p => p.card.type === 'rabbit').length;
    totalRabbitsPlaced += rabbitCount;

    // Bounding box
    if (ecosystem.length > 0) {
      const xs = ecosystem.map(p => p.coord.x);
      const ys = ecosystem.map(p => p.coord.y);
      const width = Math.max(...xs) - Math.min(...xs) + 1;
      const height = Math.max(...ys) - Math.min(...ys) + 1;
      totalWidth += width;
      totalHeight += height;
    }

    // Opponent tracking
    for (const opponent of game.players) {
      if (opponent.userId === userId || opponent.leftGame) continue;
      if (!opponentStats[opponent.userId]) {
        opponentStats[opponent.userId] = { name: opponent.name, wins: 0, losses: 0, games: 0 };
      }
      opponentStats[opponent.userId]!.games++;
      const oppScore = scores[opponent.userId];
      if (oppScore && playerScore.total >= oppScore.total) {
        opponentStats[opponent.userId]!.wins++;
      } else {
        opponentStats[opponent.userId]!.losses++;
      }
    }
  }

  // Compute card type points per game for averages
  // This is an approximation since we don't track per-card scoring directly
  // We distribute the category scores proportionally to card counts
  for (const game of playerGames) {
    const ecosystem = game.ecosystemsByPlayerId[userId] ?? [];
    const scores = game.scoresByPlayerId![userId];
    if (!scores) continue;

    // Distribute category points to cards of that type
    for (const cat of CATEGORIES) {
      const catCards = ecosystem.filter(p => p.card.type === cat);
      if (catCards.length > 0) {
        const pointsPerCard = scores[cat] / catCards.length;
        for (const _ of catCards) {
          cardTypePoints[cat as CardType]?.push(pointsPerCard);
        }
      }
    }
  }

  // Calculate average points per card type
  const avgPointsPerCard: Record<CardType, number> = {} as Record<CardType, number>;
  let mostValuableCard: { type: CardType; avgPoints: number } = { type: 'stream', avgPoints: 0 };

  for (const type of CARD_TYPES) {
    const points = cardTypePoints[type];
    if (points && points.length > 0) {
      const avg = points.reduce((a, b) => a + b, 0) / points.length;
      avgPointsPerCard[type] = Math.round(avg * 100) / 100;
      if (avg > mostValuableCard.avgPoints) {
        mostValuableCard = { type, avgPoints: avg };
      }
    } else {
      avgPointsPerCard[type] = 0;
    }
  }

  // Category averages
  const categoryAverages: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const total = categoryTotals[cat] ?? 0;
    const count = categoryCounts[cat] ?? 0;
    categoryAverages[cat] = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
  }

  // Most played against
  let mostPlayedAgainst: { name: string; games: number } | null = null;
  for (const stats of Object.values(opponentStats)) {
    if (!mostPlayedAgainst || stats.games > mostPlayedAgainst.games) {
      mostPlayedAgainst = { name: stats.name, games: stats.games };
    }
  }

  // Win rate vs opponents
  const winRateVsOpponents: Record<string, { name: string; wins: number; losses: number; winRate: number }> = {};
  for (const [oppId, stats] of Object.entries(opponentStats)) {
    winRateVsOpponents[oppId] = {
      name: stats.name,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
    };
  }

  // Most common ecosystem shape
  const shapeCounts: Record<string, number> = {};
  for (const game of playerGames) {
    const ecosystem = game.ecosystemsByPlayerId[userId] ?? [];
    if (ecosystem.length > 0) {
      const xs = ecosystem.map(p => p.coord.x);
      const ys = ecosystem.map(p => p.coord.y);
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      const shape = `${w}x${h}`;
      shapeCounts[shape] = (shapeCounts[shape] ?? 0) + 1;
    }
  }
  const mostCommonShape = Object.entries(shapeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'N/A';

  const gamesPlayed = playerGames.length;

  return {
    overview: {
      gamesPlayed,
      gamesWon,
      winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
      totalGamesActive: allGames.filter(g => g.status === 'active').length,
    },
    scoring: {
      averageScore: gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0,
      highestScore: highestScore === -Infinity ? 0 : highestScore,
      lowestScore: lowestScore === Infinity ? 0 : lowestScore,
      categoryAverages,
      diversityPenaltyAverage: gamesPlayed > 0 ? Math.round(diversityPenaltyTotal / gamesPlayed * 100) / 100 : 0,
      diversityPenaltyFrequency: diversityPenaltyFreq,
    },
    cards: {
      totalCardsPlaced,
      cardTypeDistribution: cardTypeCounts,
      averagePointsPerCard: avgPointsPerCard,
      mostValuableCard,
      rabbitSwapsUsed: totalRabbitsSwapped,
      rabbitSwapRate: totalRabbitsPlaced > 0 ? Math.round((totalRabbitsSwapped / totalRabbitsPlaced) * 100) : 0,
    },
    ecosystem: {
      averageWidth: gamesPlayed > 0 ? Math.round((totalWidth / gamesPlayed) * 10) / 10 : 0,
      averageHeight: gamesPlayed > 0 ? Math.round((totalHeight / gamesPlayed) * 10) / 10 : 0,
      averageCardCount: gamesPlayed > 0 ? Math.round(totalCardsPlaced / gamesPlayed) : 0,
      mostCommonShape,
    },
    opponents: {
      mostPlayedAgainst,
      winRateVsOpponents,
    },
  };
}

function getEmptyAnalytics(): UserAnalytics {
  const emptyCategories: Record<string, number> = {};
  const emptyCards: Record<CardType, number> = {} as Record<CardType, number>;
  for (const cat of CATEGORIES) {
    emptyCategories[cat] = 0;
  }
  for (const type of CARD_TYPES) {
    emptyCards[type] = 0;
  }

  return {
    overview: {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      totalGamesActive: 0,
    },
    scoring: {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      categoryAverages: emptyCategories,
      diversityPenaltyAverage: 0,
      diversityPenaltyFrequency: { 0: 0, '-2': 0, '-5': 0, '-10': 0 },
    },
    cards: {
      totalCardsPlaced: 0,
      cardTypeDistribution: emptyCards,
      averagePointsPerCard: { ...emptyCards } as Record<CardType, number>,
      mostValuableCard: { type: 'stream', avgPoints: 0 },
      rabbitSwapsUsed: 0,
      rabbitSwapRate: 0,
    },
    ecosystem: {
      averageWidth: 0,
      averageHeight: 0,
      averageCardCount: 0,
      mostCommonShape: 'N/A',
    },
    opponents: {
      mostPlayedAgainst: null,
      winRateVsOpponents: {},
    },
  };
}
