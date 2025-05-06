import GenericMinigame, { MinigameTheme } from './GenericMinigame';

type TayeletMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

const TayeletTheme: MinigameTheme = {
  enemyImage: '/matkot.png', // This would be replaced with a bicycle image
  collectibleImages: {
    pita: '/pita.png',
    falafel: '/falafel.png',
  },
  pointItems: {
    coffee: '/hat.png',
    sunscreen: '/sunscreen.png',
  },
  backgroundImage: '/beach_background.jpg', // Would be replaced with Old North street
  instructionText: 'Avoid the matkot and collect suncream and hats!',
  enemyMinSize: 60, // Bicycles are smaller than water drops
  enemyMaxSize: 120,
  enemySpeed: 4.4, // 10% faster
  enemySpawnInterval: 1080, // 10% less
  backgroundOverlayColor: 'rgba(240, 240, 250, 0.3)', // Slightly different overlay color
};

export default function TayeletMinigame({ onWin, onLose }: TayeletMinigameProps) {
  return (
    <GenericMinigame
      onWin={onWin}
      onLose={onLose}
      theme={TayeletTheme}
      gameDuration={25000} // 25 seconds, slightly longer than Florentin
    />
  );
}
