import { useState } from 'react';
import { Landing } from './components/Landing';
import { EmailSent } from './components/EmailSent';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { GameBoard } from './components/GameBoard';
import { EndGame } from './components/EndGame';

export type Screen = 
  | { type: 'landing' }
  | { type: 'email-sent'; email: string }
  | { type: 'home'; user: { email: string; name: string } }
  | { type: 'create-game'; user: { email: string; name: string } }
  | { type: 'game-board'; gameId: string; user: { email: string; name: string } }
  | { type: 'end-game'; gameId: string; user: { email: string; name: string } };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'landing' });

  return (
    <div className="min-h-screen bg-stone-50">
      {screen.type === 'landing' && (
        <Landing onEmailSubmit={(email) => setScreen({ type: 'email-sent', email })} />
      )}
      {screen.type === 'email-sent' && (
        <EmailSent 
          email={screen.email} 
          onResend={() => {}}
          onLogin={() => setScreen({ type: 'home', user: { email: screen.email, name: 'Player' } })}
        />
      )}
      {screen.type === 'home' && (
        <Home 
          user={screen.user}
          onCreateGame={() => setScreen({ type: 'create-game', user: screen.user })}
          onJoinGame={(gameId) => setScreen({ type: 'game-board', gameId, user: screen.user })}
        />
      )}
      {screen.type === 'create-game' && (
        <CreateGame 
          user={screen.user}
          onBack={() => setScreen({ type: 'home', user: screen.user })}
          onCreate={(gameId) => setScreen({ type: 'game-board', gameId, user: screen.user })}
        />
      )}
      {screen.type === 'game-board' && (
        <GameBoard 
          gameId={screen.gameId}
          user={screen.user}
          onBack={() => setScreen({ type: 'home', user: screen.user })}
          onGameEnd={() => setScreen({ type: 'end-game', gameId: screen.gameId, user: screen.user })}
        />
      )}
      {screen.type === 'end-game' && (
        <EndGame 
          gameId={screen.gameId}
          user={screen.user}
          onReturnHome={() => setScreen({ type: 'home', user: screen.user })}
          onNewGame={() => setScreen({ type: 'create-game', user: screen.user })}
        />
      )}
    </div>
  );
}
