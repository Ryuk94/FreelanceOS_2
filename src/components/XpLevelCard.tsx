import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Trophy, Compass } from 'lucide-react';

const DEFAULT_GAMIFICATION = {
  id: 1,
  currentLevel: 1,
  currentXp: 0,
  dailyStreak: 0,
};

export function XpLevelIndicator() {
  // Query Dexie directly
  const gamificationRows = useLiveQuery(() => db.gamification.toArray(), []);
  const gamification = gamificationRows?.[0] ?? DEFAULT_GAMIFICATION;

  // Calculate XP ratio (out of 100 XP per level gain)
  const xpPercentage = useMemo(() => {
    return Math.min(100, Math.max(0, gamification.currentXp));
  }, [gamification.currentXp]);

  return (
    <section className="bg-black border border-neutral-850 p-5 rounded-xl relative overflow-hidden shadow-[vaR(--card-shadow)] leading-relaxed">
      {/* Absolute background visual watermark */}
      <Compass className="absolute -bottom-6 -right-6 h-28 w-28 text-neutral-900/40 pointer-events-none" />

      {/* Decorative top-right indicators */}
      <div className="absolute top-0 right-0 p-1.5 text-[8px] font-mono text-[#c4ff0e] bg-neutral-950 border-l border-b border-neutral-850">
        STRK_v{gamification.dailyStreak}d
      </div>

      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.55em] text-neutral-500 mb-1 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#c4ff0e] shrink-0" />
          [ PILOT RATING STATUS ]
        </div>
        <h2 className="text-xl font-serif text-[#d7dbe3] uppercase tracking-wide">LEVEL INDICES</h2>
      </header>

      <div className="flex items-center justify-between gap-6 mb-4">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold leading-none">OPERATOR STAGE</div>
          <div className="text-4xl font-mono text-white tracking-widest font-black mt-2">
            LVL_<span className="text-[#c4ff0e]">{gamification.currentLevel}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold leading-none">ACCUMULATIVE STREAK</div>
          <div className="text-xl font-mono text-white font-black mt-2">
            {gamification.dailyStreak} <span className="text-[10px] text-neutral-400">DAYS ACTIVE</span>
          </div>
        </div>
      </div>

      {/* XP ProgressBar */}
      <div className="space-y-1.5 font-mono">
        <div className="flex justify-between items-center text-[10px] tracking-wide text-neutral-500">
          <span className="font-bold">XP LEVEL CAPACITY: {gamification.currentXp} / 100</span>
          <span>{xpPercentage}%</span>
        </div>
        <div className="w-full bg-[#10141a] h-3 border border-neutral-850 rounded-none overflow-hidden relative">
          <div 
            className="bg-[#c4ff0e] h-full transition-all duration-500 relative"
            style={{ width: `${xpPercentage}%` }}
          >
            {/* Glowing neon tip scan line filter decoration */}
            <div className="absolute top-0 right-0 bottom-0 w-[4px] bg-white animate-pulse" />
          </div>
        </div>
      </div>

      <p className="text-[9px] normal-case text-neutral-500 mt-3 font-mono leading-normal text-left">
        XP increments automatically logged into local Dexie database indices when finalizing edits, solving revision items (+15 XP), or completing project milestones (+10 XP).
      </p>
    </section>
  );
}
export default XpLevelIndicator;
