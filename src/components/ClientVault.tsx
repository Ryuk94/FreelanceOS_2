import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useToast } from './ToastContext';
import { 
  Users, Folder, Trash2, Plus, Link, FileText, CheckSquare, 
  HelpCircle, Sparkles, PlusCircle, CheckCircle, RefreshCw, Layers 
} from 'lucide-react';
import type { Client, MilestoneRow, RevisionRow } from '../types';

function normalizeStatus(client?: Client) {
  return client?.status ?? 'active';
}

function extractSwatches(text: string): string[] {
  const matches = text.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g) ?? [];
  // Deduplicate and normalize to uppercase
  return Array.from(new Set(matches.map(hex => hex.toUpperCase())));
}

export function ClientVault({ 
  onGrantXp 
}: { 
  onGrantXp: (amount: number, label: string) => Promise<void> 
}) {
  const { showToast } = useToast();
  
  // Dexie integrations
  const clients = useLiveQuery(() => db.clients.filter(c => !c.isDeleted).toArray(), []) ?? [];
  const milestones = useLiveQuery(() => db.milestones.toArray(), []) ?? [];
  const revisions = useLiveQuery(() => db.revisions.toArray(), []) ?? [];

  // Local state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  
  // Brand Kit input state
  const [rawGuidelines, setRawGuidelines] = useState("");
  const [kitTone, setKitTone] = useState("");
  const [kitTypography, setKitTypography] = useState("");

  // Quick link input state
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Revision state
  const [revTimecode, setRevTimecode] = useState("00:00:00:00");
  const [revNote, setRevNote] = useState("");

  // Client vault statistics
  const activeClients = useMemo(() => clients.filter(c => normalizeStatus(c) === 'active'), [clients]);
  const archivedClients = useMemo(() => clients.filter(c => normalizeStatus(c) === 'archived'), [clients]);

  // Selected client object resolving
  const selectedClient = useMemo(() => {
    if (selectedClientId !== null) {
      const found = clients.find(c => c.id === selectedClientId);
      if (found) return found;
    }
    return activeClients[0] ?? archivedClients[0] ?? null;
  }, [selectedClientId, clients, activeClients, archivedClients]);

  // Sync back state
  useEffect(() => {
    if (selectedClient && selectedClient.id !== selectedClientId) {
      setSelectedClientId(selectedClient.id ?? null);
    }
  }, [selectedClient, selectedClientId]);

  // Scratchpad draft state
  const [draft, setDraft] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      setDraft(selectedClient.notes ?? "");
      setIsDirty(false);
    }
  }, [selectedClient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save scratchpad effect
  useEffect(() => {
    if (!selectedClient?.id || !isDirty) return;

    const timerId = window.setTimeout(async () => {
      try {
        await db.clients.update(selectedClient.id!, {
          notes: draft,
          updatedAt: Date.now()
        });
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to autosave notes:', error);
      }
    }, 800);

    return () => window.clearTimeout(timerId);
  }, [selectedClient?.id, draft, isDirty]);

  // Client milestones & revision details specifically
  const clientMilestones = useMemo(() => {
    if (!selectedClient?.id) return [];
    return milestones.filter(m => m.clientId === selectedClient.id);
  }, [milestones, selectedClient]);

  const clientRevisions = useMemo(() => {
    if (!selectedClient?.id) return [];
    return revisions.filter(r => r.clientId === selectedClient.id);
  }, [revisions, selectedClient]);

  const milestonesProgressPercent = useMemo(() => {
    if (clientMilestones.length === 0) return 0;
    const completed = clientMilestones.filter(m => m.completed).length;
    return Math.round((completed / clientMilestones.length) * 100);
  }, [clientMilestones]);

  // Actions
  const handleToggleMilestone = async (id: number, currentCompleted: boolean, label: string) => {
    try {
      await db.milestones.update(id, {
        completed: !currentCompleted,
        updatedAt: Date.now()
      });
      // If completed, award +10 XP
      if (!currentCompleted) {
        await onGrantXp(10, `Milestone completed: ${label}`);
        showToast(`Milestone completed: ${label} (+10 XP)`);
      } else {
        showToast(`Milestone unchecked: ${label}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id || !revNote.trim()) return;

    try {
      await db.revisions.add({
        clientId: selectedClient.id,
        timecode: revTimecode || "00:00:00",
        note: revNote.trim(),
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setRevNote("");
      showToast("Revision feedback item added to timeline.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveRevision = async (id: number, timecode: string) => {
    try {
      await db.revisions.update(id, {
        status: 'resolved',
        updatedAt: Date.now()
      });
      // Award +15 XP for resolving feedback!
      await onGrantXp(15, `Client revision resolved at ${timecode}`);
      showToast(`Revision solved! Added (+15 XP) at timecode ${timecode}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBrandKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id) return;

    const swatches = extractSwatches(rawGuidelines);
    const now = Date.now();
    const currentKits = selectedClient.brandKits ?? [];

    const newKit = {
      id: now,
      name: `PALETTE_${currentKits.length + 1}`,
      tone: kitTone.trim() || "Pro Dynamic",
      typography: kitTypography.trim() || "IBM Plex Mono",
      swatches,
      sourceText: rawGuidelines.trim(),
      createdAt: now,
      updatedAt: now
    };

    try {
      await db.clients.update(selectedClient.id, {
        brandKits: [...currentKits, newKit],
        updatedAt: now
      });
      setRawGuidelines("");
      setKitTone("");
      setKitTypography("");
      showToast("Colors swatches automatically parsed and kit saved.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuickLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id || !linkUrl.trim()) return;

    try {
      const currentLinks = selectedClient.quickLinks ?? [];
      const title = linkTitle.trim() || new URL(linkUrl).hostname.replace(/^www\./, '');
      const nextLinks = [...currentLinks, { title, url: linkUrl.trim() }];

      await db.clients.update(selectedClient.id, {
        quickLinks: nextLinks,
        updatedAt: Date.now()
      });
      setLinkTitle("");
      setLinkUrl("");
      showToast("Shared launch launcher link registered.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveClient = async () => {
    if (!selectedClient?.id) return;
    try {
      await db.clients.update(selectedClient.id, {
        status: 'archived',
        updatedAt: Date.now()
      });
      showToast(`Vault client archived: ${selectedClient.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient?.id) return;
    try {
      await db.clients.update(selectedClient.id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast(`Deleted client, backups archived.`, 'warn');
      setSelectedClientId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Index Sidebar */}
      <aside className="bg-black border border-neutral-800 p-4 rounded-xl flex flex-col gap-4 self-start">
        <header className="flex justify-between items-center pb-2 border-b border-neutral-850">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500">[ DATABASES ]</div>
            <h3 className="text-sm font-bold text-neutral-200">Active Records</h3>
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-[9px] uppercase border border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 px-2 py-1 text-neutral-300"
          >
            Archive ({archivedClients.length})
          </button>
        </header>

        {/* Directory lists */}
        <div className="space-y-4">
          <div className="space-y-1.5 animate-fadeIn">
            <div className="text-[9px] text-[#c4ff0e] tracking-widest pl-1 font-bold">● ACTIVE SECTOR</div>
            {activeClients.length === 0 ? (
              <div className="text-[10px] text-neutral-600 italic pl-1 leading-normal">Zero active folders. Enter commands index above to create.</div>
            ) : (
              activeClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id ?? null)}
                  className={`w-full px-3 py-2 text-left text-xs tracking-wider transition-all border flex items-center justify-between ${
                    selectedClient?.id === c.id
                      ? 'bg-[#c4ff0e] text-black border-[#c4ff0e]'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-700'
                  }`}
                >
                  <span className="truncate font-bold uppercase">{c.name}</span>
                  <span className="text-[9px] opacity-60">
                    {milestones.filter(m => m.clientId === c.id && m.completed).length}/
                    {milestones.filter(m => m.clientId === c.id).length} COMP
                  </span>
                </button>
              ))
            )}
          </div>

          {showArchived && (
            <div className="space-y-1.5 select-none animate-fadeIn">
              <div className="text-[9px] text-neutral-500 tracking-widest pl-1 font-bold">◌ OFF-LINE ARCHIVE</div>
              {archivedClients.length === 0 ? (
                <div className="text-[10px] text-neutral-700 italic pl-1">Zero folders archived.</div>
              ) : (
                archivedClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id ?? null)}
                    className={`w-full px-3 py-2 text-left text-xs tracking-wider transition-all border flex items-center justify-between ${
                      selectedClient?.id === c.id
                        ? 'bg-neutral-800 text-white border-neutral-700'
                        : 'bg-neutral-950/40 text-neutral-500 border-neutral-900 hover:border-neutral-850'
                    }`}
                  >
                    <span className="truncate uppercase">{c.name}</span>
                    <span className="text-[8px] opacity-50">ARCHIVE</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main client folder */}
      {selectedClient ? (
        <article className="space-y-6">
          {/* Client Folder Header */}
          <header className="bg-black border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-neutral-500 tracking-[0.5em] uppercase mb-1">
                [ VAULT DOSSIER ]
              </div>
              <h1 className="text-3xl font-serif text-white uppercase tracking-wide">
                {selectedClient.name}
              </h1>
              <div className="flex gap-2 items-center mt-2 font-mono text-[10px]">
                <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 uppercase text-[9px]">
                  STATUS: {normalizeStatus(selectedClient)}
                </span>
                <span className="text-neutral-500">
                  Registered: {new Date(selectedClient.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleArchiveClient}
                disabled={normalizeStatus(selectedClient) === 'archived'}
                className="px-3 py-2 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-[#f97316] hover:border-[#f97316]/30 disabled:opacity-40 font-bold transition-all"
              >
                ARCHIVE RECORD
              </button>
              <button
                onClick={handleDeleteClient}
                className="px-3 py-2 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-500/30 font-bold transition-all"
              >
                STRIKE FILES
              </button>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Col: Checklist Milestones + Client Revision feedback list */}
            <div className="space-y-6">
              {/* EDITING TRACKER CHECKS */}
              <section className="bg-black border border-neutral-800 p-5 rounded-xl relative">
                <header className="mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#c4ff0e] font-bold">[ PROGRESS STAGE ENGINE ]</div>
                    <h3 className="text-lg font-serif text-white tracking-wide">Production Pipeline</h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#c4ff0e]">{milestonesProgressPercent}%</span>
                </header>

                {/* Progress bar */}
                <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden mb-4 border border-neutral-850">
                  <div 
                    className="bg-[#c4ff0e] h-full transition-all duration-500"
                    style={{ width: `${milestonesProgressPercent}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {clientMilestones.length === 0 ? (
                    <div className="text-xs text-neutral-500 italic py-2">No pipeline checklist mapped.</div>
                  ) : (
                    clientMilestones.map(m => (
                      <label 
                        key={m.id}
                        className={`flex items-start gap-3 p-2.5 border transition-all cursor-pointer ${
                          m.completed 
                            ? 'bg-neutral-950/20 border-[#c4ff0e]/15 text-neutral-400 line-through' 
                            : 'bg-neutral-950/60 border-neutral-850 text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={m.completed}
                          onChange={() => handleToggleMilestone(m.id!, m.completed, m.label)}
                          className="h-4 w-4 rounded-none accent-[#c4ff0e] mt-0.5 shrink-0"
                        />
                        <span className="text-[11px] font-mono leading-tight flex-1 uppercase tracking-wider">{m.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </section>

              {/* TIMECODE FEEDBACK COCKPIT */}
              <section className="bg-black border border-neutral-800 p-5 rounded-xl">
                <header className="mb-4">
                  <div className="text-[9px] uppercase tracking-widest text-[#f97316] font-bold">[ TIMECODE REVISION BUFFER ]</div>
                  <h3 className="text-lg font-serif text-white tracking-wide">Director Feedback</h3>
                </header>

                {/* Add new feedback */}
                <form onSubmit={handleAddNewRevision} className="grid grid-cols-[100px_1fr_auto] gap-2 p-2 bg-neutral-950 border border-neutral-850 mb-4 rounded">
                  <input
                    type="text"
                    value={revTimecode}
                    onChange={(e) => setRevTimecode(e.target.value)}
                    placeholder="00:02:15"
                    className="bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#f97316] font-mono text-center focus:outline-none"
                  />
                  <input
                    type="text"
                    value={revNote}
                    onChange={(e) => setRevNote(e.target.value)}
                    placeholder="E.G., SOUND FX IS MUTED ..."
                    className="bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#f97316] focus:outline-none placeholder-neutral-600"
                  />
                  <button
                    type="submit"
                    className="bg-neutral-900 border border-neutral-800 px-3 hover:bg-[#f97316] hover:text-black hover:border-[#f97316] transition-all font-bold text-[#f97316] text-xs"
                  >
                    ADD
                  </button>
                </form>

                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {clientRevisions.length === 0 ? (
                    <div className="text-xs text-neutral-600 italic py-4 border border-dashed border-neutral-850 text-center">No reported feedback items reported on timelines.</div>
                  ) : (
                    clientRevisions.map(r => (
                      <div 
                        key={r.id}
                        className={`p-3 border transition-all flex justify-between items-start gap-4 ${
                          r.status === 'resolved'
                            ? 'bg-neutral-950/20 border-neutral-900/40 opacity-50'
                            : 'bg-neutral-950/80 border-neutral-850'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#f97316] bg-[#f97316]/10 px-1.5 py-0.5 border border-[#f97316]/25">
                              {r.timecode}
                            </span>
                            <span className="text-[8px] text-neutral-500 uppercase tracking-widest font-mono">
                              {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-neutral-300 normal-case leading-relaxed">{r.note}</p>
                        </div>

                        {r.status === 'pending' ? (
                          <button
                            onClick={() => handleResolveRevision(r.id!, r.timecode)}
                            className="bg-neutral-900 border border-[#f97316]/30 hover:bg-[#f97316] hover:text-black px-2.5 py-1.5 text-[9px] font-bold text-[#f97316] tracking-wider shrink-0 transition-all"
                          >
                            RESOLVED
                          </button>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-[#c4ff0e] shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Col: Shared Links, Auto-saving Scratchpad, Color extract swatches */}
            <div className="space-y-6">
              {/* LAUNCH LINKS */}
              <section className="bg-black border border-neutral-800 p-5 rounded-xl">
                <header className="mb-4">
                  <div className="text-[9px] uppercase tracking-widest text-[#c4ff0e] font-bold">[ PORTAL LAUNCH MATRIX ]</div>
                  <h3 className="text-lg font-serif text-white tracking-wide">Workspace Links</h3>
                </header>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(selectedClient.quickLinks ?? []).map((lnk, idx) => (
                    <a
                      key={idx}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-neutral-950/80 border border-neutral-850 p-2.5 text-left hover:border-[#c4ff0e] hover:bg-[#c4ff0e]/5 hover:text-[#c4ff0e] transition-all flex items-center gap-2 group"
                    >
                      <Link className="h-3 w-3 text-neutral-500 group-hover:text-[#c4ff0e]" />
                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-neutral-200">{lnk.title}</div>
                        <div className="truncate text-[8px] text-neutral-600 tracking-normal font-mono lowercase">{lnk.url}</div>
                      </div>
                    </a>
                  ))}
                  {(selectedClient.quickLinks ?? []).length === 0 && (
                    <div className="col-span-2 text-xs text-neutral-500 italic py-2">No portal links launched. Register downbelow.</div>
                  )}
                </div>

                {/* Add Quick Link Form */}
                <form onSubmit={handleAddQuickLink} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 p-2 bg-neutral-950 border border-neutral-850 rounded">
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="SHORT NAME"
                    className="bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#c4ff0e] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="HTTPS://DRIVE.GOOGLE.COM/..."
                    className="bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#c4ff0e] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-neutral-900 border border-neutral-800 px-3 hover:bg-[#c4ff0e] hover:text-black hover:border-[#c4ff0e] transition-all font-bold text-xs text-[#c4ff0e]"
                  >
                    +
                  </button>
                </form>
              </section>

              {/* AUTO-SAVE EDITOR NOTE SPAD */}
              <section className="bg-black border border-neutral-800 p-5 rounded-xl">
                <header className="mb-2">
                  <div className="text-[9px] uppercase tracking-widest text-[#c4ff0e] font-bold">[ SCRATCHPAD BUFFER ]</div>
                  <h3 className="text-lg font-serif text-white tracking-wide">Ingest Logs</h3>
                </header>
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="CAPTURE SHOTLIST NOTES, TIMELINE WORKFLOWS, DELIVERABLES, TRANSITION NOTES, LUT SETS ..."
                  className="font-mono text-xs w-full min-h-[140px] max-h-[300px] p-3 text-[#c4ff0e] placeholder-neutral-700 bg-neutral-950/60 border border-neutral-850 outline-none focus:border-[#c4ff0e]/30 transition-all leading-relaxed"
                />
                <div className="flex justify-between items-center text-[10px] text-neutral-600 mt-1.5 font-mono">
                  <span>AUTO-SAVE CONTROLLER ACTIVE</span>
                  <span>{isDirty ? "BUFFER WRITING..." : "SYNCED TO DATABASE"}</span>
                </div>
              </section>

              {/* COLOR EXTRACTOR PALETTES */}
              <section className="bg-black border border-neutral-800 p-5 rounded-xl">
                <header className="mb-3">
                  <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">[ BRAND COLOR CHANNELS ]</div>
                  <h3 className="text-lg font-serif text-white tracking-wide">Brand Palette</h3>
                </header>

                <div className="space-y-4">
                  {(selectedClient.brandKits ?? []).map((kit) => (
                    <div key={kit.id} className="p-3 bg-neutral-950 border border-neutral-850 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-200">{kit.name}</span>
                        <span className="text-[9px] text-[#c4ff0e] font-mono lowercase">{kit.typography}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 tracking-wide normal-case mb-1 leading-relaxed">{kit.tone}</div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {kit.swatches.map((hex, i) => (
                          <div 
                            key={i}
                            className="h-7 w-7 rounded-none border border-neutral-800 cursor-pointer relative group shrink-0"
                            style={{ backgroundColor: hex }}
                            title={hex}
                            onClick={() => {
                              navigator.clipboard.writeText(hex);
                              showToast(`Copied Hex Color: ${hex}`);
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 text-[8px] text-white transition-opacity">
                              COPY
                            </span>
                          </div>
                        ))}
                        {kit.swatches.length === 0 && (
                          <div className="text-[9px] text-neutral-600 italic">No RGB codes extracted from parsed text.</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Extract form */}
                  <form onSubmit={handleCreateBrandKit} className="space-y-3 p-3 bg-neutral-950/50 border border-neutral-900 border-dashed">
                    <div className="text-[9px] text-neutral-400">PASTE BRAND GUIDES (AUTOMATICALLY PARSES HEX CODES)</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kitTone}
                        onChange={(e) => setKitTone(e.target.value)}
                        placeholder="MOOD (E.G. CHILL VHS)"
                        className="w-1/2 bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#c4ff0e]"
                      />
                      <input
                        type="text"
                        value={kitTypography}
                        onChange={(e) => setKitTypography(e.target.value)}
                        placeholder="FONTS: MONO / SANS"
                        className="w-1/2 bg-neutral-900 border border-neutral-800 p-2 text-xs text-[#c4ff0e]"
                      />
                    </div>
                    <textarea
                      value={rawGuidelines}
                      onChange={(e) => setRawGuidelines(e.target.value)}
                      placeholder="#C4FF0E leads primary focus. Light accents are #FF6F6F..."
                      className="font-mono text-xs w-full min-h-[60px] p-2 text-neutral-300 bg-neutral-900 border border-neutral-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full bg-neutral-950 border border-neutral-850 hover:border-[#c4ff0e] hover:text-black hover:bg-[#c4ff0e] p-2 text-[10px] text-neutral-300 font-bold tracking-wider transition-all"
                    >
                      PARSING CHANNELS & EXTRACT
                    </button>
                  </form>
                </div>
              </section>
            </div>
          </div>
        </article>
      ) : (
        <div className="bg-black border border-neutral-800 border-dashed p-10 text-center rounded-xl font-mono">
          <Folder className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-neutral-300 uppercase">Vault Offline</h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto uppercase tracking-wide">
            Zero active directories or client registers logged. Use the quick command panel to create your first client.
          </p>
        </div>
      )}
    </div>
  );
}
export default ClientVault;
