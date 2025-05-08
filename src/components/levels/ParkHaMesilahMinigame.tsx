import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../lib/gameStore';
import HUD from '../../ui/HUD';
import thudSoundUrl from '../../../public/hurt.mp3';
import dingSoundUrl from '../../../public/coin.mp3';

type ParkHaMesilahMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

// Game constants
const GAME_DURATION = 30000; // 30 seconds
const PLAYER_WIDTH = 100; // Increased from 80 to make player bigger
const PLAYER_HEIGHT = 150; // Increased from 120 to make player bigger
const PLAYER_Y_POSITION = 80; // Distance from bottom of screen
const GRAVITY = 0.8;
const JUMP_FORCE = 15;
const MOVEMENT_SPEED = 6;
const ROACH_MIN_SPEED = 3;
const ROACH_MAX_SPEED = 5;
const RAT_MIN_SPEED = 4;
const RAT_MAX_SPEED = 7;
const SPRAY_SPAWN_INTERVAL = 3000; // Every 3 seconds
const SPRAY_SPEED = 4; // Increased from 3 to make them fall a bit faster
const ENEMY_SPAWN_INTERVAL = 1000; // Every 1 second
const SCORE_FOR_WIN = 100;
const POINTS_FOR_SPRAY = 10;
const ROACH_ANIMATION_SPEED = 150; // ms between frames
const ENEMY_Y_POSITION = 20; // Distance from bottom for enemies to move horizontally (reduced to keep them lower)

// Background music
const BACKGROUND_MUSIC_URL = 'https://www.youtube.com/watch?v=QEAgkSOs4S0'; // YouTube URL
const FALLBACK_MUSIC_URL = '/park_music_requested.mp3'; // Fallback local audio file

