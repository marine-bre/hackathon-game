import { useGameStore, GameStore, Collectible } from '../lib/gameStore';
import { useEffect, useState } from 'react';

const heartIcon = '❤️';
const emptyHeartIcon = '🤍';
const hummusIcon = '🥣';
const falafelIcon = '🥙';

type HUDProps = {
  minigameScore?: number;
  minigameInstruction?: string;
  extraTopMargin?: boolean;
  remainingTime?: number;
  neighborhoodName?: string | null;
  showEscHint?: boolean;
};

// Animation for score changes
const ScoreDisplay = ({ score }: { score: number }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pointsGained, setPointsGained] = useState(0);
  
  useEffect(() => {
    if (score !== prevScore) {
      const gained = score - prevScore;
      setPointsGained(gained);
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevScore(score);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);
  
  return (
    <div className="relative flex items-center h-full justify-center">
      <div className={`transition-all duration-300 ${isAnimating ? 'scale-110 text-yellow-500 font-bold' : ''}`}>
        Score: {score}/100
      </div>
      
      {isAnimating && pointsGained > 0 && (
        <div className="absolute -right-10 -top-8 flex flex-col items-center">
          <div className="score-float text-green-500 font-bold text-lg drop-shadow-md">
            +{pointsGained}
          </div>
          <div className="score-float delay-100 text-yellow-500 text-sm drop-shadow-lg">
            ⭐
          </div>
        </div>
      )}
    </div>
  );
};

// Heart with animation
const Heart = ({ filled, animated }: { filled: boolean, animated: boolean }) => {
  return (
    <span 
      className={`inline-flex items-center justify-center transition-all duration-300 filter drop-shadow-md ${
        animated && filled ? 'scale-125 animate-pulse' : 
        animated && !filled ? 'scale-75 opacity-50' : ''
      }`} 
      style={{ color: filled ? '#e63946' : '#ffeaea', fontSize: 28 }}
    >
      {filled ? heartIcon : emptyHeartIcon}
    </span>
  );
};

const TimeWheel = ({ remainingTime = 30 }: { remainingTime: number }) => {
  const size = 80;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const progress = Math.max(0, Math.min(1, remainingTime / 30));
  const angle = 2 * Math.PI * progress;
  
  // Color changes based on time
  let color = '#22c55e'; // green
  let bgColor = 'rgba(255, 255, 255, 0.85)';
  
  // Flashing animation for low time
  const [isFlashing, setIsFlashing] = useState(false);
  
  useEffect(() => {
    if (remainingTime <= 5) {
      // Create flashing effect for critical time
      const flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 500);
      return () => clearInterval(flashInterval);
    } else {
      setIsFlashing(false);
    }
  }, [remainingTime]);
  
  if (remainingTime <= 5)
    color = isFlashing ? '#ef4444' : '#fecaca'; // Flashing between red and light red
  else if (remainingTime <= 10) 
    color = '#eab308'; // yellow
    
  return (
    <div className={`
      transition-all duration-300 rounded-full shadow-md backdrop-blur-sm border border-white/30
      ${remainingTime <= 5 ? 'scale-110' : ''}
    `}>
      <svg
        width={size}
        height={size}
        className={`rounded-full ${remainingTime <= 5 ? 'shadow-lg shadow-red-500/50' : ''}`}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0004" />
          </filter>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill={bgColor}
        />
        <path
          d={`M${center},${center} m0,-${radius} a${radius},${radius} 0 1,1 0,${radius * 2} a${radius},${radius} 0 1,1 0,-${radius * 2}`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${angle * radius} ${2 * Math.PI * radius}`}
          strokeDashoffset={0}
          style={{ transition: 'stroke 0.2s, stroke-dasharray 0.2s' }}
          filter="url(#shadow)"
        />
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          fontSize="28"
          fill="#222"
          fontWeight="bold"
          className={remainingTime <= 5 ? 'animate-pulse' : ''}
        >
          {Math.ceil(remainingTime)}
        </text>
      </svg>
    </div>
  );
};

const HUD = ({
  minigameScore,
  minigameInstruction,
  extraTopMargin = false,
  remainingTime,
  neighborhoodName,
  showEscHint = true,
}: HUDProps) => {
  const health = useGameStore((s: GameStore) => s.health);
  const collectedItems = useGameStore((s: GameStore) => s.collectedItems);
  const gameState = useGameStore((s: GameStore) => s.gameState);
  
  // Track heart changes for animation
  const [prevHearts, setPrevHearts] = useState(health.permanentHearts);
  const [animatedHeartIndex, setAnimatedHeartIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (health.permanentHearts !== prevHearts) {
      // Determine which heart changed
      const changedIndex = health.permanentHearts > prevHearts 
        ? health.permanentHearts - 1 // Added heart
        : prevHearts - 1; // Lost heart
      
      setAnimatedHeartIndex(changedIndex);
      
      // Reset animation after delay
      const timer = setTimeout(() => {
        setAnimatedHeartIndex(null);
        setPrevHearts(health.permanentHearts);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [health.permanentHearts, prevHearts]);

  return (
    <>
      {/* Main HUD container with modern style and strategic positioning */}
      <div
        className={`retro-hud pointer-events-none fixed top-0 left-0 z-50 w-full p-4 
          ${extraTopMargin ? 'mt-32 md:mt-40' : ''}`}
      >
        {/* ESC Key Hint - positioned in top left corner */}
        {gameState === 'minigame' && showEscHint && (
          <div 
            className="retro-hud-panel pointer-events-auto absolute top-4 left-4 rounded-lg bg-white/85 px-3 py-1.5 text-sm font-bold text-gray-800 shadow-md flex items-center gap-1 z-10 backdrop-blur-sm border border-white/30"
          >
            <span className="hidden sm:inline">Press</span> 
            <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold">ESC</kbd> 
            <span className="hidden sm:inline">to return to map</span>
          </div>
        )}
        
        {/* Timer - positioned in top right corner */}
        {remainingTime !== undefined && (
          <div className="absolute top-4 right-4 z-10">
            <TimeWheel remainingTime={remainingTime} />
          </div>
        )}
      
        {/* Centered content with modern styling */}
        <div className="flex flex-col items-center gap-4 mx-auto max-w-3xl mt-6">
          {/* First row: Neighborhood name (context) */}
          {neighborhoodName && (
            <div className="retro-hud-panel pointer-events-auto rounded-lg bg-white/85 px-5 py-2 text-lg font-bold text-gray-800 shadow-md backdrop-blur-sm border border-white/30">
              {neighborhoodName}
            </div>
          )}
          
          {/* Second row: Game instruction */}
          {minigameInstruction && (
            <div className="retro-hud-panel rounded-lg bg-white/85 px-5 py-3 text-base md:text-lg font-bold text-gray-800 shadow-md text-center max-w-lg mx-auto backdrop-blur-sm border border-white/30">
              {minigameInstruction}
            </div>
          )}
          
          {/* Third row: Lives and Score on the same line */}
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Hearts (lives) */}
            <div className="retro-hud-panel pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-white/85 rounded-lg shadow-md backdrop-blur-sm border border-white/30 h-[50px]">
              {Array.from({ length: 5 }).map((_, i: number) => (
                <Heart 
                  key={i} 
                  filled={i < health.permanentHearts} 
                  animated={animatedHeartIndex === i}
                />
              ))}
            </div>
            
            {/* Score */}
            {typeof minigameScore === 'number' && (
              <div className="retro-hud-panel flex items-center rounded-lg bg-white/85 px-4 py-2.5 text-base font-bold text-blue-700 shadow-md backdrop-blur-sm border border-white/30 h-[50px]">
                <ScoreDisplay score={minigameScore} />
              </div>
            )}
          </div>
          
          {/* Fourth row: Collectibles */}
          {collectedItems.length > 0 && (
            <div className="retro-hud-panel flex gap-2 pointer-events-auto bg-white/85 rounded-lg shadow-md px-4 py-2 backdrop-blur-sm border border-white/30">
              {collectedItems.map((item: Collectible, i: number) => (
                <span 
                  key={i} 
                  className="text-2xl transition-transform hover:scale-110"
                >
                  {item === 'hummus' ? hummusIcon : falafelIcon}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Floating score indicator (when score changes) */}
      <div id="floating-score-container" className="fixed pointer-events-none z-50 inset-0">
        {/* Floating score notifications will appear here via DOM manipulation */}
      </div>
    </>
  );
};

export default HUD;
