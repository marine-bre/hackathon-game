import { useEffect, useRef, useState } from 'react';
import { useGameStore, GameStore } from '../../lib/gameStore';

// Custom HUD component for MemadionMinigame
const MemadionHUD = ({ 
  score,
  timeLeft 
}: { 
  score: number;
  timeLeft: number;
}) => {
  // Only use permanent hearts
  const permanentHearts = useGameStore((s: GameStore) => s.health.permanentHearts);

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-50 flex w-full flex-col items-center gap-4 p-6">
      <div className="pointer-events-auto mb-6 flex flex-col items-center gap-2">
        <div className="rounded bg-white/90 px-8 py-3 text-2xl font-bold text-gray-900 shadow">
          Survive the Flying Chairs at HaMemadion!
        </div>
        <div className="rounded bg-white/90 px-8 py-3 text-xl font-bold text-red-600 shadow">
          Dodge the plastic chairs!
        </div>
      </div>
      
      {/* Hearts - Only permanent hearts, no temporary/yellow hearts */}
      <div className="pointer-events-auto mb-4 flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span 
            key={i} 
            style={{ 
              opacity: 1, 
              color: '#e63946', 
              fontSize: 32 
            }}
          >
            {i < permanentHearts ? '❤️' : '🤍'}
          </span>
        ))}
      </div>
      
      {/* Score counter */}
      <div className="pointer-events-auto rounded bg-white/90 px-8 py-3 text-xl font-bold text-gray-900 shadow">
        Score: {score}
      </div>
      
      {/* Timer */}
      <div className="pointer-events-auto mt-2 rounded bg-white/90 px-8 py-2 text-lg font-bold shadow" style={{ color: timeLeft <= 5000 ? '#ff0000' : '#333' }}>
        Time: {Math.ceil(timeLeft / 1000)}s
      </div>
    </div>
  );
};

type MemadionMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

// Chair types with weighted probability (more white chairs)
const CHAIR_TYPES = {
  red: '/red-chair.png',
  white: '/white-chair.png?v=3',
};

// Chair type weights (higher number = more frequent)
const CHAIR_TYPE_WEIGHTS = {
  red: 1,    // Less common
  white: 4   // Even more common (increased from 3)
};

// Game constants
const GAME_DURATION = 20000; // 20 seconds
const PLAYER_RADIUS = 24;
const CHAIR_MIN_SIZE = 60;
const CHAIR_MAX_SIZE = 100;
const CHAIR_BASE_SPEED = 2.0; // Reduced from 2.5
const CHAIR_SPAWN_INTERVAL_MIN = 1000; // Increased from 800
const CHAIR_SPAWN_INTERVAL_MAX = 2200; // Increased from 1800
const MAX_CHAIRS = 4; // Reduced from 6
const SPIN_SPEED_MIN = 0.02; // Minimum spin speed (radians per frame)
const SPIN_SPEED_MAX = 0.06; // Reduced from 0.08

