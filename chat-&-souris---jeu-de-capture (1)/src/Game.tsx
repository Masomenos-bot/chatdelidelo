
import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, Point, Mouse, MouseType, Particle, FloatingText, CellType, Evolution, GameStats } from './types';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  GRID_SIZE,
  COLS,
  ROWS,
  CAT_RADIUS, 
  MOUSE_RADIUS, 
  CASTLE_RADIUS, 
  COLORS, 
  INITIAL_MICE_COUNT,
  SPEED_INCREMENT,
  MAX_HUNGER,
  HUNGER_DEPLETION_RATE,
  FRENZY_THRESHOLD,
  FRENZY_DURATION,
  BASE_POINTS,
  CAT_IMAGE_DATA,
  MOUSE_IMAGE_DATA
} from './constants';

interface GameProps {
  status: GameStatus;
  onGameOver: (stats: GameStats) => void;
  onLevelUp: (level: number, evolution: Evolution) => void;
  onCapture: () => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setHunger: React.Dispatch<React.SetStateAction<number>>;
}

const BASE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

const EVOLUTIONS: Evolution[] = [
  { name: "Agilité Plume", description: "Contrôle encore plus fluide", type: 'SPEED' },
  { name: "Sillage Magnétique", description: "Attire les souris (modérément)", type: 'MAGNET' },
  { name: "Méditation", description: "Économise ton énergie", type: 'HUNGER' },
  { name: "Saut Quantique", description: "Dash plus puissant", type: 'DASH' }
];

