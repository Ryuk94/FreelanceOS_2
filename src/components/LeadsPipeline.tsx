import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useToast } from './ToastContext';
import { Target, TrendingUp, AlertTriangle, ArrowRight, UserPlus, CheckCircle, Trash2, CheckSquare } from 'lucide-react';
import type { Lead } from '../types';

export function LeadsPipeline({ 
  onGrantXp 
}: { 
  onGrantXp: (amount: number, label: string) => Promise<void> 
}) {
  const { showToast } = useToast();
  
  // Dexie integrations
  const leads = useLiveQuery(() => db.leads.filter(l => !l.isDeleted).toArray(), []) ?? [];

  // Input states
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [xpReward, setXpReward] = useState<number>(20);

  // Pipeline summary
  const summary = useMemo(() => {
    const counts = { hunting: 0, proposal: 0, signed: 0 };
    leads.forEach(l => {
      if (counts[l.status] !== undefined) {
        counts[l.status]++;
      }
    });
    return counts;
  }, [leads]);

  // Actions
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = companyName.trim();
    if (!name) return;

    try {
      const now = Date.now();
      await db.leads.add({
        companyName: name,
        status: 'hunting',
        xpRewarded: xpReward,
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now
      });

      // Grant a small +15 XP for scouting prospects!
      await onGrantXp(15, `Prospect target logged: ${name}`);
      showToast(`Scouted Target: ${name} logged into pipeline (+15 XP)`);

      setCompanyName("");
      setNotes("");
      setXpReward(20);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (leadId: number, name: string, nextStatus: Lead['status']) => {
    try {
      await db.leads.update(leadId, {
        status: nextStatus,
        updatedAt: Date.now()
      });

      if (nextStatus === 'signed') {
        // Award massive +50 XP for closing clients!
        await onGrantXp(50, `Lead contract signed: ${name}`);
        showToast(`Target acquired! ${name} contract fully executed (+50 XP)`, 'success');
        
        // Automatically sync over to client vault!
        await db.clients.add({
          name,
          status: 'active',
          notes: `Created from converted pipeline lead dossier. Target contract signed.`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

      } else {
        showToast(`Lead adjusted to: ${nextStatus}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (leadId: number, name: string) => {
    try {
      await db.leads.update(leadId, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast(`Dossier archived for prospect: ${name}`, 'warn', async () => {
        await db.leads.update(leadId, { isDeleted: false });
        showToast(`Dossier recovered: ${name}`);
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target counts board */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl shadow-[vaR(--card-shadow)] relative overflow-hidden">
        <header className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.55em] text-neutral-500 mb-1 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#c4ff0e]" />
            [ PIPELINE SUMMARY FUNNEL ]
          </div>
          <h2 className="text-xl font-serif text-[#d7dbe3] uppercase tracking-wide">Hunting Dashboard</h2>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-950 p-4 border border-neutral-850">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500">Scouted Prospect</div>
            <div className="text-3xl font-mono text-[#c4ff0e] font-bold mt-1 tracking-widest">
              {summary.hunting} <span className="text-xs text-neutral-600">LOC</span>
            </div>
          </div>
          <div className="bg-neutral-950 p-4 border border-neutral-850">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500">Proposal Forwarded</div>
            <div className="text-3xl font-mono text-[#c4ff0e] font-bold mt-1 tracking-widest">
              {summary.proposal} <span className="text-xs text-neutral-600">SNT</span>
            </div>
          </div>
          <div className="bg-neutral-950 p-4 border border-neutral-850">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500">Converted Signed</div>
            <div className="text-3xl font-mono text-white font-bold mt-1 tracking-widest">
              {summary.signed} <span className="text-xs text-neutral-600">ACQ</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main workspace pipeline split: add vs. leads list */}
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Pipeline entries list */}
        <section className="space-y-4">
          <div className="text-[10px] text-neutral-500 tracking-[0.45em] uppercase font-bold pl-1">[ TARGETS INTERCEPT MAP ]</div>
          
          <div className="grid gap-3">
            {leads.map(l => (
              <div 
                key={l.id}
                className={`p-4 border transition-all relative ${
                  l.status === 'signed'
                    ? 'bg-neutral-950/20 border-[#c4ff0e]/15'
                    : 'bg-neutral-950 border-neutral-850'
                }`}
              >
                {/* Decorative border label */}
                <div className="absolute top-0 right-0 p-1 text-[8px] font-mono text-neutral-600 border-l border-b border-neutral-850 uppercase">
                  PIPE_{l.status}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-mono text-sm text-[#c4ff0e] font-bold tracking-wider uppercase mb-1">
                      {l.companyName}
                    </h3>
                    <p className="text-[11px] text-neutral-400 normal-case mb-2 font-mono leading-relaxed">
                      {l.notes || "No pipeline descriptions registered for this target."}
                    </p>
                    <div className="flex gap-2 items-center text-[9px] text-neutral-500">
                      <span>Value: <span className="text-neutral-300 font-bold">{l.xpRewarded} XP</span></span>
                      <span>•</span>
                      <span>Prospect Date: {new Date(l.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status operators */}
                    {l.status === 'hunting' && (
                      <button
                        onClick={() => handleUpdateStatus(l.id!, l.companyName, 'proposal')}
                        className="bg-neutral-900 border border-neutral-800 hover:border-[#c4ff0e] hover:text-[#c4ff0e] px-2.5 py-1.5 text-[9px] font-bold tracking-wider transition-all"
                      >
                        SEND PROPOSAL
                      </button>
                    )}

                    {l.status === 'proposal' && (
                      <button
                        onClick={() => handleUpdateStatus(l.id!, l.companyName, 'signed')}
                        className="bg-neutral-900 border border-[#c4ff0e]/30 hover:bg-[#c4ff0e] hover:text-black px-2.5 py-1.5 text-[9px] font-bold text-[#c4ff0e] tracking-wider transition-all"
                      >
                        CLOSE CONTRACT
                      </button>
                    )}

                    {l.status === 'signed' ? (
                      <div className="flex items-center gap-2 text-[#c4ff0e] text-[9px] font-bold bg-[#c4ff0e]/10 border border-[#c4ff0e]/20 px-2 py-1">
                        <CheckSquare className="h-3 w-3" /> ACQUIRED (CONVERTED TO VAULT)
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteLead(l.id!, l.companyName)}
                        className="p-1 px-1.5 bg-neutral-900 border border-neutral-800 hover:text-red-500 hover:border-red-500/30 text-neutral-500 transition-all text-[9px]"
                        title="Archive prospect"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {leads.length === 0 && (
              <div className="p-8 border border-dashed border-neutral-800 text-center rounded-lg font-mono text-neutral-600 uppercase text-xs">
                Zero pipeline leads tracked. Register newly located contacts on sidebar.
              </div>
            )}
          </div>
        </section>

        {/* Scout Form Sidepanel */}
        <section className="bg-black border border-neutral-800 p-5 rounded-xl self-start">
          <header className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-[#f97316] font-bold">[ TARGET ACQUISITON ]</div>
            <h3 className="text-lg font-serif text-white tracking-wide">Scout Prospect</h3>
          </header>

          <form onSubmit={handleAddLead} className="space-y-4">
            <div>
              <label className="block text-[9px] text-neutral-500 font-bold mb-1 tracking-wider">PROSPECT GROUP / TARGET NAME</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="E.G. WARNER CINEMA"
                className="w-full bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e] transition-all"
              />
            </div>

            <div>
              <label className="block text-[9px] text-neutral-500 font-bold mb-1 tracking-wider">PROJECT XP REWARD RATIO</label>
              <select
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#c4ff0e] focus:outline-none"
              >
                <option value={10}>10 XP (Quick Instagram Reel Edit)</option>
                <option value={20}>20 XP (Standard YouTube Assembly)</option>
                <option value={35}>35 XP (High Grade Corporate Cut)</option>
                <option value={50}>50 XP (Cinematic Feature Film Trailer )</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-neutral-500 font-bold mb-1 tracking-wider">SCOPE OF WORKS</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="PROSPECTS DETAILS, NEGOTIATED MILESTONES, REVISION ROUND LIMITS ..."
                className="w-full min-h-[90px] bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#c4ff0e] focus:outline-none focus:border-[#c4ff0e]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#f97316]/10 border border-[#f97316]/40 hover:bg-[#f97316] hover:text-black py-2.5 text-xs text-[#f97316] font-bold tracking-widest transition-all uppercase"
            >
              LOG PROSPECT CONTRACT
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
export default LeadsPipeline;