export default function MemadionMinigame({ onWin, onLose }: MemadionMinigameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [running, setRunning] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [lifeLost, setLifeLost] = useState(false);
  const animationRef = useRef<number>();
  
  // Images
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const chairImagesRef = useRef<Record<string, HTMLImageElement | null>>({});
  
  // Chairs - the obstacles that fly at the player
  const [chairs, setChairs] = useState<
    { 
      x: number; 
      y: number; 
      size: number;
      type: string;
      speed: number;
      direction: { x: number, y: number };
      rotation: number;
      spinSpeed: number;
      spawnTime: number;
    }[]
  >([]);

  const selectedCharacter = useGameStore(s => s.selectedCharacter);
  const loseHeart = useGameStore((s: GameStore) => s.loseHeart);
  const hearts = useGameStore((s: GameStore) => s.health.permanentHearts);
  const setGameState = useGameStore(s => s.setGameState);

  // Character images
  const characterImages = {
    nimrod: '/HIP.PNG',
    liat: '/POSH.png',
    reuven: '/YEMANI.PNG',
    josef: '/NEVORISH.png',
    hila: '/MOM.png',
  };

  // Set canvas size to window size
  useEffect(() => {
    const updateSize = () => {
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      setCanvasSize({ width, height });
      setPlayerX(width / 2);
      setPlayerY(height / 2);
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Random chair generation utilities
  const randomChairSize = () => {
    return Math.floor(Math.random() * (CHAIR_MAX_SIZE - CHAIR_MIN_SIZE + 1)) + CHAIR_MIN_SIZE;
  };
  
  const randomChairType = () => {
    // Use weighted random selection
    const weights = Object.entries(CHAIR_TYPE_WEIGHTS);
    const totalWeight = weights.reduce((sum, [_, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [type, weight] of weights) {
      if (random < weight) {
        return type;
      }
      random -= weight;
    }
    
    // Fallback
    return Object.keys(CHAIR_TYPES)[0];
  };
  
  const randomChairSpeed = () => {
    // More consistent speed with less variation
    return CHAIR_BASE_SPEED + (Math.random() * 1.5); // Reduced variation from 2 to 1.5
  };
  
  const randomSpinSpeed = () => {
    return SPIN_SPEED_MIN + (Math.random() * (SPIN_SPEED_MAX - SPIN_SPEED_MIN));
  };
  
  // Generate a random direction vector (normalized)
  const randomDirection = () => {
    // Generate a random angle in radians
    const angle = Math.random() * 2 * Math.PI;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  };
  
  // Generate a random position at the edge of the screen
  const randomEdgePosition = () => {
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    
    let x, y;
    const margin = 50; // Extra margin outside the viewport
    
    switch (edge) {
      case 0: // Top edge
        x = Math.random() * canvasSize.width;
        y = -margin;
        break;
      case 1: // Right edge
        x = canvasSize.width + margin;
        y = Math.random() * canvasSize.height;
        break;
      case 2: // Bottom edge
        x = Math.random() * canvasSize.width;
        y = canvasSize.height + margin;
        break;
      case 3: // Left edge
        x = -margin;
        y = Math.random() * canvasSize.height;
        break;
      default:
        x = -margin;
        y = -margin;
    }
    
    return { x, y, edge };
  };
  
  // Generate a direction vector pointing toward the center with some randomness
  const directionTowardCenter = (x: number, y: number, edge: number) => {
    // Base direction toward center
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    // Add randomness to target position (not exactly center)
    const targetX = centerX + (Math.random() * 300 - 150);
    const targetY = centerY + (Math.random() * 300 - 150);
    
    // Calculate direction vector
    const dx = targetX - x;
    const dy = targetY - y;
    
    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy);
    return {
      x: dx / length,
      y: dy / length
    };
  };

  // Load images: player, chairs, and background
  useEffect(() => {
    if (!selectedCharacter) return;

    // Load player image
    const playerImg = new Image();
    playerImg.src = characterImages[selectedCharacter];
    playerImg.onload = () => {
      playerImageRef.current = playerImg;
    };

    // Load chair images
    Object.entries(CHAIR_TYPES).forEach(([type, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        chairImagesRef.current[type] = img;
      };
    });

    // Load background image
    const bgImg = new Image();
    bgImg.src = '/memadion-bg.jpg';
    bgImg.onload = () => {
      backgroundImageRef.current = bgImg;
    };
  }, [selectedCharacter]);

  // Handle mouse movement
  useEffect(() => {
    function handleMouse(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPlayerX(Math.max(PLAYER_RADIUS, Math.min(canvasSize.width - PLAYER_RADIUS, x)));
      setPlayerY(Math.max(PLAYER_RADIUS, Math.min(canvasSize.height - PLAYER_RADIUS, y)));
    }
    const canvas = canvasRef.current;
    canvas?.addEventListener('mousemove', handleMouse);
    return () => canvas?.removeEventListener('mousemove', handleMouse);
  }, [canvasSize.width, canvasSize.height]);

  // Start game timer
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    // Set start time on first render
    if (startTime === 0) {
      setStartTime(Date.now());
    }
  }, [running, canvasSize.width, startTime]);
  
  // Spawn chairs
  useEffect(() => {
    if (!running || !canvasSize.width || chairs.length >= MAX_CHAIRS) return;
    
    const spawnChair = () => {
      // Don't spawn if we've hit the max
      if (chairs.length >= MAX_CHAIRS) return;
      
      const { x, y, edge } = randomEdgePosition();
      const size = randomChairSize();
      const type = randomChairType();
      const direction = directionTowardCenter(x, y, edge);
      const speed = randomChairSpeed();
      const now = Date.now();
      
      setChairs(chairs => [
        ...chairs,
        { 
          x, 
          y, 
          size,
          type,
          speed,
          direction,
          rotation: Math.random() * Math.PI * 2, // Random initial rotation
          spinSpeed: randomSpinSpeed(),
          spawnTime: now
        }
      ]);
      
      // Schedule next spawn with variable timing for unpredictability
      const nextSpawnDelay = CHAIR_SPAWN_INTERVAL_MIN + 
        Math.random() * (CHAIR_SPAWN_INTERVAL_MAX - CHAIR_SPAWN_INTERVAL_MIN);
      setTimeout(spawnChair, nextSpawnDelay);
    };
    
    // Initial spawn
    spawnChair();
    
  }, [running, canvasSize.width, chairs.length]);

  // Game timer
  useEffect(() => {
    if (!running || startTime === 0) return;
    
    const timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = GAME_DURATION - elapsed;
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        setTimeLeft(0);
        setRunning(false);
        // Win condition: survive the time limit
        setTimeout(onWin, 400);
      } else {
        setTimeLeft(remaining);
        // Increment score based on time survived
        setScore(Math.floor((elapsed / 1000) * 5)); // 5 points per second
      }
    }, 100);
    
    return () => clearInterval(timerInterval);
  }, [running, startTime, onWin]);

  // Game loop - move chairs and update their rotation
  useEffect(() => {
    if (!running || !canvasSize.width) return () => {};
    
    function loop() {
      // Move and rotate chairs
      setChairs(chairs => 
        chairs
          .map(chair => ({
            ...chair,
            x: chair.x + (chair.direction.x * chair.speed),
            y: chair.y + (chair.direction.y * chair.speed),
            rotation: chair.rotation + chair.spinSpeed,
          }))
          // Remove chairs that are off screen
          .filter(chair => {
            const margin = chair.size * 2;
            return (
              chair.x > -margin &&
              chair.x < canvasSize.width + margin &&
              chair.y > -margin &&
              chair.y < canvasSize.height + margin
            );
          })
      );
      
      animationRef.current = requestAnimationFrame(loop);
    }
    
    animationRef.current = requestAnimationFrame(loop);
    return () => animationRef.current && cancelAnimationFrame(animationRef.current);
  }, [running, canvasSize.width, canvasSize.height]);

  // Draw game elements
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasSize.width || !canvasSize.height) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Background image
    if (backgroundImageRef.current) {
      // Get original image dimensions
      const { width: imgW, height: imgH } = backgroundImageRef.current;

      // Calculate proper scaling to cover the entire canvas
      const canvasRatio = canvasSize.width / canvasSize.height;
      const imgRatio = imgW / imgH;
      
      let scaledWidth, scaledHeight, offsetX = 0, offsetY = 0;
      
      if (canvasRatio > imgRatio) {
        // Canvas is wider than image ratio
        scaledWidth = canvasSize.width;
        scaledHeight = scaledWidth / imgRatio;
        offsetY = (canvasSize.height - scaledHeight) / 2;
      } else {
        // Canvas is taller than image ratio
        scaledHeight = canvasSize.height;
        scaledWidth = scaledHeight * imgRatio;
        offsetX = (canvasSize.width - scaledWidth) / 2;
      }

      // Draw the background image
      ctx.drawImage(
        backgroundImageRef.current,
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight
      );
      
      // Add semi-transparent overlay for better visibility
      ctx.fillStyle = 'rgba(245, 245, 220, 0.2)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    } else {
      // Fallback background
      ctx.fillStyle = '#87CEEB'; // Sky blue
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

    // Draw chairs with rotation
    for (const chair of chairs) {
      const chairImg = chairImagesRef.current[chair.type];
      if (chairImg) {
        // Preserve original aspect ratio of the chair image
        const originalAspectRatio = chairImg.width / chairImg.height;
        
        // Base the chair size on the height and calculate width using aspect ratio
        const chairHeight = chair.size;
        const chairWidth = chairHeight * originalAspectRatio;
        
        ctx.save();
        // Translate to chair position
        ctx.translate(chair.x, chair.y);
        // Rotate
        ctx.rotate(chair.rotation);
        // Draw chair centered at rotation point
        ctx.drawImage(
          chairImg,
          -chairWidth / 2,
          -chairHeight / 2,
          chairWidth,
          chairHeight
        );
        ctx.restore();
      } else {
        // Fallback if image not loaded
        ctx.beginPath();
        ctx.save();
        ctx.translate(chair.x, chair.y);
        ctx.rotate(chair.rotation);
        ctx.rect(-chair.size / 2, -chair.size / 2, chair.size, chair.size);
        ctx.fillStyle = chair.type === 'red' ? '#FF0000' : '#FFFFFF';
        ctx.fill();
        ctx.restore();
      }
    }

    // Player
    if (playerImageRef.current && selectedCharacter) {
      // Draw player character image
      const playerSize = canvasSize.height * 0.13; // Smaller size for this game
      const aspectRatio = playerImageRef.current.width / playerImageRef.current.height;
      const playerWidth = playerSize * aspectRatio;
      
      ctx.drawImage(
        playerImageRef.current,
        playerX - playerWidth / 2,
        playerY - playerSize / 2,
        playerWidth,
        playerSize
      );
    } else {
      // Fallback to circle if image not loaded
      ctx.beginPath();
      ctx.arc(playerX, playerY, PLAYER_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#1976d2';
      ctx.fill();
    }
    
  }, [
    chairs,
    playerX,
    playerY,
    selectedCharacter,
    canvasSize,
    score,
    timeLeft,
  ]);

  // Collision detection & win/lose logic
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    // Calculate player hitbox - slightly smaller than visual for better gameplay
    const playerHitboxRadius = PLAYER_RADIUS * 0.8;
    
    // Check collisions with chairs
    if (!lifeLost) {
      for (const chair of chairs) {
        const dx = chair.x - playerX;
        const dy = chair.y - playerY;
        const chairHitboxRadius = chair.size / 2.5; // Make hitbox smaller than visual
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < playerHitboxRadius + chairHitboxRadius) {
          setLifeLost(true);
          loseHeart();
          
          if (hearts - 1 <= 0) {
            setRunning(false);
            setTimeout(() => setGameState('gameover'), 400);
          } else {
            setRunning(false);
            setTimeout(onLose, 400);
          }
          break;
        }
      }
    }
    
  }, [
    chairs,
    playerX,
    playerY,
    onWin,
    onLose,
    running,
    canvasSize,
    lifeLost,
    loseHeart,
    hearts,
    setGameState
  ]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#87CEEB',
        zIndex: 1000,
        cursor: 'none',
      }}
    >
      <MemadionHUD 
        score={score}
        timeLeft={timeLeft}
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