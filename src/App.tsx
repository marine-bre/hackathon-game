import { useGameStore, GameStore } from './lib/gameStore';
import { WelcomeScreen } from './ui/WelcomeScreen';
import { MapScreen } from './ui/MapScreen';
import BusTransition from './ui/BusTransition';
import MinigameContainer from './ui/MinigameContainer';
import GameOverScreen from './ui/GameOverScreen';
import VictoryScreen from './ui/VictoryScreen';
import HUD from './ui/HUD';
import { useEffect } from 'react';

function App() {
  const gameState = useGameStore((s: GameStore) => s.gameState);
  const setGameState = useGameStore((s: GameStore) => s.setGameState);
  const reset = useGameStore((s: GameStore) => s.reset);
  
  // Basic game state logging
  useEffect(() => {
    console.log(`Game state changed to: ${gameState}`);
  }, [gameState]);

  return (
    <>
      {gameState === 'map' && <HUD extraTopMargin />}
      {gameState === 'minigame' && <HUD showEscHint />}
      {gameState === 'welcome' && <WelcomeScreen />}
      {gameState === 'map' && <MapScreen />}
      {gameState === 'transition' && <BusTransition onComplete={() => setGameState('minigame')} />}
      {gameState === 'minigame' && (
        <MinigameContainer onWin={() => setGameState('map')} onLose={() => setGameState('map')} />
      )}
      {gameState === 'gameover' && <GameOverScreen onRestart={reset} />}
      {gameState === 'victory' && <VictoryScreen onRestart={reset} />}
    </>
  );
}

export default App;
