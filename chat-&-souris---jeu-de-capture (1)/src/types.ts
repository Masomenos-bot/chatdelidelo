
export type GameStatus = 'START' | 'PLAYING' | 'GAMEOVER';

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface Entity extends Point {
  radius: number;
}

export type MouseType = 'NORMAL' | 'TURBO' | 'GOLDEN';

export interface Mouse extends Entity, Velocity {
  id: number;
  isCaptured: boolean;
  type: MouseType;
  panicTimer: number;
  invulnTimer: number;
  lastPoints?: number;
}

export interface Particle extends Point, Velocity {
  life: number;
  color: string;
  size: number;
  opacity?: number;
}

export interface FloatingText extends Point {
  text: string;
  life: number;
  color: string;
  scale?: number;
}

export interface Evolution {
  name: string;
  description: string;
  type: 'SPEED' | 'MAGNET' | 'HUNGER' | 'DASH';
}

export enum CellType {
  EMPTY = 0,
  WALL = 1,
  CASTLE = 2
}

export interface GameStats {
  score: number;
  level: number;
  frenzyCount: number;
  dashCount: number;
  rescuesCount: number;
}
