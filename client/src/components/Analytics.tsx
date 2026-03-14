import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { User } from '../App';
import { getUserAnalytics } from '../services/gameApi';
import type { UserAnalytics, CardType } from '../services/gameApi';

interface AnalyticsProps {
  user: User;
  onBack: () => void;
}

const CARD_TYPES: CardType[] = ['stream', 'meadow', 'wolf', 'fox', 'bear', 'trout', 'dragonfly', 'bee', 'eagle', 'deer', 'rabbit'];
const CATEGORY_LABELS: Record<string, string> = {
  stream: 'Stream', meadow: 'Meadow', wolf: 'Wolf', fox: 'Fox', bear: 'Bear',
  trout: 'Trout', dragonfly: 'Dragonfly', bee: 'Bee', eagle: 'Eagle', deer: 'Deer',
};

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.375rem 0', fontSize: '0.875rem', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9375rem' }}>{title}</h3>
      {children}
    </div>
  );
}

export function Analytics({ user, onBack }: AnalyticsProps) {
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserAnalytics(user.userId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user.userId]);

  return (
    <div className="min-h-screen pb-8">
      <header className="page-header">
        <div className="page-header-content">
          <button onClick={onBack} className="button-icon" style={{ color: 'var(--color-forest-600)' }}>
            <ArrowLeft size={20} />
          </button>
          <h2>Your Stats</h2>
          <div style={{ width: 32 }} />
        </div>
      </header>

      <main className="page-content">
        {error && <p className="text-error">{error}</p>}
        {!data && !error && <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>}
        {data && (
          <div className="space-stack-md">
            <Section title="Overview">
              <StatRow label="Games played" value={data.overview.gamesPlayed} />
              <StatRow label="Games won" value={data.overview.gamesWon} />
              <StatRow label="Win rate" value={`${data.overview.winRate}%`} />
              <StatRow label="Active games" value={data.overview.totalGamesActive} />
            </Section>

            <Section title="Scoring">
              <StatRow label="Average score" value={data.scoring.averageScore} />
              <StatRow label="Highest score" value={data.scoring.highestScore} />
              <StatRow label="Lowest score" value={data.scoring.lowestScore} />
              <StatRow label="Avg diversity penalty" value={data.scoring.diversityPenaltyAverage} />
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category averages</p>
                {Object.entries(data.scoring.categoryAverages).map(([cat, avg]) => (
                  <StatRow key={cat} label={CATEGORY_LABELS[cat] ?? cat} value={avg} />
                ))}
              </div>
            </Section>

            <Section title="Cards">
              <StatRow label="Total cards placed" value={data.cards.totalCardsPlaced} />
              {data.cards.mostValuableCard.avgPoints > 0 && (
                <StatRow
                  label="Most valuable card"
                  value={`${data.cards.mostValuableCard.type} (${data.cards.mostValuableCard.avgPoints.toFixed(1)} avg pts)`}
                />
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Card distribution</p>
                {CARD_TYPES.filter(t => (data.cards.cardTypeDistribution[t] ?? 0) > 0).map(type => (
                  <StatRow key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={data.cards.cardTypeDistribution[type] ?? 0} />
                ))}
              </div>
            </Section>

            <Section title="Board">
              <StatRow label="Avg board width" value={data.ecosystem.averageWidth} />
              <StatRow label="Avg board height" value={data.ecosystem.averageHeight} />
              <StatRow label="Avg cards per game" value={data.ecosystem.averageCardCount} />
              <StatRow label="Most common shape" value={data.ecosystem.mostCommonShape} />
            </Section>

            {Object.keys(data.opponents.winRateVsOpponents).length > 0 && (
              <Section title="Opponents">
                {data.opponents.mostPlayedAgainst && (
                  <StatRow
                    label="Most played against"
                    value={`${data.opponents.mostPlayedAgainst.name} (${data.opponents.mostPlayedAgainst.games}g)`}
                  />
                )}
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Head to head</p>
                  {Object.values(data.opponents.winRateVsOpponents).map((opp) => (
                    <StatRow
                      key={opp.name}
                      label={opp.name}
                      value={`${opp.wins}W–${opp.losses}L (${opp.winRate}%)`}
                    />
                  ))}
                </div>
              </Section>
            )}

            {data.overview.gamesPlayed === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '2rem 0' }}>
                Play some games to see your stats!
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
