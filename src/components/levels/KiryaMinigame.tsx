import { useEffect, useRef, useState } from 'react';
import { useGameStore, GameStore } from '../../lib/gameStore';

// Custom HUD component specifically for KiryaMinigame (no yellow dots)
const KiryaHUD = ({ 
  collectedDocuments, 
  timeLeft 
}: { 
  collectedDocuments: string[];
  timeLeft: number;
}) => {
  // Only use permanent hearts
  const permanentHearts = useGameStore((s: GameStore) => s.health.permanentHearts);

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-50 flex w-full flex-col items-center gap-4 p-6">
      <div className="pointer-events-auto mb-6 flex flex-col items-center gap-2">
        <div className="rounded bg-white/90 px-8 py-3 text-2xl font-bold text-gray-900 shadow">
          Collect all 3 government documents at Kiryat HaMemshala!
        </div>
        <div className="rounded bg-white/90 px-8 py-3 text-xl font-bold text-red-600 shadow">
          Avoid the security guards!
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
      
      {/* Documents counter */}
      <div className="pointer-events-auto rounded bg-white/90 px-8 py-3 text-xl font-bold text-gray-900 shadow">
        {collectedDocuments.length} / 3 Documents Collected
      </div>
      
      {/* Timer */}
      <div className="pointer-events-auto mt-2 rounded bg-white/90 px-8 py-2 text-lg font-bold shadow" style={{ color: timeLeft <= 5000 ? '#ff0000' : '#333' }}>
        Time: {Math.ceil(timeLeft / 1000)}s
      </div>
    </div>
  );
};

type KiryaMinigameProps = {
  onWin: () => void;
  onLose: () => void;
};

// Documents that need to be collected
const DOCUMENTS = {
  passport: '/Passport.png',
  insurance: '/bituach-leumi.png',
  taxRefund: '/tax-refund.png',
};

// Game duration in milliseconds
const GAME_DURATION = 8000; // 8 seconds (reduced from 10)

// Time each document stays in one position before moving or hiding
const DOCUMENT_STAY_DURATION = 400; // 0.4 seconds (reduced from 0.5)
const DOCUMENT_HIDE_DURATION = 400; // 0.4 seconds (increased from 0.3)

// Guard constants
const PLAYER_RADIUS = 24;
const GUARD_MIN_SIZE = 80;
const GUARD_MAX_SIZE = 120;
const GUARD_SPEED = 4; // Horizontal speed (increased from 3)
const GUARD_SPAWN_INTERVAL = 1500; // 1.5 seconds between guard spawns (reduced from 2)
const GUARD_VISIBLE_DURATION = 3500; // Guards visible for 3.5 seconds (increased from 3)

// Additional hard mode settings
const MAX_GUARDS_ON_SCREEN = 5; // Maximum number of guards that can be on screen at once
const SMALL_DOCUMENT_SCALE = 0.8; // Make documents smaller and harder to click

