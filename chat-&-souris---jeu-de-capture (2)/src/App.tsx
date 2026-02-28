
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Game from './Game';
import { GameStatus, Evolution, GameStats } from './types';
import { MAX_HUNGER, CAT_IMAGE_DATA } from './constants';
import { GoogleGenAI } from "@google/genai";

interface LeaderboardEntry {
  name: string;
  score: number;
}

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Mimi le Rapide", score: 5000 },
  { name: "Félix Zen", score: 3500 },
  { name: "Griffe d'Acier", score: 2000 },
  { name: "Patte de Velours", score: 1000 },
  { name: "Chasseur Lunaire", score: 500 }
];

const MAX_AI_RETRIES = 2;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameStatus>('START');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [hunger, setHunger] = useState(MAX_HUNGER);
  const [evoMessage, setEvoMessage] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [aiComment, setAiComment] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const lastStats = useRef<GameStats | null>(null);

  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('cat_player_name') || "";
    } catch { return ""; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cat_deli_delo_leaderboard');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLeaderboard(parsed);
        else setLeaderboard(DEFAULT_LEADERBOARD);
      } else {
        setLeaderboard(DEFAULT_LEADERBOARD);
      }
    } catch {
      setLeaderboard(DEFAULT_LEADERBOARD);
    }
  }, []);

  const generateAiComment = useCallback(async (stats: GameStats, retryCount = 0) => {
    setIsAiLoading(true);
    setAiError(false);
    if (retryCount === 0) setAiComment("");
    
    try {
      const scoreVal = Number(stats.score);
      const levelVal = Number(stats.level);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `En tant que "Chat Déli Délo", un chat d'arcade cyber-néon arrogant, commente ma partie de jeu. 
                   Score final: ${scoreVal}, Niveau: ${levelVal}, Dashs: ${stats.dashCount}.
                   Sois bref, cinglant et utilise un jargon de gamer chat (miaou, griffes, litière). Max 140 car.`,
      });
      
      const text = response.text;
      if (!text) throw new Error("Réponse vide");
      
      setAiComment(text);
      setAiError(false);
    } catch (err: any) {
      console.warn(`Tentative IA ${retryCount + 1} échouée`, err);
      
      if ((err.status === 429 || err.message?.includes("429")) && retryCount < MAX_AI_RETRIES) {
        setTimeout(() => generateAiComment(stats, retryCount + 1), 2000);
        return;
      }

      setAiError(true);
      setAiComment("Miaou... Mon quota de patience est épuisé par ta performance. (Erreur Quota IA)");
    } finally {
      if (!aiError || retryCount >= MAX_AI_RETRIES) {
        setIsAiLoading(false);
      }
    }
  }, [aiError]);

  const handleGameOver = useCallback((stats: GameStats) => {
    const cleanStats = JSON.parse(JSON.stringify(stats));
    lastStats.current = cleanStats;
    setScore(cleanStats.score);
    setGameState('GAMEOVER');
    generateAiComment(cleanStats);
  }, [generateAiComment]);

  const handleLevelUp = useCallback((nextLevel: number, evolution: Evolution) => {
    setLevel(nextLevel);
    setEvoMessage(`${evolution.name} : ${evolution.description}`);
    setTimeout(() => setEvoMessage(null), 4000);
  }, []);

  const saveScore = (name: string, finalScore: number) => {
    const cleanName = name.trim() || "Anonyme";
    try {
      localStorage.setItem('cat_player_name', cleanName);
      const newEntry = { name: cleanName, score: finalScore };
      const updated = [...leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setLeaderboard(updated);
      localStorage.setItem('cat_deli_delo_leaderboard', JSON.stringify(updated));
    } catch (err) {}
    setGameState('START');
  };

  const shareScore = () => {
    const text = `Miaou ! J'ai fait un score de ${score} au niveau ${level} sur Chat Déli Délo ! Peux-tu battre mes griffes ? 🐱⚡`;
    if (navigator.share) {
      navigator.share({
        title: 'Chat Déli Délo - Score',
        text: text,
        url: window.location.href
      }).catch(console.error);
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(twitterUrl, '_blank');
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#03030b] text-white font-8bit">
      
      {gameState === 'PLAYING' && hunger < 30 && (
        <div className="absolute inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 ${150 - hunger * 4}px rgba(244, 63, 94, ${0.5 - hunger/100})`, animation: hunger < 15 ? 'pulse-danger 0.3s infinite' : 'none' }}
        />
      )}

      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 gap-4 min-h-0">
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-6 bg-black border-4 border-white px-4 py-2 shadow-[4px_4px_0px_#000] z-10 shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[6px] opacity-60">SCORE</span>
              <span className="text-sky-400 text-[10px]">{score}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[6px] opacity-60">LVL</span>
              <span className="text-white text-[10px]">{level}</span>
            </div>
            <div className="w-32 h-4 bg-black border border-white p-0.5 relative">
               <div className={`h-full transition-all duration-300 ${hunger < 25 ? 'bg-rose-500 animate-pulse' : 'bg-sky-400'}`} style={{ width: `${hunger}%` }} />
               <span className="absolute inset-0 flex items-center justify-center text-[5px] font-black">ENERGY</span>
            </div>
            {evoMessage && <div className="bg-sky-500 border border-white px-2 py-1 text-[6px] animate-bounce uppercase">✨ {evoMessage}</div>}
          </div>
        )}

        <div className="relative flex-1 w-full max-w-4xl max-h-[80vh] overflow-hidden border-8 border-white shadow-[16px_16px_0px_#000] bg-black">
          <div className="absolute inset-0 flex items-center justify-center">
            {gameState === 'START' && (
            <div className="absolute inset-0 z-20 flex flex-col md:flex-row bg-[#03030b]">
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r-4 border-white">
                <div className="relative mb-8">
                  <img src={`data:image/svg+xml;base64,${CAT_IMAGE_DATA}`} className="w-32 h-32 pixelated animate-float" alt="logo" />
                </div>
                <button onClick={() => setGameState('PLAYING')} className="retro-button w-full py-4 text-white text-lg font-black uppercase tracking-widest">
                  START
                </button>
                <p className="text-[8px] opacity-50 mt-6 text-center leading-relaxed">CLIC POUR DASHER</p>
              </div>
              <div className="w-full md:w-1/2 p-8 overflow-y-auto bg-black/50">
                <h3 className="text-sm font-black text-sky-400 mb-6 uppercase text-center underline decoration-4 underline-offset-8">TOP SCORES</h3>
                <div className="space-y-4">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] border-b-2 border-white/10 pb-2">
                      <span className="opacity-50">0{i+1}</span>
                      <span className="flex-1 truncate mx-4">{entry.name}</span>
                      <span className="text-sky-400">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
              <h2 className="text-3xl font-black mb-6 text-rose-500 uppercase tracking-tighter">GAME OVER</h2>
              <p className="text-sky-400 text-sm mb-8">SCORE: {score}</p>
              
              <div className="max-w-md mb-8 min-h-[60px] flex items-center justify-center border-2 border-white/20 p-4 bg-black">
                {isAiLoading ? (
                  <div className="text-[8px] animate-pulse">ANALYSANT...</div>
                ) : (
                  <p className={`text-[8px] leading-relaxed ${aiError ? 'text-rose-400 opacity-50' : 'text-white'}`}>
                    {aiComment}
                  </p>
                )}
              </div>

              <div className="w-full max-w-xs space-y-4">
                <input 
                  type="text" 
                  placeholder="NOM?" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-black border-4 border-white p-3 text-sm focus:border-sky-500 outline-none text-center uppercase"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveScore(playerName, score)} className="retro-button flex-1 py-3 text-xs uppercase">SAVE</button>
                  <button onClick={shareScore} className="bg-white text-black px-4 py-3 text-xs">SHARE</button>
                </div>
              </div>
            </div>
          )}
          <Game status={gameState} onGameOver={handleGameOver} onLevelUp={handleLevelUp} onCapture={() => {}} setScore={setScore} setHunger={setHunger} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-danger { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.7; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
