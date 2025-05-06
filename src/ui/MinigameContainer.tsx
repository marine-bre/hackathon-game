import { useGameStore } from '../lib/gameStore';
import FlorentinMinigame from '../components/levels/FlorentinMinigame';
import OldNorthMinigame from '../components/levels/OldNorthMinigame';
import TayeletMinigame from '../components/levels/TayeletMinigame';
import KiryaMinigame from '../components/levels/KiryaMinigame';

type MinigameContainerProps = {
  onWin: () => void;
  onLose: () => void;
};

const MinigameContainer = ({ onWin, onLose }: MinigameContainerProps) => {
  const selectedNeighborhood = useGameStore((s) => s.selectedNeighborhood);
  const completeNeighborhood = useGameStore((s) => s.completeNeighborhood);

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
    case 'Florentin':
    default:
      // Default to Florentin for MVP or if neighborhood is not selected
      return <FlorentinMinigame onWin={handleWin} onLose={onLose} />;
  }
};

export default MinigameContainer;
