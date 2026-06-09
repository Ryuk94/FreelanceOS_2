import React, { useState, useMemo } from 'react';
import { Film, RefreshCw, Layers, Cpu, Info } from 'lucide-react';

// Video bitrates representation in Mbps based on Resolution, Framerate, and Codec
interface CodecPreset {
  name: string;
  bitratesMbps: { [resolution: string]: number }; // base bitrates for standard 24/25/30 fps
}

const CODEC_PRESETS: CodecPreset[] = [
  {
    name: "Apple ProRes 422 Proxy",
    bitratesMbps: { "1080p": 45, "2.7K": 95, "4K UHD": 170, "6K": 380, "8K": 680 }
  },
  {
    name: "Apple ProRes 422 Standard",
    bitratesMbps: { "1080p": 147, "2.7K": 310, "4K UHD": 589, "6K": 1325, "8K": 2355 }
  },
  {
    name: "Apple ProRes 422 HQ",
    bitratesMbps: { "1080p": 220, "2.7K": 465, "4K UHD": 880, "6K": 1980, "8K": 3520 }
  },
  {
    name: "Apple ProRes 4444 XQ",
    bitratesMbps: { "1080p": 500, "2.7K": 1050, "4K UHD": 1990, "6K": 4480, "8K": 7960 }
  },
  {
    name: "H.264 / AAC (High Quality)",
    bitratesMbps: { "1080p": 16, "2.7K": 30, "4K UHD": 60, "6K": 120, "8K": 240 }
  },
  {
    name: "H.265 / HEVC (Ultra Compressed)",
    bitratesMbps: { "1080p": 10, "2.7K": 18, "4K UHD": 35, "6K": 70, "8K": 140 }
  }
];

