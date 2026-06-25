"""Arena: measure a net-guided ISMCTS agent against the greedy baseline."""
from __future__ import annotations

import random
from typing import Optional

from ecology_env.game import Game
from baselines import GreedyAgent
from .evaluators import NetEvaluator
from .ismcts import ISMCTSAgent


def eval_vs_greedy(net, num_players: int = 3, games: int = 20, n_sims: int = 32,
                   device: str = "cpu", seed: int = 0):
    """Seat 0 = net-MCTS, the rest greedy. Returns (win_rate, avg_net, avg_greedy)."""
    ev = NetEvaluator(net, device=device)
    wins = 0.0
    net_score = 0.0
    greedy_score = 0.0
    for gi in range(games):
        s = seed + gi
        rng = random.Random(s)
        agents = [ISMCTSAgent(ev, n_sims=n_sims, temperature=0.0,
                              opponent_agent=GreedyAgent(rng=random.Random(s + 1)),
                              rng=random.Random(s))]
        for k in range(1, num_players):
            agents.append(GreedyAgent(rng=random.Random(s * 17 + k)))
        g = Game.new(num_players, rng)
        while not g.is_terminal():
            moves = {seat: agents[seat].select_move(g, seat) for seat in g.player_order}
            g.resolve_turn(moves)
        totals, ranks = g.totals(), g.ranks()
        if ranks[0] == 1:
            wins += 1.0 / sum(1 for r in ranks.values() if r == 1)  # share ties
        net_score += totals[0]
        greedy_score += sum(totals[k] for k in range(1, num_players)) / (num_players - 1)
    return wins / games, net_score / games, greedy_score / games
