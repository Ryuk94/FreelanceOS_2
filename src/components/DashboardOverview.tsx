import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useToast } from './ToastContext';
import { 
  XpLevelIndicator 
} from './XpLevelCard';
import { 
  Trophy, MessageSquare, Calendar, Plus, Clock, Globe, Laptop, Heart, Info, CheckCircle 
} from 'lucide-react';
import type { GamificationState } from '../types';

export function DashboardOverview({ 
  onGrantXp 
}: { 
  onGrantXp: (amount: number, label: string) => Promise<void> 
}) {
  const { showToast } = useToast();
  
  // Dexie integrations
  const clients = useLiveQuery(() => db.clients.filter(c => !c.isDeleted).toArray(), []) ?? [];
  const events = useLiveQuery(() => db.events.filter(e => !e.isDeleted).toArray(), []) ?? [];
  const commsRows = useLiveQuery(() => db.commsTracker.filter(c => !c.isDeleted).toArray(), []) ?? [];
  
  const [commsInput, setCommsInput] = useState("");

  // Calendar Event forms
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventClient, setEventClient] = useState<string>("global");

  // Summary widgets details
  const activeCountValue = useMemo(() => clients.filter(c => c.status === 'active').length, [clients]);
  
  // Ordered events calculations
  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
  }, [events]);

  // Actions
  const handleAddNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    try {
      const parts = eventDate.split("-").map(Number);
      const timestamp = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
      const clientId = eventClient === "global" ? null : parseInt(eventClient);

      await db.events.add({
        title: eventTitle.trim(),
        clientId,
        date: timestamp,
        allDay: true,
        updatedAt: Date.now()
      });

      showToast(`Agenda booked: ${eventTitle}`);
      setEventTitle("");
      setEventDate("");
      setEventClient("global");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogCommsCheck = async (id: number, platform: string) => {
    try {
      const now = Date.now();
      await db.commsTracker.update(id, {
        lastChecked: now,
        updatedAt: now
      });
      // Award +5 XP for checking in on client communications channels
      await onGrantXp(5, `Communication channel check-in: ${platform}`);
      showToast(`Comms secured: ${platform} cleared and checked (+5 XP)`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = commsInput.trim();
    if (!name) return;

    try {
      await db.commsTracker.add({
        platform: name,
        lastChecked: 0,
        updatedAt: Date.now()
      });
      setCommsInput("");
      showToast(`Communication channel added: ${name}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlatform = async (id: number) => {
    try {
      await db.commsTracker.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast("Comms channel archived.", 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: number, title: string) => {
    try {
      await db.events.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast(`Event removed: ${title}`, 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Col 1: Gamification indicators (XP LEVEL CARD) */}
      <section className="space-y-6 lg:col-span-1">
        <XpLevelIndicator />

        {/* Tactical status details */}
        <div className="bg-black border border-neutral-800 p-5 rounded-xl text-neutral-400 space-y-4">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">[ SECTOR TELEMETRY ]</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-neutral-850 p-3 bg-neutral-950/50">
              <span className="text-[8px] text-neutral-500 uppercase">ACTIVE CONTRACTS</span>
              <div className="text-xl font-bold font-mono text-white mt-1 uppercase">
                {activeCountValue} <span className="text-[10px] text-neutral-500 font-normal">UNITS</span>
              </div>
            </div>
            
            <div className="border border-neutral-850 p-3 bg-neutral-950/50">
              <span className="text-[8px] text-neutral-500 uppercase">EVENTS ACTIVE</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {events.length} <span className="text-[10px] text-neutral-500 font-normal">TIMS</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center bg-neutral-950 p-3 border border-neutral-850">
            <Heart className="h-4 w-4 text-[#c4ff0e] pulse-indicator shrink-0" />
            <div className="text-[10px] uppercase font-mono leading-none">
              NERV CORE SYS ONLINE
            </div>
          </div>
        </div>
      </section>

      {/* Col 2: Calendar Upcoming Events */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl flex flex-col justify-between">
        <div>
          <header className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#f97316] font-bold">[ STRATEGIC SCHEDULE ]</div>
              <h3 className="text-lg font-serif text-white tracking-wide">Strategic Agenda</h3>
            </div>
            <span className="text-[8px] border border-neutral-700 bg-neutral-950 px-2 py-0.5 text-neutral-500 uppercase">UPCOMING</span>
          </header>

          <div className="space-y-2 mb-4">
            {upcomingEvents.map(ev => {
              const matchedC = clients.find(c => c.id === ev.clientId);
              return (
                <div key={ev.id} className="p-3 bg-neutral-950 border border-neutral-850 text-xs font-mono flex items-center justify-between gap-3 group">
                  <div>
                    <div className="font-bold text-neutral-200 tracking-wide">{ev.title}</div>
                    <div className="text-[8.5px] text-neutral-500 mt-1 uppercase">
                      {matchedC?.name || "Global / Personal Operations"} • {new Date(ev.date).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteEvent(ev.id!, ev.title)}
                    className="text-neutral-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove event"
                  >
                    CLOSE
                  </button>
                </div>
              );
            })}

            {upcomingEvents.length === 0 && (
              <div className="p-8 border border-dashed border-neutral-800 text-center text-xs text-neutral-600 uppercase">
                Tactical schedule clear. Add events downwards.
              </div>
            )}
          </div>
        </div>

        {/* Add event form */}
        <form onSubmit={handleAddNewEvent} className="pt-4 border-t border-neutral-900 space-y-3">
          <div className="text-[9px] text-[#f97316] font-bold tracking-wider">[ ADD NEW TARGET EVENT ]</div>
          <div className="grid gap-2">
            <input
              type="text"
              required
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="EVENT TITLE E.G. DELIVER RENDER"
              className="w-full bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#f97316] placeholder-neutral-700 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#f97316] focus:outline-none"
              />
              <select
                value={eventClient}
                onChange={(e) => setEventClient(e.target.value)}
                className="bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#f97316]"
              >
                <option value="global">Unlinked Global</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-neutral-950 border border-neutral-800 hover:border-[#f97316] hover:bg-[#f97316]/10 py-1.5 text-[10px] text-[#f97316] font-bold tracking-wider transition-all"
          >
            AUTHORIZE PLAN EVENTS ID
          </button>
        </form>
      </section>

      {/* Col 3: Communications Hub Status Tracker */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl flex flex-col justify-between">
        <div>
          <header className="mb-4">
            <div className="text-[9px] uppercase tracking-widest text-[#c4ff0e] font-bold">[ COMMUNICATION PROT STATUS ]</div>
            <h3 className="text-lg font-serif text-white tracking-wide">Sync Checkpoint</h3>
          </header>

          <div className="space-y-2 mb-4">
            {commsRows.map(com => {
              const checkedWithin24h = (Date.now() - com.lastChecked) < 24 * 60 * 60 * 1000;
              return (
                <div 
                  key={com.id} 
                  className={`p-3 border flex items-center justify-between gap-4 font-mono text-xs ${
                    checkedWithin24h ? 'bg-neutral-950/40 border-neutral-900/60' : 'bg-neutral-900 border-neutral-850'
                  }`}
                >
                  <div>
                    <div className="font-bold uppercase tracking-wider text-neutral-200">{com.platform}</div>
                    <div className="text-[8px] text-neutral-600 mt-1 uppercase">
                      Checked: {com.lastChecked ? new Date(com.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "NEVER"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLogCommsCheck(com.id!, com.platform)}
                      className={`px-2 py-1 text-[8px] font-bold font-mono transition-all border ${
                        checkedWithin24h 
                          ? 'border-neutral-800 bg-neutral-950 text-neutral-500 cursor-default'
                          : 'border-[#c4ff0e]/30 bg-[#c4ff0e]/5 text-[#c4ff0e] hover:bg-[#c4ff0e] hover:text-black hover:border-transparent'
                      }`}
                      disabled={checkedWithin24h}
                    >
                      {checkedWithin24h ? "SECURE" : "CHECK (+5XP)"}
                    </button>
                    
                    <button
                      onClick={() => handleDeletePlatform(com.id!)}
                      className="text-neutral-700 hover:text-red-500 text-[9px] px-1 font-mono transition-colors"
                      title="Archive platform"
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}

            {commsRows.length === 0 && (
              <div className="p-8 border border-dashed border-neutral-800 text-center text-xs text-neutral-600 uppercase">
                No messaging channels registered. Add new downwards.
              </div>
            )}
          </div>
        </div>

        {/* Add Comms Platform */}
        <form onSubmit={handleAddNewPlatform} className="pt-4 border-t border-neutral-900 space-y-3">
          <div className="text-[9px] text-[#c4ff0e] font-bold tracking-wider">[ REGISTER MESSAGING HUB ]</div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={commsInput}
              onChange={(e) => setCommsInput(e.target.value)}
              placeholder="Platform name E.g., Upwork"
              className="flex-1 bg-neutral-950 border border-neutral-850 p-2 text-xs text-[#c4ff0e] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-neutral-950 border border-neutral-800 hover:border-[#c4ff0e] px-4 font-bold text-xs text-[#c4ff0e]"
            >
              +
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
export default DashboardOverview;
