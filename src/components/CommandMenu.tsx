import React, { useState, useEffect } from 'react';
import { db, seedDatabaseIfEmpty } from '../db';
import { useToast } from './ToastContext';
import { RefreshCw, Sparkles, Terminal, Bell } from 'lucide-react';

export function CommandMenu({ 
  open, 
  onClose,
  onGrantXp
}: { 
  open: boolean; 
  onClose: () => void;
  onGrantXp: (amount: number, label: string) => Promise<void>
}) {
  const { showToast } = useToast();
  
  // Quick Client Input
  const [quickClientName, setQuickClientName] = useState("");

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Actions
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickClientName.trim();
    if (!name) return;

    try {
      const clientId = await db.clients.add({
        name,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Seed core milestones checklist items for this new client right away
      const defaultChecklists = [
        { label: "Footage Ingestion & Proxies" },
        { label: "Rough Cut Assembly" },
        { label: "Audio Leveling & Sound Mix" },
        { label: "Creative LUT Color Grading" },
        { label: "Export and Render" }
      ];

      for (const item of defaultChecklists) {
        await db.milestones.add({
          clientId,
          itemKey: item.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          completed: false,
          updatedAt: Date.now()
        });
      }

      showToast(`Quick launched client: ${name}. Automated milestones initialized!`, 'success');
      setQuickClientName("");
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFullReset = async () => {
    if (!window.confirm("CRITICAL WARNING: This will flush Dexie indexes completely. Press OK to reboot terminal.")) {
      return;
    }

    try {
      await db.delete();
      await db.open();
      await seedDatabaseIfEmpty();
      showToast("Dossier arrays completely purged. Core firmware re-seeded.", 'success');
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestNotification = () => {
    showToast("NERV Terminal status checked: All communication conduits operating normally.", 'success');
    onClose();
  };

  const handleQuickBoostXp = async () => {
    await onGrantXp(40, "Direct NERV command line boost");
    showToast("Terminal command: +40 XP directly injected into Operator Ratings.", 'success');
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-black border-2 border-neutral-800 shadow-[0px_0px_32px_rgba(196,255,14,0.15)] rounded-lg relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-neutral-850 bg-neutral-950 flex justify-between items-center text-xs">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#c4ff0e] font-bold">[ TERMINAL CONDUIT ]</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Quick Direct Command Panel</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[10px] uppercase border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-400 hover:text-white"
          >
            ESC_CLOSE
          </button>
        </header>

        <div className="p-5 space-y-5">
          {/* Quick Client Add form inside cockpit */}
          <form onSubmit={handleQuickAddClient} className="space-y-2.5">
            <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              FAST_LAUNCH PROJECT CLIENT DIRECT (AUTOMATED INITIALIZATION CHECKS)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={quickClientName}
                onChange={(e) => setQuickClientName(e.target.value)}
                placeholder="CLIENT CODENAME / BRAND REGISTRY"
                className="flex-grow bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e]"
              />
              <button
                type="submit"
                className="bg-[#c4ff0e] text-black font-extrabold text-xs px-4 border border-[#c4ff0e] hover:bg-black hover:text-[#c4ff0e] transition-all"
              >
                SPAWN
              </button>
            </div>
          </form>

          {/* Core Command List buttons */}
          <div className="space-y-2 pt-2 border-t border-neutral-900">
            <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">OPERATIONS LOGS MANUAL TRIGGERS</span>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickBoostXp}
                className="p-3 bg-neutral-950 border border-neutral-850 text-left hover:border-[#c4ff0e] group transition-all"
              >
                <div className="text-xs font-bold text-[#c4ff0e] flex items-center gap-1.5 uppercase">
                  <Sparkles className="h-3.5 w-3.5" /> Inject +40 XP
                </div>
                <div className="text-[9px] text-neutral-500 font-mono lowercase mt-1 group-hover:text-neutral-400">test level gains and confetti engine</div>
              </button>

              <button
                type="button"
                onClick={handleTestNotification}
                className="p-3 bg-neutral-950 border border-neutral-850 text-left hover:border-[#c4ff0e] group transition-all"
              >
                <div className="text-xs font-bold text-[#c4ff0e] flex items-center gap-1.5 uppercase">
                  <Bell className="h-3.5 w-3.5" /> Test HUD Warning
                </div>
                <div className="text-[9px] text-neutral-500 font-mono lowercase mt-1 group-hover:text-neutral-400">triggers pop up alerts</div>
              </button>

              <button
                type="button"
                onClick={handleFullReset}
                className="p-3 bg-neutral-950 border border-neutral-850 text-left hover:border-[#f97316] group transition-all col-span-2"
              >
                <div className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase">
                  <RefreshCw className="h-3.5 w-3.5 text-red-500 animate-spin" /> Purge & Reboot Database
                </div>
                <div className="text-[9px] text-neutral-600 font-mono lowercase mt-1 normal-case leading-normal">
                  fully flushes local Dexie storage cache and reinstalls standard video editing sample records.
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CommandMenu;