export default function ParkHaMesilahMinigame({ onWin, onLose }: ParkHaMesilahMinigameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [playerVelocityY, setPlayerVelocityY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [enemies, setEnemies] = useState<
    Array<{
      x: number;
      y: number;
      type: 'roach1' | 'roach2' | 'rat';
      speed: number;
      width: number;
      height: number;
    }>
  >([]);
  const [sprays, setSprays] = useState<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >([]);
  const [roachFrame, setRoachFrame] = useState(1);
  const animationRef = useRef<number>();
  const lastRoachFrameTime = useRef(0);
  
  // Images
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const roach1ImageRef = useRef<HTMLImageElement | null>(null);
  const roach2ImageRef = useRef<HTMLImageElement | null>(null);
  const ratImageRef = useRef<HTMLImageElement | null>(null);
  const sprayImageRef = useRef<HTMLImageElement | null>(null);

  // Audio
  const thudAudio = useRef<HTMLAudioElement>();
  const dingAudio = useRef<HTMLAudioElement>();
  const musicAudio = useRef<HTMLAudioElement>();

  // Game state from Zustand
  const selectedCharacter = useGameStore(s => s.selectedCharacter);
  const loseHeart = useGameStore(s => s.loseHeart);
  const setGameState = useGameStore(s => s.setGameState);
  const completeNeighborhood = useGameStore(s => s.completeNeighborhood);
  const selectedNeighborhood = useGameStore(s => s.selectedNeighborhood);
  const health = useGameStore(s => s.health);

  // Character images
  const characterImages = {
    nimrod: '/HIP.PNG',
    liat: '/POSH.png',
    reuven: '/YEMANI.PNG',
    josef: '/NEVORISH.png',
    hila: '/MOM.png',
  };

  // Preload audio
  useEffect(() => {
    thudAudio.current = new Audio(thudSoundUrl);
    thudAudio.current.volume = 0.5;
    dingAudio.current = new Audio(dingSoundUrl);
    dingAudio.current.volume = 0.5;
    
    // Setup background music
    // Try to create an audio element for the YouTube URL
    // Since direct YouTube audio playback isn't possible in a standard way via Audio API,
    // we'll use the local audio file directly
    try {
      musicAudio.current = new Audio(FALLBACK_MUSIC_URL);
      musicAudio.current.volume = 0.3;
      musicAudio.current.loop = true;
      console.log("Attempting to play music from:", FALLBACK_MUSIC_URL);
      
      // Try to play immediately, but handle browser autoplay restrictions
      musicAudio.current.play()
        .then(() => console.log("Music started successfully"))
        .catch(e => {
          console.log("Music play prevented by browser policy:", e);
          // Add a user interaction handler to start music
          const startMusic = () => {
            musicAudio.current?.play()
              .then(() => {
                console.log("Music started after user interaction");
                document.removeEventListener("click", startMusic);
                document.removeEventListener("keydown", startMusic);
              })
              .catch(err => console.log("Still couldn't play music:", err));
          };
          
          document.addEventListener("click", startMusic);
          document.addEventListener("keydown", startMusic);
        });
    } catch (error) {
      console.error("Failed to load music:", error);
    }

    return () => {
      musicAudio.current?.pause();
      musicAudio.current = undefined;
    };
  }, []);

  // Set canvas size to window size
  useEffect(() => {
    const updateSize = () => {
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      setCanvasSize({ width, height });
      setPlayerX(width / 2);
      setPlayerY(height - PLAYER_Y_POSITION);
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Load images: player, enemies, and background
  useEffect(() => {
    if (!selectedCharacter) return;

    // Load player image
    const playerImg = new Image();
    playerImg.src = characterImages[selectedCharacter];
    playerImg.onload = () => {
      playerImageRef.current = playerImg;
    };

    // Load background image
    const bgImg = new Image();
    bgImg.src = '/park-bg.png';
    bgImg.onerror = () => {
      console.error("Failed to load park-bg.png, trying simplified version");
      const backupImg = new Image();
      backupImg.src = '/assets_simple/park-bg.svg';
      backupImg.onload = () => {
        backgroundImageRef.current = backupImg;
      };
    };
    bgImg.onload = () => {
      backgroundImageRef.current = bgImg;
    };

    // Load roach images
    const roach1Img = new Image();
    roach1Img.src = '/roach-1.png';
    roach1Img.onerror = () => {
      console.error("Failed to load roach-1.png, trying simplified version");
      const backupImg = new Image();
      backupImg.src = '/assets_simple/roach.svg';
      backupImg.onload = () => {
        roach1ImageRef.current = backupImg;
      };
    };
    roach1Img.onload = () => {
      roach1ImageRef.current = roach1Img;
    };

    const roach2Img = new Image();
    roach2Img.src = '/roach-2.png';
    roach2Img.onerror = () => {
      console.error("Failed to load roach-2.png, trying simplified version");
      const backupImg = new Image();
      backupImg.src = '/assets_simple/roach.svg';
      backupImg.onload = () => {
        roach2ImageRef.current = backupImg;
      };
    };
    roach2Img.onload = () => {
      roach2ImageRef.current = roach2Img;
    };

    // Load rat image
    const ratImg = new Image();
    ratImg.src = '/rat.png';
    ratImg.onerror = () => {
      console.error("Failed to load rat.png, trying simplified version");
      const backupImg = new Image();
      backupImg.src = '/assets_simple/rat.svg';
      backupImg.onload = () => {
        ratImageRef.current = backupImg;
      };
    };
    ratImg.onload = () => {
      ratImageRef.current = ratImg;
    };

    // Load spray image
    const sprayImg = new Image();
    sprayImg.src = '/spray.png';
    sprayImg.onerror = () => {
      console.error("Failed to load spray.png, trying simplified version");
      const backupImg = new Image();
      backupImg.src = '/assets_simple/spray.svg';
      backupImg.onload = () => {
        sprayImageRef.current = backupImg;
      };
    };
    sprayImg.onload = () => {
      sprayImageRef.current = sprayImg;
    };
    
    // Log for debugging
    console.log('Loading assets:');
    console.log('Player:', characterImages[selectedCharacter]);
    console.log('Background: /park-bg.png');
    console.log('Roach1: /roach-1.png', 'Backup: /assets_simple/roach.svg');
    console.log('Roach2: /roach-2.png', 'Backup: /assets_simple/roach.svg');
    console.log('Rat: /rat.png', 'Backup: /assets_simple/rat.svg');
    console.log('Spray: /spray.png', 'Backup: /assets_simple/spray.svg');
  }, [selectedCharacter]);

  // Keyboard controls for player movement
  useEffect(() => {
    const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.key === 'ArrowRight') keys.ArrowRight = true;
      if (e.key === ' ' || e.code === 'Space') {
        keys.Space = true;
        if (!isJumping) {
          setIsJumping(true);
          setPlayerVelocityY(-JUMP_FORCE);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.key === 'ArrowRight') keys.ArrowRight = false;
      if (e.key === ' ' || e.code === 'Space') keys.Space = false;
    };
    
    const movePlayer = () => {
      if (keys.ArrowLeft) {
        setPlayerX(prev => Math.max(PLAYER_WIDTH / 2, prev - MOVEMENT_SPEED));
      }
      if (keys.ArrowRight) {
        setPlayerX(prev => Math.min(canvasSize.width - PLAYER_WIDTH / 2, prev + MOVEMENT_SPEED));
      }
    };
    
    const moveInterval = setInterval(movePlayer, 16);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      clearInterval(moveInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvasSize.width, isJumping]);

  // Physics - jumping and gravity
  useEffect(() => {
    if (!running) return;
    
    const applyPhysics = () => {
      if (isJumping) {
        setPlayerVelocityY(prev => prev + GRAVITY);
        setPlayerY(prev => {
          const nextY = prev + playerVelocityY;
          const floorY = canvasSize.height - PLAYER_Y_POSITION;
          
          if (nextY >= floorY) {
            setIsJumping(false);
            setPlayerVelocityY(0);
            return floorY;
          }
          
          return nextY;
        });
      }
    };
    
    const physicsInterval = setInterval(applyPhysics, 16);
    
    return () => clearInterval(physicsInterval);
  }, [running, isJumping, playerVelocityY, canvasSize.height]);

  // Spawn enemies
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    const spawnEnemy = () => {
      const type = Math.random() < 0.7 ? (Math.random() < 0.5 ? 'roach1' : 'roach2') : 'rat';
      const width = type === 'rat' ? 90 : 60;
      const height = type === 'rat' ? 45 : 35;
      const speed = type === 'rat' 
        ? RAT_MIN_SPEED + Math.random() * (RAT_MAX_SPEED - RAT_MIN_SPEED)
        : ROACH_MIN_SPEED + Math.random() * (ROACH_MAX_SPEED - ROACH_MIN_SPEED);
      
      // Start from either left or right side of the screen
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -width : canvasSize.width;
      
      // Fixed Y position at the bottom for ALL enemies (consistent height for all enemies)
      const y = canvasSize.height - ENEMY_Y_POSITION;
      
      console.log(`Spawning ${type} at (${x}, ${y}) with speed ${speed * (fromLeft ? 1 : -1)}`);
      
      setEnemies(prev => [...prev, { 
        x, 
        y, 
        type, 
        speed: speed * (fromLeft ? 1 : -1), // Negative speed means moving left
        width, 
        height 
      }]);
    };
    
    const enemyInterval = setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL);
    
    return () => clearInterval(enemyInterval);
  }, [running, canvasSize.width]);

  // Spawn sprays (collectibles)
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    const spawnSpray = () => {
      const width = 45; 
      const height = 80;
      
      // Random X position across the width of the screen
      const x = Math.random() * (canvasSize.width - width);
      
      // Start above the screen so it enters from the top
      const y = -height;
      
      console.log(`Spawning spray at (${x}, ${y})`);
      
      setSprays(prev => [...prev, { x, y, width, height }]);
    };
    
    const sprayInterval = setInterval(spawnSpray, SPRAY_SPAWN_INTERVAL);
    
    return () => clearInterval(sprayInterval);
  }, [running, canvasSize.width]);
  
  // Update roach animation frame
  useEffect(() => {
    if (!running) return;
    
    const updateRoachFrame = () => {
      const now = Date.now();
      if (now - lastRoachFrameTime.current > ROACH_ANIMATION_SPEED) {
        setRoachFrame(prev => (prev === 1 ? 2 : 1));
        lastRoachFrameTime.current = now;
      }
    };
    
    const frameInterval = setInterval(updateRoachFrame, ROACH_ANIMATION_SPEED);
    
    return () => clearInterval(frameInterval);
  }, [running]);

  // Start game timer
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    if (startTime === 0) {
      setStartTime(Date.now());
    }
    
    const timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (score >= SCORE_FOR_WIN) {
          if (selectedNeighborhood) completeNeighborhood(selectedNeighborhood);
          onWin();
        } else {
          onLose();
        }
      }
    }, 100);
    
    return () => clearInterval(timerInterval);
  }, [running, canvasSize.width, startTime, score, onWin, onLose, completeNeighborhood, selectedNeighborhood]);

  // Game over if permanentHearts = 0
  useEffect(() => {
    if (health.permanentHearts <= 0) {
      setRunning(false);
      setTimeout(() => setGameState('gameover'), 400);
    }
  }, [health.permanentHearts, setGameState]);

  // Get player hitbox
  const getPlayerHitbox = () => {
    return {
      x: playerX - PLAYER_WIDTH / 2,
      y: playerY - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT
    };
  };

  // Check if two rectangles overlap
  const rectsOverlap = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  // Check collisions
  const checkCollisions = () => {
    const playerHitbox = getPlayerHitbox();
    
    // Check enemy collisions
    const newEnemies = [...enemies];
    for (let i = newEnemies.length - 1; i >= 0; i--) {
      const enemy = newEnemies[i];
      const enemyHitbox = {
        x: enemy.x,
        y: enemy.y - enemy.height,
        width: enemy.width,
        height: enemy.height
      };
      
      if (rectsOverlap(playerHitbox, enemyHitbox)) {
        // Collision with enemy - lose heart
        thudAudio.current?.play().catch(() => {});
        loseHeart();
        
        // Visual feedback for taking damage
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Flash red overlay
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            
            // Shake effect using CSS animation
            canvas.classList.add('screen-shake');
            setTimeout(() => {
              canvas.classList.remove('screen-shake');
            }, 300);
          }
        }
        
        newEnemies.splice(i, 1);
      } else if (
        (enemy.speed > 0 && enemy.x > canvasSize.width) || 
        (enemy.speed < 0 && enemy.x + enemy.width < 0)
      ) {
        // Enemy went off screen
        newEnemies.splice(i, 1);
      }
    }
    setEnemies(newEnemies);
    
    // Check spray collisions
    const newSprays = [...sprays];
    for (let i = newSprays.length - 1; i >= 0; i--) {
      const spray = newSprays[i];
      const sprayHitbox = {
        x: spray.x,
        y: spray.y,
        width: spray.width,
        height: spray.height
      };
      
      if (rectsOverlap(playerHitbox, sprayHitbox)) {
        // Collision with spray - get points
        dingAudio.current?.play().catch(() => {});
        setScore(prev => prev + POINTS_FOR_SPRAY);
        
        // Create floating point animation at collision location
        createFloatingScoreText(spray.x + spray.width / 2, spray.y, `+${POINTS_FOR_SPRAY}`);
        
        newSprays.splice(i, 1);
      } else if (spray.y > canvasSize.height) {
        // Spray went off screen
        newSprays.splice(i, 1);
      }
    }
    setSprays(newSprays);
  };

  // Function to create floating score animation
  const createFloatingScoreText = (x: number, y: number, text: string) => {
    if (!canvasRef.current) return;
    
    const floatingText = document.createElement('div');
    floatingText.className = 'absolute pointer-events-none z-50 font-bold text-xl text-green-500 retro-hud score-float';
    floatingText.textContent = text;
    floatingText.style.left = `${x}px`;
    floatingText.style.top = `${y}px`;
    
    document.getElementById('floating-score-container')?.appendChild(floatingText);
    
    // Remove the element after animation completes
    setTimeout(() => {
      floatingText.remove();
    }, 1200);
  };

  // Game loop
  useEffect(() => {
    if (!running || !canvasSize.width) return () => {};
    
    function loop() {
      // Move enemies horizontally
      setEnemies(prev => 
        prev
          .map(enemy => ({ ...enemy, x: enemy.x + enemy.speed }))
          .filter(enemy => 
            (enemy.speed > 0 && enemy.x < canvasSize.width + enemy.width) || 
            (enemy.speed < 0 && enemy.x > -enemy.width)
          )
      );
      
      // Move sprays downward (falling from the sky)
      setSprays(prev => 
        prev
          .map(spray => ({ ...spray, y: spray.y + SPRAY_SPEED }))
          .filter(spray => spray.y < canvasSize.height + spray.height)
      );
      
      // Check collisions
      checkCollisions();
      
      // Draw everything
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Draw background
      if (backgroundImageRef.current) {
        ctx.drawImage(
          backgroundImageRef.current,
          0,
          0,
          canvasSize.width,
          canvasSize.height
        );
      } else {
        // Fallback background if image not loaded
        ctx.fillStyle = '#78a86c';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      }
      
      // Draw enemies
      enemies.forEach(enemy => {
        let img = null;
        if (enemy.type === 'rat' && ratImageRef.current) {
          img = ratImageRef.current;
        } else if ((enemy.type === 'roach1' || enemy.type === 'roach2') && roach1ImageRef.current && roach2ImageRef.current) {
          if (enemy.type === 'roach1') {
            img = roachFrame === 1 ? roach1ImageRef.current : roach2ImageRef.current;
          } else {
            img = roachFrame === 2 ? roach1ImageRef.current : roach2ImageRef.current;
          }
        }
        
        if (img) {
          ctx.save();
          // Flip image based on direction of movement
          if (enemy.speed < 0) {
            ctx.scale(-1, 1);
            // Ensure correct positioning when flipped
            ctx.drawImage(img, -enemy.x - enemy.width, enemy.y - enemy.height, enemy.width, enemy.height);
          } else {
            // Normal drawing for enemies moving right
            ctx.drawImage(img, enemy.x, enemy.y - enemy.height, enemy.width, enemy.height);
          }
          ctx.restore();
        } else {
          // Draw placeholder if image not loaded
          ctx.fillStyle = enemy.type === 'rat' ? 'brown' : 'black';
          ctx.fillRect(enemy.x, enemy.y - enemy.height, enemy.width, enemy.height);
        }
      });
      
      // Draw sprays
      sprays.forEach(spray => {
        if (sprayImageRef.current) {
          // Draw spray falling from sky
          ctx.drawImage(
            sprayImageRef.current,
            spray.x,
            spray.y,
            spray.width,
            spray.height
          );
        } else {
          // Draw placeholder if image not loaded
          ctx.fillStyle = '#1e88e5';
          ctx.fillRect(spray.x, spray.y, spray.width, spray.height);
        }
      });
      
      // Draw player
      if (playerImageRef.current) {
        ctx.drawImage(
          playerImageRef.current,
          playerX - PLAYER_WIDTH / 2,
          playerY - PLAYER_HEIGHT,
          PLAYER_WIDTH,
          PLAYER_HEIGHT
        );
      } else {
        // Draw placeholder if image not loaded
        ctx.fillStyle = 'red';
        ctx.fillRect(playerX - PLAYER_WIDTH / 2, playerY - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(loop);
    }
    
    animationRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [running, canvasSize.width, canvasSize.height, playerX, playerY, enemies, sprays, roachFrame]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <HUD 
        minigameScore={score} 
        minigameInstruction="Avoid cockroaches and rats. Collect spray cans!" 
        remainingTime={Math.ceil(timeLeft / 1000)}
      />
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: 'none' }}
      />
      
      {/* Container for floating score animations */}
      <div id="floating-score-container" className="fixed pointer-events-none z-50 inset-0">
        {/* Floating score elements will be appended here */}
      </div>
    </div>
  );
} 