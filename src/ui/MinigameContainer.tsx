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

  // Select the appropriate minigame based on the neighborhood
  switch (selectedNeighborhood) {
    case 'Old North':
      return <OldNorthMinigame onWin={handleWin} onLose={onLose} />;
    case 'tayelet':
      return <TayeletMinigame onWin={handleWin} onLose={onLose} />;
    case 'Kiryat Hamemshala':
      return <KiryaMinigame onWin={handleWin} onLose={onLose} />;
    case 'Memadion':
    case 'memadion':
      return <MemadionMinigame onWin={handleWin} onLose={onLose} />;
    case 'Park Hamesila':
    case 'parkHaMesilah':
      return <ParkHaMesilahMinigame onWin={handleWin} onLose={onLose} />;
    case 'Florentin':
    default:
      // Default to Florentin for MVP or if neighborhood is not selected
      return <FlorentinMinigame onWin={handleWin} onLose={onLose} />;
  }
};

export default MinigameContainer;