export function VideoCalculator() {
  // Master File Size Calculator state
  const [resolution, setResolution] = useState<string>("4K UHD");
  const [framerate, setFramerate] = useState<number>(23.976);
  const [codecIndex, setCodecIndex] = useState<number>(2); // ProRes 422 HQ
  const [customBitrate, setCustomBitrate] = useState<string>("");
  const [durationH, setDurationH] = useState<number>(0);
  const [durationM, setDurationM] = useState<number>(10);
  const [durationS, setDurationS] = useState<number>(0);

  // Timecode Math Calculator state
  const [tcInput1, setTcInput1] = useState<string>("00:05:30:12");
  const [tcInput2, setTcInput2] = useState<string>("00:02:15:08");
  const [tcMathMode, setTcMathMode] = useState<'add' | 'subtract'>('add');
  const [timecodeFPS, setTimecodeFPS] = useState<number>(24);

  // Master calculation logic
  const selectedPreset = CODEC_PRESETS[codecIndex];
  
  const calculatedBitrateMbps = useMemo(() => {
    if (customBitrate && !isNaN(Number(customBitrate))) {
      return Number(customBitrate);
    }
    const baseBitrate = selectedPreset.bitratesMbps[resolution] || 100;
    // Scale bitrate relative to standard framerate 24/25/30fps
    if (framerate > 30) {
      return baseBitrate * (framerate / 24) * 0.9; // discount due to temporal redundancy compression efficacy
    }
    return baseBitrate;
  }, [codecIndex, resolution, framerate, customBitrate, selectedPreset]);

  const outputBytes = useMemo(() => {
    const totalSeconds = (durationH * 3600) + (durationM * 60) + durationS;
    if (totalSeconds <= 0) return 0;

    // Bitrate in Megabits per second * total duration = total megabits
    // total megabits / 8 = Megabytes
    // Megabytes / 1024 = Gigabytes
    const mbps = calculatedBitrateMbps;
    const totalMegabits = mbps * totalSeconds;
    const totalMegabytes = totalMegabits / 8;
    const totalGigabytes = totalMegabytes / 1024;
    return totalGigabytes;
  }, [calculatedBitrateMbps, durationH, durationM, durationS]);

  // Frame count logic & timecode operations
  const parseTimecodeToFrames = (tc: string, fps: number): number => {
    // Expected format: HH:MM:SS:FF or HH:MM:SS;FF or MM:SS:FF
    const parts = tc.replace(/;/g, ':').split(':').map(Number);
    if (parts.some(isNaN)) return 0;

    if (parts.length === 4) {
      const [h, m, s, f] = parts;
      return (h * 3600 * fps) + (m * 60 * fps) + (s * fps) + f;
    } else if (parts.length === 3) {
      const [m, s, f] = parts;
      return (m * 60 * fps) + (s * fps) + f;
    } else if (parts.length === 2) {
      const [s, f] = parts;
      return (s * fps) + f;
    }
    return 0;
  };

  const formatFramesToTimecode = (frames: number, fps: number): string => {
    if (frames < 0) return "-" + formatFramesToTimecode(Math.abs(frames), fps);

    const f = Math.floor(frames % fps);
    const totalSeconds = Math.floor(frames / fps);
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  };

  const calculatedTimecodeOutput = useMemo(() => {
    const frames1 = parseTimecodeToFrames(tcInput1, timecodeFPS);
    const frames2 = parseTimecodeToFrames(tcInput2, timecodeFPS);
    
    const resultFrames = tcMathMode === 'add' ? frames1 + frames2 : frames1 - frames2;
    return {
      frames: resultFrames,
      timecode: formatFramesToTimecode(resultFrames, timecodeFPS)
    };
  }, [tcInput1, tcInput2, tcMathMode, timecodeFPS]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. File Size Calc Box */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl shadow-[vaR(--card-shadow)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-1.5 text-[8px] text-neutral-600 bg-neutral-900 border-b border-l border-neutral-800">
          SYS_CALC_MD_v24.0
        </div>
        
        <header className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 mb-1 flex items-center gap-2">
            <Film className="h-3 w-3 text-[#c4ff0e]" />
            [ MEDIA CALCULATION ENGINE ]
          </div>
          <h2 className="text-xl font-serif text-[#d7dbe3] tracking-wide uppercase">
            Deliverable Size Estimator
          </h2>
        </header>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                RESOLUTION MATRIX
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2.5 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e] transition-all"
              >
                <option value="1080p">1080p HD (1920x1080)</option>
                <option value="2.7K">2.7K Resolution (2704x1520)</option>
                <option value="4K UHD">4K UltraHD (3840x2160)</option>
                <option value="6K">6K Production (6144x3456)</option>
                <option value="8K">8K Cinema (7680x4320)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                TARGET FRAMERATE (FPS)
              </label>
              <select
                value={framerate}
                onChange={(e) => setFramerate(Number(e.target.value))}
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2.5 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e] transition-all"
              >
                <option value={23.976}>23.976 fps (Cinematic Film)</option>
                <option value={24}>24.000 fps (DCI Standard)</option>
                <option value={25}>25.000 fps (PAL Broadcast)</option>
                <option value={29.97}>29.970 fps (NTSC Broadcast)</option>
                <option value={30}>30.000 fps (Web Streaming)</option>
                <option value={50}>50.000 fps (High Speed PAL)</option>
                <option value={59.94}>59.940 fps (NTSC Slow-mo Base)</option>
                <option value={60}>60.000 fps (High Action Stream)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                CODEC ARCHITECTURE
              </label>
              <select
                value={codecIndex}
                onChange={(e) => {
                  setCodecIndex(Number(e.target.value));
                  setCustomBitrate("");
                }}
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2.5 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e] transition-all"
              >
                {CODEC_PRESETS.map((p, i) => (
                  <option key={p.name} value={i}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                CUSTOM BITRATE (MBPS)
              </label>
              <input
                type="number"
                value={customBitrate}
                onChange={(e) => setCustomBitrate(e.target.value)}
                placeholder={`Use Preset (${calculatedBitrateMbps} Mbps)`}
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-xs text-[#c4ff0e] placeholder-neutral-600 focus:outline-none focus:border-[#c4ff0e] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
              VIDEO SEQUENCE DURATION (H : M : S)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={durationH}
                  onChange={(e) => setDurationH(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-center text-[#c4ff0e] text-sm focus:outline-none"
                />
                <span className="absolute bottom-1 right-2 text-[8px] text-neutral-500">HRS</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationM}
                  onChange={(e) => setDurationM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-center text-[#c4ff0e] text-sm focus:outline-none"
                />
                <span className="absolute bottom-1 right-2 text-[8px] text-neutral-500">MIN</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationS}
                  onChange={(e) => setDurationS(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-center text-[#c4ff0e] text-sm focus:outline-none"
                />
                <span className="absolute bottom-1 right-2 text-[8px] text-neutral-500">SEC</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-950 p-4 border border-neutral-850 flex items-center justify-between gap-4 mt-5">
            <div>
              <div className="text-[10px] tracking-wider text-neutral-500 font-bold">
                ESTIMATED COMPRESS BANDWIDTH
              </div>
              <div className="text-xl font-mono text-[#c4ff0e] font-bold mt-1">
                ~{calculatedBitrateMbps.toFixed(1)} <span className="text-xs text-neutral-400">Mbps</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] tracking-wider text-neutral-400 font-bold">
                ESTIMATED CONTAINER COMPUTE SIZE
              </div>
              <div className="text-2xl font-mono text-white tracking-widest font-bold mt-1">
                {outputBytes >= 100
                  ? `${(outputBytes).toFixed(1)} GB`
                  : `${(outputBytes).toFixed(2)} GB`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SMPTE Timecode Math Box */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl shadow-[vaR(--card-shadow)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-1.5 text-[8px] text-neutral-600 bg-neutral-900 border-b border-l border-neutral-800">
          SYS_TC_MATH_v1.2
        </div>

        <header className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 mb-1 flex items-center gap-2">
            <Cpu className="h-3 w-3 text-[#f97316]" />
            [ TIME MATRIX ALGORITHM ]
          </div>
          <h2 className="text-xl font-serif text-[#d7dbe3] tracking-wide uppercase">
            SMPTE Timecode Calculator
          </h2>
        </header>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                TC ALGORITHM BASE (FPS)
              </label>
              <select
                value={timecodeFPS}
                onChange={(e) => setTimecodeFPS(Number(e.target.value))}
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2.5 text-xs text-[#f97316] focus:outline-none focus:border-[#f97316] transition-all"
              >
                <option value={23.976}>23.976 fps base multiplier</option>
                <option value={24}>24 fps (standard film)</option>
                <option value={25}>25 fps (PAL / European standard)</option>
                <option value={29.97}>29.97 fps (NTSC television broadcast)</option>
                <option value={30}>30 fps frame base</option>
                <option value={50}>50 fps broadcast stream</option>
                <option value={60}>60 fps cinematic stream</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                ARITHMETIC OPERAND
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTcMathMode('add')}
                  className={`py-2 text-xs font-bold transition-all border ${
                    tcMathMode === 'add'
                      ? 'bg-[#f97316] border-[#f97316] text-black'
                      : 'border-neutral-850 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  ADD (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTcMathMode('subtract')}
                  className={`py-2 text-xs font-bold transition-all border ${
                    tcMathMode === 'subtract'
                      ? 'bg-[#f97316] border-[#f97316] text-black'
                      : 'border-neutral-850 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  SUBTRACT (-)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                TIMECODE VAL_A
              </label>
              <input
                type="text"
                value={tcInput1}
                onChange={(e) => setTcInput1(e.target.value)}
                placeholder="HH:MM:SS:FF"
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-sm text-[#f97316] font-mono tracking-widest focus:outline-none focus:border-[#f97316] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-500 mb-1.5 font-bold tracking-wider">
                TIMECODE VAL_B
              </label>
              <input
                type="text"
                value={tcInput2}
                onChange={(e) => setTcInput2(e.target.value)}
                placeholder="HH:MM:SS:FF"
                className="w-full bg-neutral-900/80 border border-neutral-850 p-2 text-sm text-[#f97316] font-mono tracking-widest focus:outline-none focus:border-[#f97316] transition-all"
              />
            </div>
          </div>

          <div className="bg-neutral-950 p-4 border border-neutral-850 flex flex-col gap-2 mt-5">
            <div className="flex justify-between items-center text-[10px] text-neutral-500 tracking-wider font-bold">
              <span>RESOLVING MATH OPERATOR ...</span>
              <span className="text-neutral-600">SMPTE NDF BASE</span>
            </div>

            <div className="flex items-end justify-between mt-1">
              <div>
                <div className="text-[10px] text-neutral-500">TOTAL FRAME COUNT</div>
                <div className="text-lg font-mono text-neutral-300 font-bold">
                  {calculatedTimecodeOutput.frames} <span className="text-[10px] text-[#f97316]">fr</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-neutral-300 font-bold">SMPTE RESULT TIMECODE</div>
                <div className="text-2xl font-mono text-white tracking-widest font-bold text-[#f97316]">
                  {calculatedTimecodeOutput.timecode}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-start bg-neutral-900/40 p-3 text-[11px] leading-relaxed text-neutral-500 border border-neutral-850">
            <Info className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
            <span>
              Format constraints: Use standard SMPTE NDF formatted strings (example: <span className="text-neutral-400">01:05:12:08</span>). Calculates frame sums matching the selected drop-frame matrix.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
export default VideoCalculator;
