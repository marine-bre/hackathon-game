import create from 'zustand';

export type GameState = 'welcome' | 'map' | 'transition' | 'minigame' | 'gameover' | 'victory';

export type CharacterId = 'nimrod' | 'liat' | 'reuven' | 'josef' | 'hila';

export type Neighborhood =
  | 'Florentin'
  | 'Old North'
  | 'Kerem'
  | 'Park Hamesila'
  | 'Kiryat Hamemshala'
  | 'Rothschild'
  | "Neve Sha'anan"
  | 'tayelet'
  | 'Neve Tzedek'
  | 'Memadion'
  | 'memadion';

export type Collectible = 'hummus' | 'falafel';

export type GameStore = {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  selectedCharacter: CharacterId | null;
  setSelectedCharacter: (id: CharacterId) => void;
  selectedNeighborhood: Neighborhood | null;
  setSelectedNeighborhood: (n: Neighborhood) => void;
  health: { permanentHearts: number; temporaryHearts: number };
  loseHeart: () => void;
  gainHeart: () => void;
  score: number;
  setScore: (score: number) => void;
  minigameStartTime: number;
  setMinigameStartTime: (startTime: number) => void;
  completedNeighborhoods: Neighborhood[];
  completeNeighborhood: (n: Neighborhood) => void;
  collectedItems: Collectible[];
  collectItem: (item: Collectible) => void;
  reset: () => void;
  selectedMinigame: string | null;
  setSelectedMinigame: (minigame: string) => void;
  isInvulnerable: boolean;
  invulnerabilityEndTime: number;
  setInvulnerable: (until: number) => void;
  clearInvulnerable: () => void;
  isFlickering: boolean;
  flickerEndTime: number;
  shakeEndTime: number;
  aura: { type: 'point' | 'primary' | null; startTime: number };
  setFlicker: (endTime: number) => void;
  clearFlicker: () => void;
  setShake: (endTime: number) => void;
  clearShake: () => void;
  setAura: (type: 'point' | 'primary', startTime: number) => void;
  clearAura: () => void;
  facingDirection: 'left' | 'right';
  setFacingDirection: (dir: 'left' | 'right') => void;
  previousMouseX: number;
  setPreviousMouseX: (x: number) => void;
};

const PERMANENT_HEARTS = 5;

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'welcome',
  setGameState: (gameState) => set({ gameState }),
  selectedCharacter: null,
  setSelectedCharacter: (id) => set({ selectedCharacter: id }),
  selectedNeighborhood: null,
  setSelectedNeighborhood: (n) => set({ selectedNeighborhood: n }),
  health: { permanentHearts: PERMANENT_HEARTS, temporaryHearts: 0 },
  loseHeart: () =>
    set((s) => {
      if (s.health.temporaryHearts > 0) {
        return { health: { ...s.health, temporaryHearts: s.health.temporaryHearts - 1 } };
      } else {
        return {
          health: { ...s.health, permanentHearts: Math.max(0, s.health.permanentHearts - 1) },
        };
      }
    }),
  gainHeart: () =>
    set((s) => {
      if (s.health.permanentHearts < PERMANENT_HEARTS) {
        return { health: { ...s.health, permanentHearts: s.health.permanentHearts + 1 } };
      } else {
        return { health: { ...s.health, temporaryHearts: s.health.temporaryHearts + 1 } };
      }
    }),
  score: 0,
  setScore: (score) => set({ score }),
  minigameStartTime: 0,
  setMinigameStartTime: (startTime) => set({ minigameStartTime: startTime }),
  completedNeighborhoods: [],
  completeNeighborhood: (n) =>
    set((s) => ({ completedNeighborhoods: [...s.completedNeighborhoods, n] })),
  collectedItems: [],
  collectItem: (item) => set((s) => ({ collectedItems: [...s.collectedItems, item] })),
  reset: () =>
    set({
      gameState: 'welcome',
      selectedCharacter: null,
      selectedNeighborhood: null,
      health: { permanentHearts: PERMANENT_HEARTS, temporaryHearts: 0 },
      score: 0,
      minigameStartTime: 0,
      completedNeighborhoods: [],
      collectedItems: [],
      isInvulnerable: false,
      invulnerabilityEndTime: 0,
      isFlickering: false,
      flickerEndTime: 0,
      shakeEndTime: 0,
      aura: { type: null, startTime: 0 },
      facingDirection: 'left',
      previousMouseX: 0,
    }),
  selectedMinigame: null,
  setSelectedMinigame: (minigame) => set({ selectedMinigame: minigame }),
  isInvulnerable: false,
  invulnerabilityEndTime: 0,
  setInvulnerable: (until) => set({ isInvulnerable: true, invulnerabilityEndTime: until }),
  clearInvulnerable: () => set({ isInvulnerable: false, invulnerabilityEndTime: 0 }),
  setFlicker: (endTime) => set({ isFlickering: true, flickerEndTime: endTime }),
  clearFlicker: () => set({ isFlickering: false, flickerEndTime: 0 }),
  setShake: (endTime) => set({ shakeEndTime: endTime }),
  clearShake: () => set({ shakeEndTime: 0 }),
  setAura: (type, startTime) => set({ aura: { type, startTime } }),
  clearAura: () => set({ aura: { type: null, startTime: 0 } }),
  facingDirection: 'left',
  setFacingDirection: (dir) => set({ facingDirection: dir }),
  previousMouseX: 0,
  setPreviousMouseX: (x) => set({ previousMouseX: x }),
}));
