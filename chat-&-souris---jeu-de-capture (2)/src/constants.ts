
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const GRID_SIZE = 40;
export const COLS = GAME_WIDTH / GRID_SIZE;
export const ROWS = GAME_HEIGHT / GRID_SIZE;

export const CAT_RADIUS = 16; 
export const MOUSE_RADIUS = 10;
export const CASTLE_RADIUS = 40;

export const MAX_HUNGER = 100;
/** 
 * DIFFICULTÉ ACCRUE : 
 * Taux de déplétion de la faim augmenté pour une tension constante (0.12 au lieu de 0.085).
 */
export const HUNGER_DEPLETION_RATE = 0.12; 

export const COLORS = {
  background: '#050512',
  wall: '#1e1b4b',
  wallGlow: '#4f46e5',
  cat: '#38bdf8', 
  catEyes: '#fef08a', 
  mouse: '#f8fafc',
  mouseTurbo: '#fbbf24',
  mouseGolden: '#facc15',
  capturedMouse: '#818cf8',
  castle: '#10b981',
  text: '#ffffff',
  accent: '#f43f5e',
  frenzy: '#c084fc', 
  danger: '#fb7185',
  shockwave: 'rgba(56, 189, 248, 0.3)'
};

export const INITIAL_MICE_COUNT = 6; // +1 souris supplémentaire
export const SPEED_INCREMENT = 0.22; // Progression ultra-rapide (+22% par niveau)
export const FRENZY_THRESHOLD = 6; // Frénésie encore plus difficile à obtenir
export const FRENZY_DURATION = 180; // Frénésie plus courte (3 secondes à 60fps)

export const BASE_POINTS = {
  NORMAL: 50,
  TURBO: 150,
  GOLDEN: 500
};

export const CAT_IMAGE_DATA = `PHN2ZyB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj4KICA8IS0tIE91dGxpbmUgLS0+CiAgPHBhdGggZD0iTTExIDRoMnYyaDZWNmgydjJoMnYyaDJ2MmgydjEwaC0ydjJoLTJ2MmgtMnYyaC04di0yaC0ydi0yaC0ydi0yaC0ydi0xMGgyVjhoMlY2aDJWNHoiIGZpbGw9IiMwMDAiLz4KICA8IS0tIEZhY2UgQm9keSAtLT4KICA8cGF0aCBkPSJNMTEgNmgydjJoNlY2aDJ2MmgydjJoMnYyaDJ2MTBoLTJ2MmgtMnYyaC0ydjJoLTh2LTJoLTJ2LTJoLTJ2LTJoLTJ2LTEwaDJWOHoiIGZpbGw9IiMwODY2N2EiLz4KICA8IS0tIEV5ZXMgKFllbGxvdykgLS0+CiAgPHBhdGggZD0iTTggMTNoOHY0SDhaTTIwIDEzaDh2NEgyMFoiIGZpbGw9IiNmZWYwNWEiLz4KICA8IS0tIERyb29weSBFeWVsaWRzIC0tPgogIDxwYXRoIGQ9Ik04IDEzaDh2Mkg4Wk0yMCAxM2g4djJIMjBaIiBmaWxsPSIjMDg2NjdZIi8+CiAgPCEtLSBQdXBpbHMgLS0+CiAgPHBhdGggZD0iTTExIDE1aDJ2MmgtMlpNMjMgMTVoMnYyaC0yWiIgZmlsbD0iIzAwMCIvPgogIDwhLS0gTm9zZSAoR3JlZW4pIC0tPgogIDxwYXRoIGQ9Ik0xNSAxOWgydjJoLTJaIiBmaWxsPSIjMDBmZjg4Ii8+CiAgPCEtLSBNb3V0aCAoUGluaykgLS0+CiAgPHBhdGggZD0iTTEyIDIzSDE0djJoNHYtMmgydjJoLTJ2Mmg0di0yaC0yIiBmaWxsPSIjZmYwMGZmIi8+CiAgPHBhdGggZD0iTTE0IDI0aDR2MWgtNFoiIGZpbGw9IiNmZjAwZmYiLz4KPC9zdmc+`;

export const MOUSE_IMAGE_DATA = `PHN2ZyB2aWV3Qm94PSIwIDAgMTYgMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj4KICA8IS0tIEJvZHkgLS0+CiAgPHBhdGggZD0iTTUgNWg2djJINVY1ek00IDdoOHY2SDRWN3pNNiAxM2g0djJINlYxM3oiIGZpbGw9IiM5NGEzYjgiLz4KICA8IS0tIEVhcnMgLS0+CiAgPHBhdGggZD0iTTMgNGgzdjNIM1Y0ek0xMCA0aDN2M2gtM1Y0eiIgZmlsbD0iIzk0YTNiOCIvPgogIDxwYXRoIGQ9Ik00IDVoMXYxSDRWNXpNMTEgNWgxdjFpLTFWNXoiIGZpbGw9IiNmNDcyYjYiLz4KICA8IS0tIEV5ZXMgLS0+CiAgPHBhdGggZD0iTTUgOGgydjFINVY4ek05IDhoMnYxSDlWOHoiIGZpbGw9IiMwMDAiLz4KICA8IS0tIE5vc2UgLS0+CiAgPHBhdGggZD0iTTcgMTBoMnYxSDd2LTF6IiBmaWxsPSIjZjQ3MmI2Ii8+Cjwvc3ZnPg==`;
