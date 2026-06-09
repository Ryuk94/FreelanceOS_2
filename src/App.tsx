import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, removeLegacyDemoData, CLEAN_GAMIFICATION_STATE } from './db';
import { ToastProvider, useToast } from './components/ToastContext';
import { DashboardOverview } from './components/DashboardOverview';
import { ClientVault } from './components/ClientVault';
import { LeadsPipeline } from './components/LeadsPipeline';
import { FinancialLedger } from './components/FinancialLedger';
import { VideoCalculator } from './components/VideoCalculator';
import { CommandMenu } from './components/CommandMenu';
import { 
  Terminal, ShieldAlert, Cpu, Layers, Disc, Volume2, VolumeX,
  Target, Calculator, FolderGit, Presentation, Sparkles, Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Synthesize Audio clicks using browser Web Audio API (highly robust, no external asset dependency)
function synthesizeCodecClick(type: 'click' | 'levelUp' | 'success') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } else if (type === 'levelUp') {
      // Arpeggio chime
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.25);
      });
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    // Ingest audio fail silently if blocked by user gestures initially
  }
}

type TabType = 'overview' | 'clients' | 'leads' | 'ledger' | 'calcs';

export function AppContent() {
  const { showToast } = useToast();
  
  // Database state bootstrapping
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'GOOD MORNING, OPERATOR';
    if (hours < 17) return 'GOOD AFTERNOON, OPERATOR';
    if (hours < 21) return 'GOOD EVENING, OPERATOR';
    return 'LATE SHIFT COGNITION ENGAGED, OPERATOR';
  };

  const formatTime = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const getDirective = (level: number) => {
    const directives = [
      "CRITICAL: Keep clients updated. Resolve milestoned edits to avoid budget leaks.",
      "DIRECTIVE: Log client payments in the Fiscal Ledger to calibrate project ROI telemetry.",
      "TACTICAL: Add fresh prospects to the Leads Pipeline. Track conversion pipelines daily.",
      "MISSION LOG: Increase operator feedback score. Higher levels yield prestige and high-tier client leads.",
      "MAINTENANCE: Use the [ ] Video Calculator to estimate clip renders and export bitrates instantly."
    ];
    return directives[level % directives.length];
  };

  // Auto query gamification row
  const gamificationState = useLiveQuery(() => db.gamification.toArray(), []);
  const currentStat = gamificationState?.[0] ?? CLEAN_GAMIFICATION_STATE;

  useEffect(() => {
    async function init() {
      try {
        await removeLegacyDemoData();
        setDbSeeded(true);
      } catch (err) {
        console.error('Failed to initialize local Dexie database:', err);
      }
    }
    init();
  }, []);

  // Hotkey hook to toggle tactical cockpit console with `_command
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ctrl+K or Backtick key opens direct console command deck
      if ((e.ctrlKey && e.key === 'k') || e.key === '`') {
        e.preventDefault();
        if (soundEnabled) synthesizeCodecClick('click');
        setIsCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [soundEnabled]);

  // Gamification engine XP addition callback
  const handleGrantXp = useCallback(async (amount: number, label: string) => {
    try {
      const current = (await db.gamification.get(1)) ?? {
        id: 1,
        currentLevel: 0,
        currentXp: 0,
        dailyStreak: 0,
        updatedAt: Date.now()
      };

      const totalXp = current.currentXp + amount;
      const levelUpGains = Math.floor(totalXp / 100);
      const remainingXp = totalXp % 100;
      const nextLevel = current.currentLevel + levelUpGains;

      await db.gamification.put({
        id: 1,
        currentLevel: nextLevel,
        currentXp: remainingXp,
        dailyStreak: current.dailyStreak,
        updatedAt: Date.now()
      });

      if (soundEnabled) {
        if (levelUpGains > 0) {
          synthesizeCodecClick('levelUp');
          // Multiple color confetti explosion
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.8 },
            colors: ['#c4ff0e', '#f97316', '#a855f7']
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.8 },
            colors: ['#c4ff0e', '#f97316', '#a855f7']
          });
          showToast(`PROMOTED! You reached rating Level ${nextLevel}! Operator status elevated.`, 'success');
        } else {
          synthesizeCodecClick('success');
        }
      }
    } catch (err) {
      console.error('Failed to grant XP:', err);
    }
  }, [soundEnabled, showToast]);

  const changeTab = (tab: TabType) => {
    if (soundEnabled) synthesizeCodecClick('click');
    setActiveTab(tab);
  };

  if (!dbSeeded) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono relative overflow-hidden">
        {/* Ambient CRT effects */}
        <div className="neon-scanlines" />
        <div className="neon-scanline-flicker" />
        <div className="cyber-grid absolute inset-0 opacity-20 pointer-events-none" />

        <div className="z-10 text-center space-y-4">
          <Terminal className="h-10 w-10 text-[#c4ff0e] animate-pulse mx-auto" />
          <div className="text-[10px] tracking-[0.6em] text-neutral-500 uppercase">[ COLD INTIALIZATION SEQUENCE ]</div>
          <h2 className="text-sm font-bold text-neutral-300 tracking-wider">LOADING COGNITIVE DRIVER DATABASES...</h2>
          <div className="w-[180px] bg-neutral-900 h-1.5 mx-auto border border-neutral-800 rounded">
            <div className="bg-[#c4ff0e] h-full w-[40%] animate-ping" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative pb-16">
      {/* Ambient Scanning HUD layers */}
      <div className="neon-scanlines" />
      <div className="neon-scanline-flicker" />
      <div className="cyber-grid absolute inset-0 pointer-events-none" />

      {/* Main Terminal Top Headings Status Indicators */}
      <header className="bg-black/90 border-b border-neutral-800 sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#c4ff0e]/10 border border-[#c4ff0e]/30 flex items-center justify-center rounded">
            <Disc className="h-4 w-4 text-[#c4ff0e] animate-spin shrink-0" />
          </div>
            <div>
              <div className="text-[9px] font-bold text-neutral-500 tracking-[0.45em] uppercase leading-none">
              NERV_COGNITIVE // OS
              </div>
            <h1 className="text-sm text-[#d7dbe3] mt-1 uppercase font-ivyproxa-light">
              FreelanceOS
            </h1>
          </div>
        </div>

        {/* Tactical status badges display */}
        <div className="flex items-center gap-6">
          {/* Level telemetry badge */}
          <div className="hidden sm:flex items-center gap-3 bg-neutral-950 p-2 px-3 border border-neutral-850">
            <Trophy className="h-3.5 w-3.5 text-[#c4ff0e]" />
            <div className="text-right">
              <div className="text-[8px] text-neutral-500 leading-none">STRATEGIC CLASS</div>
              <div className="text-xs font-bold text-[#c4ff0e] mt-0.5">LVL {currentStat.currentLevel}</div>
            </div>
          </div>

          {/* Direct command console deck button */}
          <button
            onClick={() => {
              if (soundEnabled) synthesizeCodecClick('click');
              setIsCommandOpen(prev => !prev);
            }}
            className="flex items-center gap-2 border border-neutral-800 hover:border-[#c4ff0e] hover:text-[#c4ff0e] px-4 py-2 hover:bg-neutral-900 bg-neutral-950 text-xs font-bold tracking-wider font-mono text-neutral-400 transition-all rounded"
          >
            <Cpu className="h-3.5 w-3.5 text-[#c4ff0e]" />
            <span>COMMAND_DECK [ ` ]</span>
          </button>

          {/* Sound operators toggle indicator */}
          <button
            onClick={() => {
              synthesizeCodecClick('click');
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2 border border-neutral-800 rounded bg-neutral-950 hover:bg-neutral-900 group"
            title={soundEnabled ? "Disable UI Chimes" : "Enable UI Chimes"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[#c4ff0e] group-hover:scale-105" />
            ) : (
              <VolumeX className="h-4 w-4 text-neutral-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main content grid viewports */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Dynamic Welcome & Tactical Telemetry Bar */}
        <div className="bg-neutral-950/80 border border-neutral-900 rounded-lg p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden backdrop-blur-sm">
          {/* Subtle green glow accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-[#c4ff0e]" />
          
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-[#c4ff0e]/5 border border-[#c4ff0e]/20 flex items-center justify-center rounded-md relative select-none">
              <Sparkles className="h-5 w-5 text-[#c4ff0e] animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c4ff0e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c4ff0e]"></span>
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-sm font-bold text-neutral-100 tracking-wider uppercase">
                  {getGreeting()}
                </h2>
                <span className="text-[10px] bg-neutral-900 text-neutral-400 font-mono px-2 py-0.5 rounded border border-neutral-800">
                  SYSTEM STATUS: SECURE
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed max-w-2xl">
                {getDirective(currentStat.currentLevel)}
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 border-neutral-900 pt-3 md:pt-0 shrink-0">
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-right w-full">
              LOCAL COGNITION TIME
            </div>
            <div className="text-sm font-bold text-[#c4ff0e] font-mono tracking-wider mt-1">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Navigation Selector Tabs HUD style */}
        <nav className="grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-neutral-900 pb-4 font-mono">
          <button
            onClick={() => changeTab('overview')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border transition-all ${
              activeTab === 'overview'
                ? 'bg-neutral-950 border-[#c4ff0e] text-[#c4ff0e] font-black'
                : 'bg-black text-neutral-500 border-neutral-850 hover:border-neutral-700'
            }`}
          >
            <Presentation className="h-4 w-4" />
            <span>OVERVIEW HUD</span>
          </button>
          
          <button
            onClick={() => changeTab('clients')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border transition-all ${
              activeTab === 'clients'
                ? 'bg-neutral-950 border-[#c4ff0e] text-[#c4ff0e] font-black'
                : 'bg-black text-neutral-500 border-neutral-850 hover:border-neutral-700'
            }`}
          >
            <FolderGit className="h-4 w-4" />
            <span>CLIENT VAULT</span>
          </button>

          <button
            onClick={() => changeTab('leads')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border transition-all ${
              activeTab === 'leads'
                ? 'bg-neutral-950 border-[#c4ff0e] text-[#c4ff0e] font-black'
                : 'bg-black text-neutral-500 border-neutral-850 hover:border-neutral-700'
            }`}
          >
            <Target className="h-4 w-4" />
            <span>LEADS PIPELINE</span>
          </button>

          <button
            onClick={() => changeTab('ledger')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border transition-all ${
              activeTab === 'ledger'
                ? 'bg-neutral-950 border-[#c4ff0e] text-[#c4ff0e] font-black'
                : 'bg-black text-neutral-500 border-neutral-850 hover:border-neutral-700'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>FISCAL LEDGER</span>
          </button>

          <button
            onClick={() => changeTab('calcs')}
            className={`col-span-2 md:col-span-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border transition-all ${
              activeTab === 'calcs'
                ? 'bg-neutral-950 border-[#c4ff0e] text-[#c4ff0e] font-black'
                : 'bg-black text-neutral-500 border-neutral-850 hover:border-neutral-700'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>VIDEO CALCS</span>
          </button>
        </nav>

        {/* Tab contents routing render */}
        <div className="animate-fadeIn">
          {activeTab === 'overview' && (
            <DashboardOverview onGrantXp={handleGrantXp} />
          )}
          {activeTab === 'clients' && (
            <ClientVault onGrantXp={handleGrantXp} />
          )}
          {activeTab === 'leads' && (
            <LeadsPipeline onGrantXp={handleGrantXp} />
          )}
          {activeTab === 'ledger' && (
            <FinancialLedger />
          )}
          {activeTab === 'calcs' && (
            <VideoCalculator />
          )}
        </div>
      </main>

      {/* Terminal Footer status marquee */}
      <footer className="fixed bottom-0 left-0 right-0 h-auto sm:h-8 bg-black/95 border-t border-neutral-900 px-3 sm:px-6 py-1.5 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 text-[9px] sm:text-[10px] text-neutral-600 font-mono z-30 select-none overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 w-full sm:w-auto">
          <span className="block max-w-full truncate whitespace-nowrap text-[#c4ff0e] animate-pulse flex-shrink-0">? PILOT RATINGS LIVE FEED</span>
          <span className="hidden md:block min-w-0 truncate whitespace-nowrap">SYSTEM: STABLE // OPERATIONAL SECTOR INT_A_08</span>
        </div>
        <div className="w-full sm:w-auto min-w-0 truncate whitespace-nowrap pl-0 sm:pl-4">
          CURRENT MISSION: SOLVING PROJECT REV CHECKS TO LEVEL UP OVERLORD XP RATINGS (+15 XP)
        </div>
      </footer>

      {/* Command prompt overlay menu */}
      <CommandMenu 
        open={isCommandOpen} 
        onClose={() => setIsCommandOpen(false)} 
        onGrantXp={handleGrantXp}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

