import GenericMinigame, { MinigameTheme } from './GenericMinigame';

type FlorentinMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

// Florentin theme with AC water drops
const florentinTheme: MinigameTheme = {
  enemyImage: '/drop.png',
  collectibleImages: {
    pita: '/pita.png', // Using falafel.png for both for now
  },
  pointItems: {
    falafel: '/falafel.png',
  },
  backgroundImage: '/combined_street_panorama.png',
  instructionText: 'Avoid the AC water drops!',
  enemyMinSize: 80,
  enemyMaxSize: 140,
  enemySpeed: 3.3,
  enemySpawnInterval: 810,
  backgroundOverlayColor: 'rgba(245, 245, 220, 0.3)',
};

export default function FlorentinMinigame({ onWin, onLose }: FlorentinMinigameProps) {
  return (
    <GenericMinigame
      onWin={onWin}
      onLose={onLose}
      theme={florentinTheme}
      gameDuration={20000} // 20 seconds
    />
  );
}
