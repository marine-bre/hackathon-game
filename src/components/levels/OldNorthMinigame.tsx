import GenericMinigame, { MinigameTheme } from './GenericMinigame';

type OldNorthMinigameTheme = MinigameTheme & { playerOverlayImage?: string };

type OldNorthMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

// Old North theme with bicycles as enemies
const oldNorthTheme: OldNorthMinigameTheme = {
  enemyImage: '/paper.png',
  collectibleImages: {
    falafel: '/falafel.png',
    pita: '/pita.png',
  },
  pointItems: {
    falafel: '/falafel.png',
  },
  backgroundImage: '/kikarrabin.avif',
  instructionText: 'Dont let the paper get inside the roll!!',
  enemyMinSize: 60, // Bicycles are smaller than water drops
  enemyMaxSize: 120,
  enemySpeed: 4.4, // 10% faster
  enemySpawnInterval: 1080, // 10% less
  backgroundOverlayColor: 'rgba(240, 240, 250, 0.3)', // Slightly different overlay color
  playerOverlayImage: '/toiletpaper.png',
};

export default function OldNorthMinigame({ onWin, onLose }: OldNorthMinigameProps) {
  return <GenericMinigame theme={oldNorthTheme} onWin={onWin} onLose={onLose} />;
}
