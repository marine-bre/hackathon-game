import { useEffect, useState } from 'react';
import { useGameStore } from '../lib/gameStore';

type BusTransitionProps = {
  onComplete: () => void;
};

// Mapping of character IDs to image paths
const characterImages = {
  nimrod: '/HIP.PNG',
  liat: '/POSH.png',
  reuven: '/YEMANI.PNG',
  josef: '/NEVORISH.png',
  hila: '/MOM.png',
};

// Mapping of areas to minigame types - copied from MapScreen for consistency
const AREA_TO_MINIGAME: Record<string, string> = {
  Florentin: 'Florentin',
  'Old North': 'Old North',
  Kerem: 'Kerem',
  parkHaMesilah: 'Park Hamesila',
  'Kiryat Hamemshala': 'Kiryat Hamemshala',
  rothschild: 'rothschild',
  'Tachana Merkazit': 'Tachana Merkazit',
  tayelet: 'tayelet',
  memadion: 'memadion',
};

const BusTransition = ({ onComplete }: BusTransitionProps) => {
  const selectedCharacter = useGameStore((s) => s.selectedCharacter);
  const selectedNeighborhood = useGameStore((s) => s.selectedNeighborhood);
  const selectedMinigame = useGameStore((s) => s.selectedMinigame);
  const setGameState = useGameStore((s) => s.setGameState);
  const setSelectedNeighborhood = useGameStore((s) => s.setSelectedNeighborhood);
  const [busPosition, setBusPosition] = useState(-800); // Start off-screen
  const [isCharacterLeaning, setIsCharacterLeaning] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    selectedNeighborhood,
    selectedMinigame,
    timestamp: new Date().toISOString(),
    fixApplied: false
  });
  
  // Ensure we have a valid neighborhood set before transition completes
  useEffect(() => {
    console.log("🔍 BusTransition mounted with:", { selectedNeighborhood, selectedMinigame });
    
    // Safety check - if neighborhood is missing but minigame is set, use that
    if (!selectedNeighborhood && selectedMinigame) {
      console.log(`📍 Setting neighborhood from minigame: ${selectedMinigame}`);
      // @ts-ignore - Type is fine for our use
      setSelectedNeighborhood(selectedMinigame);
    }
  }, [selectedNeighborhood, selectedMinigame, setSelectedNeighborhood]);
  
  // Emergency timeout to ensure we move to minigame state
  useEffect(() => {
    const timeout = setTimeout(() => {
      // If animation completed but we're still in BusTransition, force completion
      if (animationCompleted) {
        console.log("⚠️ Emergency timeout: forcing transition completion");
        onComplete();
      }
    }, 6000); // 6 second failsafe
    
    return () => clearTimeout(timeout);
  }, [animationCompleted, onComplete]);
  
  // Set up the animation sequence
  useEffect(() => {
    // Start bus animation after a delay
    const startDelay = setTimeout(() => {
      // Animate the bus passing by
      const busAnimation = setInterval(() => {
        setBusPosition(prev => {
          // When bus is completely off screen to the right, stop animation
          if (prev > window.innerWidth + 200) {
            clearInterval(busAnimation);
            return prev;
          }
          
          // When bus is near character, make character lean forward
          if (prev > (window.innerWidth * 0.3) - 200 && prev < (window.innerWidth * 0.3)) {
            setIsCharacterLeaning(true);
          } else if (prev > (window.innerWidth * 0.3) + 100) {
            setIsCharacterLeaning(false);
          }
          
          return prev + 10; // Slower speed of bus movement
        });
      }, 16); // ~60fps
      
      // Complete transition after bus passes (5 seconds)
      setTimeout(() => {
        console.log('Bus animation complete - calling onComplete()');
        setAnimationCompleted(true);
        onComplete(); // Always call onComplete to go to minigame
      }, 5000);
      
      return () => {
        clearInterval(busAnimation);
      };
    }, 1500);
    
    return () => {
      clearTimeout(startDelay);
    };
  }, [onComplete]);

  // Get the correct image path for the selected character
  const characterImage = selectedCharacter ? characterImages[selectedCharacter] : '';

  // Attempt to determine a display name for destination
  const destinationDisplay = selectedNeighborhood || 
    (selectedMinigame === 'Florentin' ? 'Florentin' : '...');

  // Immediate skip handler to force transition
  const handleEmergencySkip = () => {
    console.log("🔴 Emergency skip button pressed");
    setAnimationCompleted(true);
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 60%, #e5e5e5 60%, #e5e5e5 100%)',
      }}
    >
      {/* Add keyframes for animations */}
      <style>
        {`
          @keyframes waiting {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          
          @keyframes checkWatch {
            0%, 85%, 100% { transform: rotate(0deg); }
            90% { transform: rotate(20deg); }
          }
          
          @keyframes bustleAnimation {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          
          @keyframes leanForward {
            0% { transform: translateX(0) rotate(0deg); }
            100% { transform: translateX(15px) rotate(10deg); }
          }
          
          @keyframes waveHand {
            0%, 50%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-5px) rotate(-15deg); }
            75% { transform: translateY(-5px) rotate(-15deg); }
          }
        `}
      </style>

      {/* Scene container */}
      <div className="relative w-full h-full">
        {/* Debug info - show selected neighborhood */}
        <div className="absolute top-2 left-2 z-50 bg-white bg-opacity-80 p-2 rounded text-xs">
          <div>Destination: {destinationDisplay}</div>
          <div>Minigame: {selectedMinigame || 'None'}</div>
          <div>Character: {selectedCharacter || 'None'}</div>
          <div>Fix Applied: {debugInfo.fixApplied ? 'Yes' : 'No'}</div>
          <div>Time: {debugInfo.timestamp}</div>
        </div>
      
        {/* Sky and clouds */}
        <div className="absolute left-[10%] top-[15%] text-white opacity-80">
          <div className="absolute -top-10 left-20 h-16 w-32 rounded-full bg-white"></div>
          <div className="absolute -top-5 left-10 h-14 w-44 rounded-full bg-white"></div>
          <div className="absolute -top-8 left-0 h-12 w-28 rounded-full bg-white"></div>
        </div>

        <div className="absolute left-[70%] top-[25%] text-white opacity-80">
          <div className="absolute -top-10 left-0 h-16 w-32 rounded-full bg-white"></div>
          <div className="absolute -top-5 left-10 h-14 w-40 rounded-full bg-white"></div>
          <div className="absolute -top-8 left-30 h-12 w-28 rounded-full bg-white"></div>
        </div>

        {/* Bus stop structure */}
        <div className="absolute bottom-[40%] left-1/2 transform -translate-x-1/2">
          {/* Bus stop pole */}
          <div className="absolute -left-60 bottom-0 w-6 h-64 bg-gray-700"></div>
          <div className="absolute -left-80 bottom-64 w-50 h-20 bg-blue-600 rounded-t-lg shadow-lg flex items-center justify-center">
            <div className="text-white font-bold text-xl">5 דן</div>
          </div>
          
          {/* Bus stop bench */}
          <div className="absolute -left-40 bottom-0 w-80 h-10 bg-gray-400"></div>
          <div className="absolute -left-40 bottom-10 w-80 h-3 bg-gray-600"></div>
          <div className="absolute -left-40 bottom-13 w-80 h-24 bg-transparent border-r-4 border-l-4 border-gray-600"></div>
          <div className="absolute -left-40 bottom-37 w-80 h-3 bg-gray-600"></div>
          
          {/* Bus stop roof */}
          <div className="absolute -left-50 bottom-40 w-100 h-6 bg-gray-500 shadow-lg"></div>
        </div>

        {/* Character waiting at bus stop */}
        {characterImage && (
          <div 
            className="absolute bottom-[40%] left-[42%] transform -translate-x-1/2"
            style={{ 
              animation: isCharacterLeaning 
                ? 'leanForward 0.5s forwards' 
                : 'waiting 2s ease-in-out infinite',
              zIndex: 5, // Reduced to be behind the bus
              transformOrigin: 'bottom center'
            }}
          >
            <img 
              src={characterImage} 
              alt="Character waiting" 
              className="h-40 object-contain"
            />
            
            {/* Check watch animation when not leaning */}
            {!isCharacterLeaning && (
              <div 
                className="absolute top-10 right-0 w-8 h-8 bg-gray-300 rounded-full border-2 border-gray-500"
                style={{ animation: 'checkWatch 4s ease-in-out infinite' }}
              ></div>
            )}
            
            {/* Hand waving animation when leaning */}
            {isCharacterLeaning && (
              <div 
                className="absolute top-5 right-5 w-8 h-12 bg-transparent border-l-2 border-gray-500"
                style={{ 
                  animation: 'waveHand 0.5s ease-in-out infinite',
                  transformOrigin: 'top center'
                }}
              ></div>
            )}
          </div>
        )}

        {/* Animated Bus - FIXED ORIENTATION */}
        <div 
          className="absolute bottom-[40%]"
          style={{ 
            left: `${busPosition}px`,
            transition: 'left 0.1s linear',
            zIndex: 20 // Above character
          }}
        >
          {/* Bus body */}
          <div className="relative">
            {/* Main bus body */}
            <div 
              className="w-200 h-80 bg-gradient-to-b from-green-500 to-green-600 rounded-lg shadow-xl"
              style={{ 
                animation: 'bustleAnimation 0.2s infinite',
                borderTopLeftRadius: '30px',
                borderTopRightRadius: '30px',
              }}
            >
              {/* Bus front - FIXED ORIENTATION */}
              <div className="absolute top-6 right-4 w-40 h-30 bg-blue-200 rounded-tr-3xl"></div>
              
              {/* Bus side windows (a row of them) */}
              <div className="absolute top-6 left-10 w-140 h-30 flex space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-24 h-full bg-blue-200 rounded-sm"></div>
                ))}
              </div>
              
              {/* Bus door */}
              <div className="absolute top-40 right-30 w-16 h-36 bg-blue-300 border-2 border-blue-500"></div>
              
              {/* Bus wheels */}
              <div className="absolute -bottom-6 left-30 w-20 h-20 bg-gray-900 rounded-full border-4 border-gray-400"></div>
              <div className="absolute -bottom-6 right-30 w-20 h-20 bg-gray-900 rounded-full border-4 border-gray-400"></div>
              
              {/* Bus number display */}
              <div className="absolute top-10 right-20 w-40 h-16 bg-amber-300 rounded-md flex items-center justify-center">
                <div className="text-gray-900 font-bold text-3xl">5</div>
              </div>
              
              {/* Bus details */}
              <div className="absolute top-10 left-20 w-80 h-8 bg-white rounded flex items-center justify-center">
                <div className="text-gray-900 font-bold">Central Station → Jaffa</div>
              </div>
              
              {/* Bus decoration stripe */}
              <div className="absolute top-35 left-0 w-full h-4 bg-yellow-400"></div>
              
              {/* Stylized elements */}
              <div className="absolute top-45 left-20 w-6 h-6 bg-red-500 rounded-full"></div>
              <div className="absolute top-45 left-80 w-6 h-6 bg-blue-500 rounded-full"></div>
              <div className="absolute top-45 left-140 w-6 h-6 bg-yellow-500 rounded-full"></div>
              
              {/* Bus driver - FIXED POSITION */}
              <div className="absolute top-15 right-15 w-10 h-10 bg-orange-200 rounded-full"></div>
              <div className="absolute top-25 right-15 w-14 h-8 bg-blue-700"></div>
              
              {/* Bus driver's arm/hand gesturing "no stop" */}
              <div className="absolute top-18 right-25 w-2 h-10 bg-orange-200 transform rotate-45"></div>
            </div>
          </div>
        </div>

        {/* Road */}
        <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gray-700">
          {/* Road markings */}
          <div className="absolute top-1/2 left-0 w-full h-4 flex">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="h-full w-24 mx-8 bg-yellow-400"
              ></div>
            ))}
          </div>
        </div>

        {/* Message text */}
        <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 text-3xl font-bold text-white drop-shadow-lg">
          Waiting for the bus to {destinationDisplay}
        </div>
        
        {/* Expression of frustration when bus passes */}
        {isCharacterLeaning && (
          <div className="absolute top-[30%] left-[60%] text-2xl font-bold text-white drop-shadow-lg opacity-80 animate-bounce">
            "מה לעזאזל?!?"
          </div>
        )}
        
        {/* Button to force transition if stuck */}
        <button 
          onClick={handleEmergencySkip}
          className="absolute bottom-10 right-10 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Emergency Skip
        </button>
      </div>
    </div>
  );
};

export default BusTransition;
