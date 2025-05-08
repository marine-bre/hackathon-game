import { useGameStore } from '../lib/gameStore';
import FlorentinMinigame from '../components/levels/FlorentinMinigame';
import OldNorthMinigame from '../components/levels/OldNorthMinigame';
import TayeletMinigame from '../components/levels/TayeletMinigame';
import KiryaMinigame from '../components/levels/KiryaMinigame';
import MemadionMinigame from '../components/levels/MemadionMinigame';
import ParkHaMesilahMinigame from '../components/levels/ParkHaMesilahMinigame';
import { useEffect } from 'react';

type MinigameContainerProps = {
  onWin: () => void;
  onLose: () => void;
};

const MinigameContainer = ({ onWin, onLose }: MinigameContainerProps) => {
  const selectedNeighborhood = useGameStore((s) => s.selectedNeighborhood);
  const completeNeighborhood = useGameStore((s) => s.completeNeighborhood);
  const setGameState = useGameStore((s) => s.setGameState);
  
  // Add ESC key handler to return to map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameState('map');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setGameState]);

  // Log debug info
  useEffect(() => {
    console.log(`Loading minigame for: ${selectedNeighborhood || 'no neighborhood'}`);
  }, [selectedNeighborhood]);

  const handleWin = () => {
    if (selectedNeighborhood) {
      completeNeighborhood(selectedNeighborhood);
    }
    onWin();
  };

  // Normalize name for comparison (with fallback)
  const neighborhoodName = selectedNeighborhood ? 
    selectedNeighborhood.toLowerCase().trim() : 'florentin';

  // Select the appropriate minigame based on the normalized neighborhood
  if (neighborhoodName.includes('north')) {
    return <OldNorthMinigame onWin={handleWin} onLose={onLose} />;
  } else if (neighborhoodName.includes('tayelet')) {
    return <TayeletMinigame onWin={handleWin} onLose={onLose} />;
  } else if (neighborhoodName.includes('hamemshala') || neighborhoodName.includes('kirya')) {
    return <KiryaMinigame onWin={handleWin} onLose={onLose} />;
  } else if (neighborhoodName.includes('memadion')) {
    return <MemadionMinigame onWin={handleWin} onLose={onLose} />;
  } else if (neighborhoodName.includes('hamesila') || neighborhoodName.includes('mesilah') || neighborhoodName.includes('park')) {
    return <ParkHaMesilahMinigame onWin={handleWin} onLose={onLose} />;
  } else {
    // Default to Florentin for any unknown or missing neighborhood
    return <FlorentinMinigame onWin={handleWin} onLose={onLose} />;
  }
};

export default MinigameContainer;