const Game: React.FC<GameProps> = ({ status, onGameOver, onLevelUp, setScore, setHunger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const catImg = useRef<HTMLImageElement | null>(null);
  const mouseImg = useRef<HTMLImageElement | null>(null);

  const grid = useRef<number[][]>([]);
  const catPos = useRef<Point>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const catVel = useRef<Point>({ x: 0, y: 0 });
  const catAngle = useRef<number>(0);
  const targetPos = useRef<Point>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const mice = useRef<Mouse[]>([]);
  const capturedMice = useRef<Mouse[]>([]);
  const particles = useRef<Particle[]>([]);
  const catTrail = useRef<{x: number, y: number, a: number, t: number}[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const evolutions = useRef<Evolution[]>([]);
  
  const stats = useRef<GameStats>({
    score: 0,
    level: 1,
    frenzyCount: 0,
    dashCount: 0,
    rescuesCount: 0
  });

  const dashCooldown = useRef(0);
  const dashTime = useRef(0);
  const frenzyTimer = useRef(0);
  const shockwaves = useRef<{x: number, y: number, r: number, life: number}[]>([]);
  
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebrationTimer = useRef(0);
  const screenShake = useRef(0);
  const levelRef = useRef(1);
  const levelStartTime = useRef(Date.now());
  const hungerRef = useRef(MAX_HUNGER);
  const comboRef = useRef(0);
  const lastCaptureTime = useRef(0);
  const requestRef = useRef<number | null>(null);
  const castlePos: Point = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

  useEffect(() => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${CAT_IMAGE_DATA}`;
    img.onload = () => { catImg.current = img; };

    const mImg = new Image();
    mImg.src = `data:image/svg+xml;base64,${MOUSE_IMAGE_DATA}`;
    mImg.onload = () => { mouseImg.current = mImg; };
  }, []);

  const getAudioCtx = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    return audioCtx.current;
  };

  const playSynth = (freqIndex: number, type: OscillatorType = 'sine', duration = 0.5, volume = 0.08) => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const baseFreq = BASE_FREQUENCIES[Math.min(freqIndex, BASE_FREQUENCIES.length - 1)];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(baseFreq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch(e) {}
  };

  const isWall = (x: number, y: number) => {
    const gx = Math.floor(x / GRID_SIZE);
    const gy = Math.floor(y / GRID_SIZE);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return true;
    if (!grid.current[gy]) return true;
    return grid.current[gy][gx] === CellType.WALL;
  };

  const checkCollision = (x: number, y: number, r: number) => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      if (isWall(x + Math.cos(angle) * r, y + Math.sin(angle) * r)) return true;
    }
    return false;
  };

  const generateGrid = (level: number) => {
    const newGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(CellType.EMPTY));
    for(let i=0; i<COLS; i++) { newGrid[0][i] = CellType.WALL; newGrid[ROWS-1][i] = CellType.WALL; }
    for(let i=0; i<ROWS; i++) { newGrid[i][0] = CellType.WALL; newGrid[i][COLS-1] = CellType.WALL; }
    const complexity = Math.min(0.3, 0.08 + (level * 0.03));
    for (let y = 2; y < ROWS - 2; y += 2) {
      for (let x = 2; x < COLS - 2; x += 2) {
        if (Math.abs(x - COLS/2) < 4 && Math.abs(y - ROWS/2) < 4) continue;
        if (Math.random() < complexity) {
          newGrid[y][x] = CellType.WALL;
          newGrid[y][COLS - 1 - x] = CellType.WALL;
        }
      }
    }
    grid.current = newGrid;
  };

  const initLevel = (level: number) => {
    generateGrid(level);
    const count = INITIAL_MICE_COUNT + Math.floor(level / 1.1);
    const speedScale = 1 + (level - 1) * SPEED_INCREMENT;
    mice.current = Array.from({ length: count }, () => {
      let x, y;
      do {
        x = Math.random() * (GAME_WIDTH - 160) + 80;
        y = Math.random() * (GAME_HEIGHT - 160) + 80;
      } while (isWall(x, y) || Math.hypot(x - castlePos.x, y - castlePos.y) < 220);
      
      const rand = Math.random();
      let type: MouseType = 'NORMAL';
      if (rand < 0.06) type = 'GOLDEN';
      else if (rand < 0.3 + (level * 0.05)) type = 'TURBO';

      return {
        id: Math.random(), x, y,
        vx: (Math.random() - 0.5) * (type === 'GOLDEN' ? 10 : 5) * speedScale,
        vy: (Math.random() - 0.5) * (type === 'GOLDEN' ? 10 : 5) * speedScale,
        radius: type === 'NORMAL' ? MOUSE_RADIUS : MOUSE_RADIUS * 0.9,
        isCaptured: false, type,
        panicTimer: 0, invulnTimer: 0
      };
    });
    capturedMice.current = [];
    catPos.current = { x: castlePos.x, y: castlePos.y + GRID_SIZE * 4 };
    catVel.current = { x: 0, y: 0 };
    targetPos.current = { ...catPos.current };
    catTrail.current = [];
    hungerRef.current = MAX_HUNGER;
    levelStartTime.current = Date.now();
    comboRef.current = 0;
    dashCooldown.current = 0;
    frenzyTimer.current = 0;
    setIsCelebrating(false);
  };

  useEffect(() => {
    if (status === 'PLAYING') {
      levelRef.current = 1;
      stats.current = { score: 0, level: 1, frenzyCount: 0, dashCount: 0, rescuesCount: 0 };
      evolutions.current = [];
      initLevel(1);
    }
  }, [status]);

  const update = () => {
    if (status !== 'PLAYING') return;
    if (isCelebrating) {
      celebrationTimer.current += 1;
      if (celebrationTimer.current > 100) {
        const nextEvolution = EVOLUTIONS[Math.floor(Math.random() * EVOLUTIONS.length)];
        evolutions.current.push(nextEvolution);
        levelRef.current += 1;
        stats.current.level = levelRef.current;
        onLevelUp(levelRef.current, nextEvolution);
        initLevel(levelRef.current);
      }
      return;
    }

    const isFrenzy = frenzyTimer.current > 0;
    if (isFrenzy) frenzyTimer.current--;

    const levelTime = (Date.now() - levelStartTime.current) / 1000;
    const hasCaptured = capturedMice.current.length > 0;

    if (levelTime < 60 || hasCaptured) {
      // Période de grâce ou sécurité après capture
      hungerRef.current = MAX_HUNGER;
    } else {
      // Après 60s sans capture, on a 30s pour en attraper une (total 90s)
      const graceTimeLeft = Math.max(0, 90 - levelTime);
      hungerRef.current = (graceTimeLeft / 30) * MAX_HUNGER;
    }

    setHunger(hungerRef.current);
    if (hungerRef.current <= 0) { onGameOver({...stats.current}); return; }

    const speedBonus = 1 + (evolutions.current.filter(e => e.type === 'SPEED').length * 0.12) + (isFrenzy ? 0.3 : 0);
    const magnetBonus = (evolutions.current.filter(e => e.type === 'MAGNET').length * 10) + (isFrenzy ? 30 : 0);
    const dashBonus = 1 + (evolutions.current.filter(e => e.type === 'DASH').length * 0.2);

    if (screenShake.current > 0) screenShake.current -= 0.5;
    if (dashCooldown.current > 0) dashCooldown.current--;

    let friction = 0.91; 
    let accel = 0.65 * speedBonus;
    
    if (dashTime.current > 0) {
      accel *= 4.5 * dashBonus;
      friction = 0.97;
      dashTime.current--;
    }

    const dx = targetPos.current.x - catPos.current.x;
    const dy = targetPos.current.y - catPos.current.y;
    const dDist = Math.hypot(dx, dy);
    if (dDist > 5) {
      catVel.current.x += (dx / dDist) * accel;
      catVel.current.y += (dy / dDist) * accel;
    }

    catVel.current.x *= friction;
    catVel.current.y *= friction;

    const nextX = catPos.current.x + catVel.current.x;
    const nextY = catPos.current.y + catVel.current.y;
    if (!checkCollision(nextX, nextY, CAT_RADIUS)) {
      catPos.current.x = nextX;
      catPos.current.y = nextY;
    } else {
      if (!checkCollision(nextX, catPos.current.y, CAT_RADIUS)) catPos.current.x = nextX;
      else if (!checkCollision(catPos.current.x, nextY, CAT_RADIUS)) catPos.current.y = nextY;
      else { 
        catVel.current.x *= -0.6; 
        catVel.current.y *= -0.6;
        screenShake.current = 3;
      }
    }

    const moveAngle = Math.atan2(catVel.current.y, catVel.current.x);
    const speedVal = Math.hypot(catVel.current.x, catVel.current.y);
    if (speedVal > 0.5) {
      const diff = moveAngle - catAngle.current;
      catAngle.current += Math.atan2(Math.sin(diff), Math.cos(diff)) * 0.15;
    }

    if (speedVal > 1) {
      catTrail.current.unshift({ ...catPos.current, a: catAngle.current, t: Date.now() });
      const maxTrail = 8 + (isFrenzy ? 12 : 0);
      if (catTrail.current.length > maxTrail) catTrail.current.pop();
    } else if (catTrail.current.length > 0) catTrail.current.pop();

    const now = Date.now();
    if (now - lastCaptureTime.current > 3000) comboRef.current = 0; 

    mice.current.forEach(m => {
      if (!m.isCaptured) {
        const dCat = Math.hypot(m.x - catPos.current.x, m.y - catPos.current.y);
        const dCastle = Math.hypot(m.x - castlePos.x, m.y - castlePos.y);

        if (dCastle < CASTLE_RADIUS + 40 && capturedMice.current.length > 0) {
          const rescued = capturedMice.current.pop();
          if (rescued) {
            stats.current.rescuesCount++;
            rescued.isCaptured = false;
            rescued.invulnTimer = 180;
            const loss = Math.floor((rescued.lastPoints || 50) * 2.0); 
            stats.current.score = Math.max(0, stats.current.score - loss);
            setScore(stats.current.score);
            rescued.vx = (Math.random() - 0.5) * 15;
            rescued.vy = (Math.random() - 0.5) * 15;
            playSynth(1, 'sawtooth', 0.5, 0.1);
            floatingTexts.current.push({ x: rescued.x, y: rescued.y, text: `-${loss} ÉVASION !`, color: COLORS.danger, life: 1.5, scale: 1.2 });
            screenShake.current = 18;
          }
        }

        if (dCat < 240) {
          const fleeA = Math.atan2(m.y - catPos.current.y, m.x - catPos.current.x);
          const fleeForce = isFrenzy ? 1.6 : 1.1;
          m.vx += Math.cos(fleeA) * fleeForce; 
          m.vy += Math.sin(fleeA) * fleeForce;
        }

        shockwaves.current.forEach(s => {
          const dS = Math.hypot(m.x - s.x, m.y - s.y);
          if (dS < s.r) { m.vx *= 0.3; m.vy *= 0.3; } 
        });

        if (m.invulnTimer > 0) m.invulnTimer--;
        const maxV = (m.type === 'GOLDEN' ? 11 : (m.type === 'TURBO' ? 8 : 5.5)) * (1 + (levelRef.current-1)*SPEED_INCREMENT);
        const curV = Math.hypot(m.vx, m.vy);
        if (curV > maxV) { m.vx = (m.vx/curV)*maxV; m.vy = (m.vy/curV)*maxV; }
        
        if (checkCollision(m.x + m.vx, m.y, m.radius)) m.vx *= -0.9;
        if (checkCollision(m.x, m.y + m.vy, m.radius)) m.vy *= -0.9;
        m.x += m.vx; m.y += m.vy;
        m.vx *= 0.985; m.vy *= 0.985;
        
        const captureRange = CAT_RADIUS + m.radius + magnetBonus + 8; 
        if (m.invulnTimer <= 0 && dCat < captureRange) {
          m.isCaptured = true;
          capturedMice.current.push(m);
          comboRef.current++;
          lastCaptureTime.current = now;
          screenShake.current = isFrenzy ? 12 : 7;
          
          if (comboRef.current === FRENZY_THRESHOLD && !isFrenzy) {
            frenzyTimer.current = FRENZY_DURATION;
            stats.current.frenzyCount++;
            playSynth(7, 'sawtooth', 1.2, 0.15);
            floatingTexts.current.push({ x: catPos.current.x, y: catPos.current.y - 40, text: "ULTRA MODE !", color: COLORS.frenzy, life: 2, scale: 2 });
          } else {
            playSynth(Math.min(7, comboRef.current), isFrenzy ? 'square' : 'sine', 0.6);
          }

          const hGain = m.type === 'GOLDEN' ? 35 : 10; 
          hungerRef.current = Math.min(MAX_HUNGER, hungerRef.current + hGain); 
          
          const basePts = m.type === 'GOLDEN' ? BASE_POINTS.GOLDEN : (m.type === 'TURBO' ? BASE_POINTS.TURBO : BASE_POINTS.NORMAL);
          const comboMult = 1 + (comboRef.current - 1) * 0.8; 
          const pts = Math.floor(basePts * levelRef.current * comboMult * (isFrenzy ? 1.5 : 1));
          
          m.lastPoints = pts;
          stats.current.score += pts;
          setScore(stats.current.score);
          
          floatingTexts.current.push({ 
            x: m.x, y: m.y, 
            text: comboRef.current > 1 ? `+${pts} x${comboRef.current}` : `+${pts}`, 
            color: m.type === 'GOLDEN' ? COLORS.mouseGolden : (isFrenzy ? COLORS.frenzy : COLORS.text), 
            life: 1.2,
            scale: 1 + (comboRef.current * 0.14)
          });
          
          const pColor = m.type === 'GOLDEN' ? COLORS.mouseGolden : (m.type === 'TURBO' ? COLORS.mouseTurbo : COLORS.mouse);
          for(let i=0; i<20; i++) {
            particles.current.push({ x: m.x, y: m.y, vx: (Math.random()-0.5)*14, vy: (Math.random()-0.5)*14, life: 1, color: pColor, size: Math.random()*5+2 });
          }
        }
      }
    });

    capturedMice.current.forEach((m, i) => {
      const a = i * 0.6 + (now * 0.003);
      const d = CASTLE_RADIUS + 35 + (i * 6);
      m.x += (castlePos.x + Math.cos(a) * d - m.x) * 0.08;
      m.y += (castlePos.y + Math.sin(a) * d - m.y) * 0.08;
    });

    shockwaves.current = shockwaves.current.filter(s => { s.r += 8; s.life -= 0.03; return s.life > 0; });
    particles.current = particles.current.filter(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.028; return p.life > 0; });
    floatingTexts.current = floatingTexts.current.filter(t => { t.y -= 1.3; t.life -= 0.02; return t.life > 0; });

    if (mice.current.every(m => m.isCaptured) && !isCelebrating) {
      const bonus = Math.floor(800 * levelRef.current * (hungerRef.current / MAX_HUNGER + 1));
      stats.current.score += bonus;
      setScore(stats.current.score);
      floatingTexts.current.push({ x: castlePos.x, y: castlePos.y - 60, text: `MASTER ! +${bonus}`, color: COLORS.castle, life: 3, scale: 1.5 });
      setIsCelebrating(true);
      celebrationTimer.current = 0;
      playSynth(4, 'sine', 1, 0.2);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.save();
    if (screenShake.current > 0) ctx.translate((Math.random()-0.5)*screenShake.current, (Math.random()-0.5)*screenShake.current);
    
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.strokeStyle = '#ffffff05'; ctx.lineWidth = 1;
    for(let i=0; i<GAME_WIDTH; i+=GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); ctx.stroke(); }
    for(let i=0; i<GAME_HEIGHT; i+=GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(GAME_WIDTH, i); ctx.stroke(); }

    ctx.strokeStyle = frenzyTimer.current > 0 ? COLORS.frenzy : (hungerRef.current < 25 ? COLORS.danger : COLORS.wallGlow);
    ctx.lineWidth = 2;
    for(let y=0; y<ROWS; y++) {
      for(let x=0; x<COLS; x++) {
        if (grid.current[y] && grid.current[y][x] === CellType.WALL) {
          ctx.shadowBlur = 10; ctx.shadowColor = ctx.strokeStyle as string;
          ctx.strokeRect(x * GRID_SIZE + 8, y * GRID_SIZE + 8, GRID_SIZE - 16, GRID_SIZE - 16);
          ctx.shadowBlur = 0;
        }
      }
    }

    ctx.beginPath(); ctx.arc(castlePos.x, castlePos.y, CASTLE_RADIUS + 5, 0, Math.PI*2);
    ctx.fillStyle = COLORS.danger + '15'; ctx.fill();
    ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 3; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.castle; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText(isCelebrating ? '🏆' : '⛩️', castlePos.x, castlePos.y + 10);
    
    shockwaves.current.forEach(s => {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${s.life * 0.5})`;
      ctx.lineWidth = 4; ctx.stroke();
    });

    catTrail.current.forEach((p, i) => {
      ctx.globalAlpha = (1 - i / catTrail.current.length) * 0.3;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      const s = CAT_RADIUS * (3 + (frenzyTimer.current > 0 ? 1 : 0));
      if (catImg.current) {
        if (frenzyTimer.current > 0) ctx.filter = 'hue-rotate(280deg) brightness(1.5)';
        ctx.drawImage(catImg.current, -s/2, -s/2, s, s);
      }
      ctx.restore();
    });
    
    ctx.globalAlpha = 1;
    mice.current.forEach(m => {
      ctx.save(); ctx.translate(m.x, m.y);
      if (m.invulnTimer > 0) ctx.globalAlpha = 0.4 + Math.sin(Date.now()*0.02)*0.3;
      
      const mColor = m.isCaptured ? COLORS.capturedMouse : (m.type === 'GOLDEN' ? COLORS.mouseGolden : (m.type === 'TURBO' ? COLORS.mouseTurbo : COLORS.mouse));
      
      if (mouseImg.current) {
        const s = m.radius * 2.5;
        if (m.type === 'GOLDEN') { ctx.filter = 'sepia(1) saturate(10) hue-rotate(10deg)'; ctx.shadowBlur = 15; ctx.shadowColor = COLORS.mouseGolden; }
        else if (m.type === 'TURBO') { ctx.filter = 'sepia(1) saturate(10) hue-rotate(30deg)'; }
        else if (m.isCaptured) { ctx.filter = 'grayscale(1) opacity(0.5)'; }
        
        ctx.drawImage(mouseImg.current, -s/2, -s/2, s, s);
      } else {
        ctx.fillStyle = mColor;
        if (!m.isCaptured && m.type === 'GOLDEN') { ctx.shadowBlur = 15; ctx.shadowColor = COLORS.mouseGolden; }
        ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });

    ctx.save(); ctx.translate(catPos.current.x, catPos.current.y); ctx.rotate(catAngle.current + Math.PI/2);
    if (catImg.current) {
      const s = CAT_RADIUS * (3 + (frenzyTimer.current > 0 ? 1 : 0));
      ctx.imageSmoothingEnabled = false;
      if (frenzyTimer.current > 0) {
        ctx.shadowBlur = 20; ctx.shadowColor = COLORS.frenzy;
        ctx.filter = 'hue-rotate(280deg) brightness(1.5)';
      }
      ctx.drawImage(catImg.current, -s/2, -s/2, s, s);
    }
    ctx.restore();

    particles.current.forEach(p => { 
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color; 
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill(); 
    });
    
    floatingTexts.current.forEach(t => { 
      ctx.globalAlpha = t.life; ctx.fillStyle = t.color; 
      const fontSize = Math.floor(8 * (t.scale || 1));
      ctx.font = `${fontSize}px "Press Start 2P"`; 
      ctx.textAlign = 'center'; ctx.fillText(t.text, t.x, t.y); 
    });
    ctx.restore();

    if (isCelebrating) {
      ctx.fillStyle = 'rgba(3, 3, 11, 0.95)'; ctx.fillRect(0,0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = COLORS.castle; ctx.font = '24px "Press Start 2P"'; ctx.textAlign = 'center';
      ctx.fillText(`NIVEAU ${levelRef.current + 1}`, GAME_WIDTH/2, GAME_HEIGHT/2);
      ctx.font = '8px "Press Start 2P"'; ctx.fillStyle = COLORS.text;
      ctx.fillText("LA CHASSE DEVIENT INFERNALE...", GAME_WIDTH/2, GAME_HEIGHT/2 + 60);
    }
  };

  const loop = () => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [status, isCelebrating]);

  const handlePointer = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetPos.current = { 
      x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width), 
      y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height) 
    };
  };

  const handleDash = () => {
    if (status !== 'PLAYING' || isCelebrating || dashCooldown.current > 0) return;
    stats.current.dashCount++;
    dashTime.current = 15;
    dashCooldown.current = 110; 
    hungerRef.current -= 12; // Dash très coûteux
    shockwaves.current.push({ x: catPos.current.x, y: catPos.current.y, r: 30, life: 1 });
    playSynth(4, 'triangle', 0.3, 0.1);
    screenShake.current = 8;
  };

  return (
    <canvas
      ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT}
      className={`w-full h-full touch-none ${isCelebrating ? 'cursor-default' : 'cursor-none'} pixelated`}
      onPointerMove={handlePointer} 
      onPointerDown={(e) => { handlePointer(e); handleDash(); }}
    />
  );
};

export default Game;
