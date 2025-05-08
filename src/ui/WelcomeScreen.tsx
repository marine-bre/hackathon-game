import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '../lib/gameStore';

// Add keyframes for animations
const glowKeyframes = `
  @keyframes pulse-glow {
    0% { filter: drop-shadow(0 0 15px rgba(66, 153, 225, 0.6)); }
    50% { filter: drop-shadow(0 0 20px rgba(66, 153, 225, 0.9)); }
    100% { filter: drop-shadow(0 0 15px rgba(66, 153, 225, 0.6)); }
  }

  @keyframes float {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(1deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }

  @keyframes sparkle {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes button-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;

const characters = [
  {
    id: 'nimrod',
    name: 'Nimarod',
    description: 'The Hipster from Florentin',
    imagePath: '/HIP.PNG',
  },
  {
    id: 'liat',
    name: 'Liat',
    description: 'The Push from Neve Tzedek',
    imagePath: '/POSH.png',
  },
  {
    id: 'reuven',
    name: 'Reuven',
    description: 'The Old Yemenite from the Kerem',
    imagePath: '/YEMANI.PNG',
  },
  {
    id: 'josef',
    name: 'Josef',
    description: 'The Novorich from Kohav Hatzafon',
    imagePath: '/NEVORISH.png',
  },
  {
    id: 'hila',
    name: 'Hila',
    description: 'The Pilates Mom from the Old North',
    imagePath: '/MOM.png',
  },
];

type Character = (typeof characters)[number];

export function WelcomeScreen() {
  const [selected, setSelected] = useState<Character | null>(null);
  const setSelectedCharacter = useGameStore((s) => s.setSelectedCharacter);
  const setGameState = useGameStore((s) => s.setGameState);
  const [sparkles, setSparkles] = useState<{ left: number; top: number; size: number; delay: number }[]>([]);

  // Create sparkle effect when a character is selected
  useEffect(() => {
    if (selected) {
      const newSparkles = Array.from({ length: 12 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 3 + Math.random() * 7,
        delay: Math.random() * 1500,
      }));
      setSparkles(newSparkles);
    }
  }, [selected]);

  const handleStart = () => {
    if (selected) {
      setSelectedCharacter(selected.id as import('../lib/gameStore').CharacterId);
      setGameState('map');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-gradient-to-br from-yellow-100 to-blue-200 p-6 pb-[120px]">
      {/* Inject keyframes */}
      <style>{glowKeyframes}</style>
      
      <h1 className="mt-24 mb-12 text-5xl font-bold" style={{ fontFamily: 'Avenir, sans-serif' }}>
        Survive Tel Aviv
      </h1>

      <p className="mb-24 max-w-xl text-center text-lg">
        Tel Aviv is loud, fast, sweaty, buggy (literally) — and we wouldn't change a thing.
        Avoid everything, win nothing, maybe get Wolt.
      </p>

      {/* Character carousel - responsive for mobile */}
      <div className="mb-24 flex w-full flex-col justify-center gap-16 md:flex-row md:gap-10">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`relative flex transform cursor-pointer flex-col items-center transition-all duration-500 ${
              selected?.id === char.id ? 'scale-110 z-10' : 'scale-90 opacity-70 hover:opacity-90 hover:scale-95'
            }`}
            onClick={() => setSelected(char)}
          >
            {/* Character image with animated effects when selected */}
            <div 
              className="relative h-[250px] md:h-[400px]"
              style={{
                animation: selected?.id === char.id ? 'float 3s ease-in-out infinite' : 'none',
                position: 'relative',
              }}
            >
              {/* Glow effect background */}
              {selected?.id === char.id && (
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    animation: 'pulse-glow 2s infinite ease-in-out',
                    borderRadius: '50%',
                    zIndex: -1
                  }}
                />
              )}
              
              {/* Character image */}
              <img 
                src={char.imagePath} 
                alt={char.name} 
                className="h-full object-contain" 
                style={{
                  transition: 'all 0.3s ease-in-out',
                  filter: selected?.id === char.id ? 'contrast(1.1) brightness(1.05)' : 'none'
                }}
              />
              
              {/* Sparkle effects */}
              {selected?.id === char.id && sparkles.map((sparkle, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-full"
                  style={{
                    left: `${sparkle.left}%`,
                    top: `${sparkle.top}%`,
                    height: `${sparkle.size}px`,
                    width: `${sparkle.size}px`,
                    opacity: 0,
                    animation: `sparkle 1.5s infinite ${sparkle.delay}ms`,
                    boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.8)'
                  }}
                />
              ))}
            </div>

            {/* Character name with enhanced styling */}
            <h3
              className={`mt-6 text-center text-xl md:text-2xl transition-all duration-300 ${
                selected?.id === char.id 
                  ? 'text-blue-600 font-bold scale-110' 
                  : ''
              }`}
              style={{ 
                fontFamily: 'Avenir, sans-serif',
                textShadow: selected?.id === char.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              {char.name}
            </h3>

            {/* Character description with fade-in animation */}
            <p 
              className={`mt-2 max-w-xs text-center text-gray-700 transition-opacity duration-300 ${
                selected?.id === char.id ? 'opacity-100' : 'opacity-0'
              }`} 
              style={{ 
                animation: selected?.id === char.id ? 'fadeIn 0.5s ease-in-out forwards' : 'none'
              }}
            >
              {char.description}
            </p>
          </div>
        ))}
      </div>

      {/* Start button with pulse animation when character is selected */}
      <div className="fixed right-0 bottom-10 left-0 flex justify-center">
        <Button
          className={`px-20 py-8 text-2xl transition-all duration-500 ${
            selected ? 'shadow-lg shadow-blue-300/50' : ''
          }`}
          disabled={!selected}
          size="lg"
          onClick={handleStart}
          style={{
            animation: selected ? 'button-pulse 2s infinite' : 'none'
          }}
        >
          Start Adventure
        </Button>
      </div>
    </div>
  );
}
