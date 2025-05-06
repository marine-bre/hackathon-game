import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../lib/gameStore';
import HUD from '../../ui/HUD';

export type MinigameTheme = {
  // Game elements
  enemyImage: string;
  collectibleImages: Record<string, string>;
  backgroundImage: string;
  pointItems: Record<string, string>;

  // Game text
  instructionText: string;

  // Game mechanics
  enemyMinSize: number;
  enemyMaxSize: number;
  enemySpeed: number;
  enemySpawnInterval: number;

  // Visual settings
  backgroundOverlayColor?: string;
};

export type GenericMinigameProps = {
  theme: MinigameTheme;
};

const PLAYER_RADIUS = 24;

const characterImages = {
  nimrod: '/HIP.PNG',
  liat: '/POSH.png',
  reuven: '/YEMANI.PNG',
  josef: '/NEVORISH.png',
  hila: '/MOM.png',
};

export default function GenericMinigame({ theme }: GenericMinigameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [playerX, setPlayerX] = useState(0);
  const [enemies, setEnemies] = useState<
    { x: number; y: number; size: number; spawnTime: number }[]
  >([]);
  const [collectible, setCollectible] = useState<{
    x: number;
    y: number;
    type: string;
    spawnTime: number;
  } | null>(null);
  const [running, setRunning] = useState(true);
  const animationRef = useRef<number>();
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const enemyImageRef = useRef<HTMLImageElement | null>(null);
  const collectibleImagesRef = useRef<Record<string, HTMLImageElement | null>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const bgOffsetRef = useRef(0);
  const [score, setScore] = useState(0);
  const [pointItem, setPointItem] = useState<{
    x: number;
    y: number;
    type: string;
    spawnTime: number;
  } | null>(null);
  const pointItemImagesRef = useRef<Record<string, HTMLImageElement | null>>({});
  const boomImageRef = useRef<HTMLImageElement | null>(null);
  const [flickerUntil, setFlickerUntil] = useState<number>(0);

  const setGameState = useGameStore((s) => s.setGameState);
  const selectedCharacter = useGameStore((s) => s.selectedCharacter);
  const health = useGameStore((s) => s.health);
  const loseHeart = useGameStore((s) => s.loseHeart);
  const gainHeart = useGameStore((s) => s.gainHeart);
  const minigameStartTime = useGameStore((s) => s.minigameStartTime);
  const setMinigameStartTime = useGameStore((s) => s.setMinigameStartTime);
  const completeNeighborhood = useGameStore((s) => s.completeNeighborhood);
  const selectedNeighborhood = useGameStore((s) => s.selectedNeighborhood);

  // Add debug toggle state
  const [debugHitboxes, setDebugHitboxes] = useState(false);

  // Add invulnerability state from Zustand
  const isInvulnerable = useGameStore((s) => s.isInvulnerable);
  const invulnerabilityEndTime = useGameStore((s) => s.invulnerabilityEndTime);
  const setInvulnerable = useGameStore((s) => s.setInvulnerable);
  const clearInvulnerable = useGameStore((s) => s.clearInvulnerable);

  // Set canvas size to window size
  useEffect(() => {
    const updateSize = () => {
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      setCanvasSize({ width, height });
      setPlayerX(width / 2);
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Random X position scaled to canvas width
  const randomX = () => {
    return Math.random() * (canvasSize.width - 50) + 25;
  };

  // Generate random enemy size between min and max
  const randomEnemySize = () => {
    return (
      Math.floor(Math.random() * (theme.enemyMaxSize - theme.enemyMinSize + 1)) + theme.enemyMinSize
    );
  };

  // Get random collectible type
  const getRandomCollectibleType = (): string => {
    const types = Object.keys(theme.collectibleImages);
    return types[Math.floor(Math.random() * types.length)];
  };

  // Get random point item type
  const getRandomPointItemType = (): string => {
    const types = Object.keys(theme.pointItems);
    return types[Math.floor(Math.random() * types.length)];
  };

  // Load images: player, enemy, collectibles, and background
  useEffect(() => {
    if (!selectedCharacter) return;

    // Load player image
    const playerImg = new Image();
    playerImg.src = characterImages[selectedCharacter];
    playerImg.onload = () => {
      playerImageRef.current = playerImg;
    };

    // Load enemy image
    const enemyImg = new Image();
    enemyImg.src = theme.enemyImage;
    enemyImg.onload = () => {
      enemyImageRef.current = enemyImg;
    };

    // Load collectible images
    Object.entries(theme.collectibleImages).forEach(([type, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        collectibleImagesRef.current[type] = img;
      };
    });

    // Load background image
    const bgImg = new Image();
    bgImg.src = theme.backgroundImage;
    bgImg.onload = () => {
      backgroundImageRef.current = bgImg;
    };
  }, [selectedCharacter, theme]);

  // Load point item images
  useEffect(() => {
    Object.entries(theme.pointItems).forEach(([type, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        pointItemImagesRef.current[type] = img;
      };
    });
  }, [theme]);

  // Load boom image
  useEffect(() => {
    const boomImg = new Image();
    boomImg.src = '/boom.png';
    boomImg.onload = () => {
      boomImageRef.current = boomImg;
    };
  }, []);

  // Handle mouse movement
  useEffect(() => {
    function handleMouse(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      setPlayerX(Math.max(PLAYER_RADIUS, Math.min(canvasSize.width - PLAYER_RADIUS, x)));
    }
    const canvas = canvasRef.current;
    canvas?.addEventListener('mousemove', handleMouse);
    return () => canvas?.removeEventListener('mousemove', handleMouse);
  }, [canvasSize.width]);

  // Enemy spawner
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    let timeoutId: NodeJS.Timeout;
    function spawnEnemy() {
      setEnemies((d) => [
        ...d,
        { x: randomX(), y: -30, size: randomEnemySize(), spawnTime: Date.now() },
      ]);
      timeoutId = setTimeout(spawnEnemy, theme.enemySpawnInterval);
    }
    spawnEnemy();
    return () => clearTimeout(timeoutId);
  }, [running, canvasSize.width, theme.enemySpawnInterval]);

  // Occasionally spawn a collectible
  useEffect(() => {
    if (!running || collectible || !canvasSize.width) return;
    // Spawn a collectible every 5 seconds
    const spawn = () => {
      setCollectible({
        x: randomX(),
        y: 0,
        type: getRandomCollectibleType(),
        spawnTime: Date.now(),
      });
    };
    const timer = setTimeout(spawn, 5000);
    return () => clearTimeout(timer);
  }, [running, collectible, canvasSize.width]);

  // Occasionally spawn a point item
  useEffect(() => {
    if (!running || pointItem || !canvasSize.width) return;
    // Spawn a point item every 3 seconds
    const spawn = () => {
      setPointItem({
        x: randomX(),
        y: 0,
        type: getRandomPointItemType(),
        spawnTime: Date.now(),
      });
    };
    const timer = setTimeout(spawn, 3000);
    return () => clearTimeout(timer);
  }, [running, pointItem, canvasSize.width]);

  // Listen for debug toggle key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') setDebugHitboxes((v) => !v);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Helper: get AABB for player
  function getPlayerRect() {
    if (!playerImageRef.current || !selectedCharacter) {
      // fallback circle
      const size = PLAYER_RADIUS * 2;
      return {
        x: playerX - PLAYER_RADIUS,
        y: canvasSize.height - 60 - PLAYER_RADIUS,
        width: size,
        height: size,
      };
    }
    const playerHeight = canvasSize.height * 0.23;
    const aspectRatio = playerImageRef.current.width / playerImageRef.current.height;
    const playerWidth = playerHeight * aspectRatio;
    return {
      x: playerX - playerWidth / 2,
      y: canvasSize.height - playerHeight,
      width: playerWidth,
      height: playerHeight,
    };
  }

  // Helper: get AABB for enemy
  function getEnemyRect(enemy: { x: number; y: number; size: number }) {
    if (!enemyImageRef.current) {
      const size = (enemy.size / 100) * 32;
      return {
        x: enemy.x - size / 2,
        y: enemy.y - size / 2,
        width: size,
        height: size,
      };
    }
    const enemyHeight = enemy.size;
    const aspectRatio = enemyImageRef.current.width / enemyImageRef.current.height;
    const enemyWidth = enemyHeight * aspectRatio;
    return {
      x: enemy.x - enemyWidth / 2,
      y: enemy.y - enemyHeight / 2,
      width: enemyWidth,
      height: enemyHeight,
    };
  }

  // Helper: get AABB for collectible/point item
  function getItemRect(item: { x: number; y: number }) {
    const size = 80;
    return {
      x: item.x - size / 2,
      y: item.y - size / 2,
      width: size,
      height: size,
    };
  }

  // AABB collision check
  function rectsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  // Set minigame start time on mount
  useEffect(() => {
    setMinigameStartTime(Date.now());
  }, [setMinigameStartTime]);

  // Timer logic
  const [remainingTime, setRemainingTime] = useState(30);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - minigameStartTime) / 1000;
      setRemainingTime(Math.max(0, 30 - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [minigameStartTime, running]);

  // End minigame after 30s
  useEffect(() => {
    if (!running) return;
    if (remainingTime <= 0) {
      setRunning(false);
      // Score threshold
      if (score >= 100 && selectedNeighborhood) {
        completeNeighborhood(selectedNeighborhood);
      }
      setTimeout(() => setGameState('map'), 400);
    }
  }, [remainingTime, running, score, completeNeighborhood, selectedNeighborhood, setGameState]);

  // Game over if permanentHearts = 0
  useEffect(() => {
    if (health.permanentHearts <= 0) {
      setRunning(false);
      setTimeout(() => setGameState('gameover'), 400);
    }
  }, [health.permanentHearts, setGameState]);

  // Unified collision check
  function checkCollisions() {
    const playerRect = getPlayerRect();
    // Enemy collisions
    if (!isInvulnerable) {
      for (const enemy of enemies) {
        const enemyRect = getEnemyRect(enemy);
        if (rectsOverlap(playerRect, enemyRect)) {
          console.log('Enemy collision!');
          setInvulnerable(Date.now() + 750);
          setFlickerUntil(Date.now() + 750);
          loseHeart();
          return;
        }
      }
    }
    // Collectible
    if (collectible) {
      const itemRect = getItemRect(collectible);
      if (rectsOverlap(playerRect, itemRect)) {
        console.log('Collectible collision!');
        gainHeart();
        setCollectible(null);
      } else if (collectible.y > canvasSize.height + 20) {
        setCollectible(null);
      }
    }
    // Point Item
    if (pointItem) {
      const itemRect = getItemRect(pointItem);
      if (rectsOverlap(playerRect, itemRect)) {
        console.log('Point item collision!');
        setScore(score + 10);
        setPointItem(null);
      } else if (pointItem.y > canvasSize.height + 20) {
        setPointItem(null);
      }
    }
  }

  // Invulnerability timer (fix: use animation frame loop)
  useEffect(() => {
    let raf: number | undefined;
    function checkInvuln() {
      if (isInvulnerable && invulnerabilityEndTime && Date.now() >= invulnerabilityEndTime) {
        clearInvulnerable();
      } else {
        raf = requestAnimationFrame(checkInvuln);
      }
    }
    if (isInvulnerable) {
      raf = requestAnimationFrame(checkInvuln);
    }
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [isInvulnerable, invulnerabilityEndTime, clearInvulnerable]);

  // Main collision check in game loop
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    checkCollisions();
  }, [
    enemies,
    playerX,
    running,
    collectible,
    loseHeart,
    setScore,
    health,
    canvasSize,
    pointItem,
    score,
    isInvulnerable,
  ]);

  // Draw debug outlines
  useEffect(() => {
    if (!debugHitboxes || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    // Player
    const playerRect = getPlayerRect();
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerRect.x, playerRect.y, playerRect.width, playerRect.height);
    ctx.restore();
    // Enemies
    for (const enemy of enemies) {
      const enemyRect = getEnemyRect(enemy);
      ctx.save();
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemyRect.x, enemyRect.y, enemyRect.width, enemyRect.height);
      ctx.restore();
    }
    // Collectible
    if (collectible) {
      const itemRect = getItemRect(collectible);
      ctx.save();
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.strokeRect(itemRect.x, itemRect.y, itemRect.width, itemRect.height);
      ctx.restore();
    }
    // Point Item
    if (pointItem) {
      const itemRect = getItemRect(pointItem);
      ctx.save();
      ctx.strokeStyle = 'orange';
      ctx.lineWidth = 2;
      ctx.strokeRect(itemRect.x, itemRect.y, itemRect.width, itemRect.height);
      ctx.restore();
    }
  }, [debugHitboxes, enemies, collectible, pointItem, playerX, canvasSize, selectedCharacter]);

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasSize.width || !canvasSize.height) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Background image with horizontal scrolling
    if (backgroundImageRef.current) {
      // Get original image dimensions
      const { width: imgW, height: imgH } = backgroundImageRef.current;

      // Calculate proper scaling to maintain aspect ratio
      // Scale to fit the height of the canvas perfectly
      const scale = canvasSize.height / imgH;
      const scaledWidth = Math.ceil(imgW * scale);
      const scaledHeight = Math.ceil(canvasSize.height);
      const offset = Math.round(bgOffsetRef.current % scaledWidth);

      // Draw the background image for continuous horizontal scrolling
      // First copy
      ctx.drawImage(backgroundImageRef.current, -offset, 0, scaledWidth, scaledHeight);

      // Second copy for seamless scrolling
      ctx.drawImage(backgroundImageRef.current, scaledWidth - offset, 0, scaledWidth, scaledHeight);

      // Add semi-transparent overlay for better visibility
      ctx.fillStyle = theme.backgroundOverlayColor || 'rgba(245, 245, 220, 0.3)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    } else {
      // Fallback background
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

    // Player
    if (playerImageRef.current && selectedCharacter) {
      // Draw player character image, feet anchored to bottom
      const playerHeight = canvasSize.height * 0.23;
      const aspectRatio = playerImageRef.current.width / playerImageRef.current.height;
      const playerWidth = playerHeight * aspectRatio;
      // Flicker logic
      let flicker = false;
      const now = Date.now();
      if (flickerUntil > now) {
        // Flicker every 100ms
        flicker = Math.floor(now / 100) % 2 === 0;
      }
      ctx.save();
      if (flicker) ctx.globalAlpha = 0.3;
      ctx.drawImage(
        playerImageRef.current,
        playerX - playerWidth / 2,
        canvasSize.height - playerHeight,
        playerWidth,
        playerHeight
      );
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // Fallback to circle if image not loaded
      ctx.beginPath();
      ctx.arc(playerX, canvasSize.height - 60, PLAYER_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#1976d2';
      ctx.fill();
    }

    // Enemies - draw with custom image and varying sizes
    for (const enemy of enemies) {
      if (enemyImageRef.current) {
        // Calculate width based on the height (size) to maintain aspect ratio
        const enemyHeight = enemy.size;
        const aspectRatio = enemyImageRef.current.width / enemyImageRef.current.height;
        const enemyWidth = enemyHeight * aspectRatio;
        // Spin angle based on time since spawn
        const now = Date.now();
        const spinAngle = (((now - enemy.spawnTime) % 2000) / 2000) * 2 * Math.PI;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(spinAngle);
        ctx.drawImage(
          enemyImageRef.current,
          -enemyWidth / 2,
          -enemyHeight / 2,
          enemyWidth,
          enemyHeight
        );
        ctx.restore();
      } else {
        // Fallback to simple circle if image not loaded
        // Scale the circle size based on enemy size
        const scaledRadius = (enemy.size / 100) * 16;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, scaledRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#90caf9';
        ctx.fill();
      }
    }

    // Collectible
    if (collectible && collectible.type) {
      const collectibleImg = collectibleImagesRef.current[collectible.type];
      if (collectibleImg) {
        // Draw boom image behind collectible (no spin)
        const collectibleSize = 80;
        const aspectRatio = collectibleImg.width / collectibleImg.height;
        const collectibleWidth = collectibleSize * aspectRatio;
        if (boomImageRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.drawImage(
            boomImageRef.current,
            collectible.x - (collectibleWidth * 1.5) / 2,
            collectible.y - (collectibleSize * 1.5) / 2,
            collectibleWidth * 1.5,
            collectibleSize * 1.5
          );
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        // Draw collectible image with spin animation
        const now = Date.now();
        const spinAngle = (((now - collectible.spawnTime) % 2000) / 2000) * 2 * Math.PI;
        ctx.save();
        ctx.translate(collectible.x, collectible.y);
        ctx.rotate(spinAngle);
        ctx.drawImage(
          collectibleImg,
          -collectibleWidth / 2,
          -collectibleSize / 2,
          collectibleWidth,
          collectibleSize
        );
        ctx.restore();
      } else {
        // Fallback circle if image not loaded
        ctx.beginPath();
        ctx.arc(collectible.x, collectible.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0c066';
        ctx.fill();
      }
    }

    // Point Item
    if (pointItem && pointItem.type) {
      const pointImg = pointItemImagesRef.current[pointItem.type];
      if (pointImg) {
        // Draw point item image with spin animation
        const pointSize = 80;
        const aspectRatio = pointImg.width / pointImg.height;
        const pointWidth = pointSize * aspectRatio;
        // Spin angle based on time since spawn
        const now = Date.now();
        const spinAngle = (((now - pointItem.spawnTime) % 2000) / 2000) * 2 * Math.PI;
        ctx.save();
        ctx.translate(pointItem.x, pointItem.y);
        ctx.rotate(spinAngle);
        ctx.drawImage(pointImg, -pointWidth / 2, -pointSize / 2, pointWidth, pointSize);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pointItem.x, pointItem.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#4caf50';
        ctx.fill();
      }
    }
  }, [enemies, playerX, collectible, selectedCharacter, canvasSize, pointItem]);

  // Game loop with background scrolling
  useEffect(() => {
    if (!running || !canvasSize.width) return () => {};
    function loop() {
      // Update background offset for horizontal scrolling
      // Get proper scaled width if background image is loaded
      if (backgroundImageRef.current) {
        const { width: imgW, height: imgH } = backgroundImageRef.current;
        const scale = canvasSize.height / imgH;
        const scaledWidth = Math.ceil(imgW * scale);

        // Increment offset by 1px each frame and reset when a full image width has been scrolled
        bgOffsetRef.current = (bgOffsetRef.current + 1) % scaledWidth;
      } else {
        // Fallback if image isn't loaded yet
        bgOffsetRef.current = (bgOffsetRef.current + 1) % (canvasSize.width * 2);
      }

      setEnemies((d) =>
        d
          .map((enemy) => ({ ...enemy, y: enemy.y + theme.enemySpeed }))
          .filter((enemy) => enemy.y < canvasSize.height + 50)
      );
      setCollectible((c) => (c ? { ...c, y: c.y + 2 } : c));
      setPointItem((c) => (c ? { ...c, y: c.y + 2 } : c));
      animationRef.current = requestAnimationFrame(loop);
    }
    animationRef.current = requestAnimationFrame(loop);
    return () => animationRef.current && cancelAnimationFrame(animationRef.current);
  }, [running, canvasSize.width, canvasSize.height, theme.enemySpeed]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#f5f5dc',
        zIndex: 1000,
        cursor: 'none',
      }}
    >
      <HUD
        minigameScore={score}
        minigameInstruction={theme.instructionText}
        remainingTime={remainingTime}
        neighborhoodName={selectedNeighborhood || undefined}
      />
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}