export default function KiryaMinigame({ onWin, onLose }: KiryaMinigameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [running, setRunning] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [collectedDocuments, setCollectedDocuments] = useState<string[]>([]);
  const [lifeLost, setLifeLost] = useState(false);
  const animationRef = useRef<number>();
  
  // Images
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const documentImagesRef = useRef<Record<string, HTMLImageElement | null>>({});
  const guardImageRef = useRef<HTMLImageElement | null>(null);
  const glowEffectRef = useRef<HTMLImageElement | null>(null);
  
  // Collection effect animation
  const [collectionEffect, setCollectionEffect] = useState<{
    x: number;
    y: number;
    type: string;
    startTime: number;
    duration: number;
  } | null>(null);
  
  // Document positions - one of each type
  const [documents, setDocuments] = useState<
    { 
      x: number; 
      y: number; 
      type: string; 
      spawnTime: number; 
      collected: boolean; 
      lastMoved: number;
      visible: boolean;
      scale: number; // For random sizing to make harder
    }[]
  >([]);
  
  // Security guards
  const [guards, setGuards] = useState<
    { 
      x: number; 
      y: number; 
      size: number; 
      spawnTime: number;
      direction: number; // 1 = right, -1 = left
      visible: boolean;
      visibleUntil: number;
      speed: number; // Variable speed for different guards
    }[]
  >([]);

  const selectedCharacter = useGameStore(s => s.selectedCharacter);
  const loseHeart = useGameStore((s: GameStore) => s.loseHeart);
  const hearts = useGameStore((s: GameStore) => s.health.permanentHearts);
  const setGameState = useGameStore(s => s.setGameState);
  const permanentHearts = useGameStore((s: GameStore) => s.health.permanentHearts); // For UI display

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

  // Random position within canvas
  const randomPosition = () => {
    const margin = 100; // Keep documents away from edges
    return {
      x: Math.random() * (canvasSize.width - 2 * margin) + margin,
      y: Math.random() * (canvasSize.height - 2 * margin) + margin,
    };
  };
  
  // Random guard size
  const randomGuardSize = () => {
    return Math.floor(Math.random() * (GUARD_MAX_SIZE - GUARD_MIN_SIZE + 1)) + GUARD_MIN_SIZE;
  };
  
  // Random Y position for guards
  const randomGuardY = () => {
    // Keep guards away from the very top and bottom
    const margin = 150;
    return Math.random() * (canvasSize.height - 2 * margin) + margin;
  };
  
  // Random document scale (for hard mode)
  const randomDocumentScale = () => {
    return SMALL_DOCUMENT_SCALE + (Math.random() * 0.2); // Between 0.8 and 1.0
  };
  
  // Random guard speed (for hard mode)
  const randomGuardSpeed = () => {
    return GUARD_SPEED + (Math.random() * 2); // Between base speed and +2
  };

  // Load images: player, documents, guards, and background
  useEffect(() => {
    if (!selectedCharacter) return;

    // Load player image
    const playerImg = new Image();
    playerImg.src = characterImages[selectedCharacter];
    playerImg.onload = () => {
      playerImageRef.current = playerImg;
    };

    // Load document images
    Object.entries(DOCUMENTS).forEach(([type, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        documentImagesRef.current[type] = img;
      };
    });

    // Load security guard image
    const guardImg = new Image();
    guardImg.src = '/security.png';
    guardImg.onload = () => {
      guardImageRef.current = guardImg;
    };

    // Load background image
    const bgImg = new Image();
    bgImg.src = '/Kiryat hamemshala.png';
    bgImg.onload = () => {
      backgroundImageRef.current = bgImg;
    };

    // Load glow effect
    const glowImg = new Image();
    glowImg.src = '/boom.png'; // Reusing boom image for glow effect
    glowImg.onload = () => {
      glowEffectRef.current = glowImg;
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

  // Initialize one of each document type
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    // Set start time on first render
    if (startTime === 0) {
      setStartTime(Date.now());
      
      // Initialize all three document types at the start
      const documentTypes = Object.keys(DOCUMENTS);
      const now = Date.now();
      
      const initialDocuments = documentTypes.map(type => {
        const { x, y } = randomPosition();
        return {
          x,
          y,
          type,
          spawnTime: now,
          collected: false,
          lastMoved: now,
          visible: true,
          scale: randomDocumentScale() // Random smaller scale for harder mode
        };
      });
      
      setDocuments(initialDocuments);
    }
  }, [running, canvasSize.width, startTime]);
  
  // Periodically move and hide/show documents
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    const moveInterval = setInterval(() => {
      const now = Date.now();
      
      setDocuments(docs => 
        docs.map(doc => {
          if (doc.collected) return doc;
          
          // Time since last position change
          const timeSinceLastMove = now - doc.lastMoved;
          
          // If document is visible and has been showing long enough
          if (doc.visible && timeSinceLastMove >= DOCUMENT_STAY_DURATION) {
            return {
              ...doc,
              visible: false, // Hide it
              lastMoved: now
            };
          }
          
          // If document is hidden and has been hidden long enough
          if (!doc.visible && timeSinceLastMove >= DOCUMENT_HIDE_DURATION) {
            const { x, y } = randomPosition(); // New random position
            return {
              ...doc,
              x,
              y,
              visible: true, // Show it again
              lastMoved: now,
              scale: randomDocumentScale() // New random scale each time
            };
          }
          
          return doc;
        })
      );
    }, 100); // Check frequently
    
    return () => clearInterval(moveInterval);
  }, [running, canvasSize.width]);
  
  // Spawn security guards
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    const spawnGuard = () => {
      // Don't spawn more than MAX_GUARDS_ON_SCREEN
      if (guards.length >= MAX_GUARDS_ON_SCREEN) return;
      
      const guardSize = randomGuardSize();
      const direction = Math.random() > 0.5 ? 1 : -1; // Randomly go left or right
      // Start position: left side of screen if going right, right side if going left
      const x = direction === 1 ? -guardSize : canvasSize.width + guardSize;
      const y = randomGuardY();
      const now = Date.now();
      
      setGuards(guards => [
        ...guards,
        { 
          x, 
          y, 
          size: guardSize, 
          spawnTime: now,
          direction,
          visible: true,
          visibleUntil: now + GUARD_VISIBLE_DURATION,
          speed: randomGuardSpeed() // Random speed for each guard
        }
      ]);
    };
    
    // Initial spawn
    spawnGuard();
    
    // Spawn guards periodically
    const intervalId = setInterval(spawnGuard, GUARD_SPAWN_INTERVAL);
    return () => clearInterval(intervalId);
  }, [running, canvasSize.width, guards.length]);

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
        setTimeout(onLose, 400);
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
    
    return () => clearInterval(timerInterval);
  }, [running, startTime, onLose]);

  // Game loop - move guards horizontally and update visibility
  useEffect(() => {
    if (!running || !canvasSize.width) return () => {};
    
    function loop() {
      const now = Date.now();
      
      // Move guards horizontally and check if they're off screen
      setGuards(guards => 
        guards
          .map(guard => {
            // Update visibility based on time
            const visible = now < guard.visibleUntil;
            
            // Update position using individual guard speed
            const newX = guard.x + (guard.direction * guard.speed);
            
            return { 
              ...guard, 
              x: newX,
              visible
            };
          })
          // Remove guards that have moved off screen
          .filter(guard => {
            if (guard.direction === 1) {
              // Going right - remove if past right edge
              return guard.x < canvasSize.width + guard.size;
            } else {
              // Going left - remove if past left edge
              return guard.x > -guard.size;
            }
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
      ctx.fillStyle = 'rgba(245, 245, 220, 0.3)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    } else {
      // Fallback background
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

    // Draw security guards (only if visible)
    for (const guard of guards) {
      if (!guard.visible) continue; // Skip if not visible
      
      if (guardImageRef.current) {
        const guardHeight = guard.size;
        const aspectRatio = guardImageRef.current.width / guardImageRef.current.height;
        const guardWidth = guardHeight * aspectRatio;
        
        // Flip the image if moving left
        ctx.save();
        if (guard.direction === -1) {
          ctx.translate(guard.x, guard.y);
          ctx.scale(-1, 1);
          ctx.drawImage(
            guardImageRef.current,
            -guardWidth / 2,
            -guardHeight / 2,
            guardWidth,
            guardHeight
          );
        } else {
          ctx.drawImage(
            guardImageRef.current,
            guard.x - guardWidth / 2,
            guard.y - guardHeight / 2,
            guardWidth,
            guardHeight
          );
        }
        ctx.restore();
      } else {
        // Simple fallback circle if image somehow fails to load
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, guard.size / 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
        
        ctx.font = `${Math.floor(guard.size / 5)}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GUARD', guard.x, guard.y);
      }
    }

    // Draw documents (only if visible)
    for (const doc of documents) {
      if (doc.collected || !doc.visible) continue; // Skip if collected or not visible
      
      const docImg = documentImagesRef.current[doc.type];
      if (docImg) {
        const baseDocSize = 80;
        const docSize = baseDocSize * doc.scale; // Apply scale factor
        const aspectRatio = docImg.width / docImg.height;
        const docWidth = docSize * aspectRatio;
        
        // Add a subtle pulse/scale animation
        const now = Date.now();
        const pulseScale = 1 + 0.1 * Math.sin((now - doc.spawnTime) / 300);
        
        ctx.save();
        ctx.translate(doc.x, doc.y);
        ctx.scale(pulseScale, pulseScale);
        ctx.drawImage(
          docImg,
          -docWidth / 2,
          -docSize / 2,
          docWidth,
          docSize
        );
        ctx.restore();
      } else {
        // Fallback circle if image not loaded
        ctx.beginPath();
        ctx.arc(doc.x, doc.y, 25 * doc.scale, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0c066';
        ctx.fill();
      }
    }

    // Draw collection effect animation if active
    if (collectionEffect && glowEffectRef.current) {
      const now = Date.now();
      const elapsed = now - collectionEffect.startTime;
      
      if (elapsed < collectionEffect.duration) {
        // Calculate scale for expanding effect
        const progress = elapsed / collectionEffect.duration;
        const scale = 1 + progress * 1.5;
        const alpha = 1 - progress;
        
        // Draw glow effect
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(collectionEffect.x, collectionEffect.y);
        ctx.scale(scale, scale);
        
        // Draw glow behind
        const glowSize = 120;
        ctx.drawImage(
          glowEffectRef.current, 
          -glowSize / 2, 
          -glowSize / 2, 
          glowSize, 
          glowSize
        );
        
        // Draw collected document on top
        const docImg = documentImagesRef.current[collectionEffect.type];
        if (docImg) {
          const docSize = 80;
          const aspectRatio = docImg.width / docImg.height;
          const docWidth = docSize * aspectRatio;
          
          ctx.drawImage(
            docImg,
            -docWidth / 2,
            -docSize / 2,
            docWidth,
            docSize
          );
        }
        
        ctx.restore();
      } else {
        // Effect is over
        setCollectionEffect(null);
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
    documents,
    playerX,
    playerY,
    selectedCharacter,
    canvasSize,
    collectedDocuments,
    timeLeft,
    collectionEffect,
    guards
  ]);

  // Collision detection & win/lose logic
  useEffect(() => {
    if (!running || !canvasSize.width) return;
    
    // Calculate player hitbox - slightly smaller than visual for better gameplay
    const playerHitboxRadius = PLAYER_RADIUS * 0.8;
    
    // Player collision with documents
    setDocuments(docs => 
      docs.map(doc => {
        if (doc.collected || !doc.visible) return doc;
        
        const dx = doc.x - playerX;
        const dy = doc.y - playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Scale the hit area based on the document scale (smaller docs = harder to hit)
        const docHitboxRadius = 30 * doc.scale;
        
        if (dist < playerHitboxRadius + docHitboxRadius) {
          // Document collected
          if (!collectedDocuments.includes(doc.type)) {
            setCollectedDocuments(prev => [...prev, doc.type]);
            
            // Start collection effect animation
            setCollectionEffect({
              x: doc.x,
              y: doc.y,
              type: doc.type,
              startTime: Date.now(),
              duration: 800, // Animation lasts 800ms
            });
          }
          return { ...doc, collected: true, visible: false };
        }
        return doc;
      })
    );
    
    // Check collisions with guards
    if (!lifeLost) {
      for (const guard of guards) {
        if (!guard.visible) continue; // Skip if guard is not visible
        
        const dx = guard.x - playerX;
        const dy = guard.y - playerY;
        const guardHitboxRadius = guard.size / 3; // Make hitbox smaller than visual
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < playerHitboxRadius + guardHitboxRadius) {
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
    
    // Win condition: all 3 documents collected
    if (collectedDocuments.length === 3) {
      setRunning(false);
      setTimeout(onWin, 400);
    }
  }, [
    documents,
    playerX,
    playerY,
    onWin,
    onLose,
    running,
    collectedDocuments,
    canvasSize,
    guards,
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
        background: '#f5f5dc',
        zIndex: 1000,
        cursor: 'none',
      }}
    >
      <KiryaHUD 
        collectedDocuments={collectedDocuments} 
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