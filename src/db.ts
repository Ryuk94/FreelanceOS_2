import Dexie, { type Table } from 'dexie';
import type { 
  Lead, 
  Client, 
  FinancialEntry, 
  GamificationState, 
  Receipt, 
  CommsRow, 
  EventRow,
  RevisionRow,
  MilestoneRow
} from './types';

export class FreelanceDatabase extends Dexie {
  leads!: Table<Lead, number>;
  clients!: Table<Client, number>;
  financials!: Table<FinancialEntry, number>;
  gamification!: Table<GamificationState, number>;
  receipts!: Table<Receipt, number>;
  commsTracker!: Table<CommsRow, number>;
  events!: Table<EventRow, number>;
  revisions!: Table<RevisionRow, number>;
  milestones!: Table<MilestoneRow, number>;

  constructor() {
    super('FreelanceDatabase');
    this.version(1).stores({
      leads: '++id, companyName, status, isDeleted',
      clients: '++id, name, status, isDeleted',
      financials: '++id, clientId, type, status, isDeleted',
      gamification: 'id',
      receipts: '++id, date, vendor, isDeleted',
      commsTracker: '++id, platform, isDeleted',
      events: '++id, title, clientId, date, isDeleted',
      revisions: '++id, clientId, status',
      milestones: '++id, clientId, itemKey'
    });
  }
}

export const db = new FreelanceDatabase();

// Ingest Initial Seed Data if Completely Empty
export async function seedDatabaseIfEmpty() {
  const clientCount = await db.clients.count();
  if (clientCount > 0) return; // Database already seeded

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Seed Gamification
  await db.gamification.put({
    id: 1,
    currentLevel: 4,
    currentXp: 45,
    dailyStreak: 8,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    updatedAt: now
  });

  // 2. Seed Clients
  const clientId1 = await db.clients.add({
    name: "Aether Film Studios",
    status: 'active',
    notes: "Direct collaboration with director Sarah. Video Style: Cinematic Sci-Fi, heavy neon grade. Deliverables: 1x Main Trailer (16:9), 3x Social Cuts (9:16).",
    quickLinks: [
      { title: "Frame.io Link", url: "https://frame.io" },
      { title: "Google Drive Assets", url: "https://drive.google.com" },
      { title: "Music Cue Sheet", url: "https://sheets.google.com" }
    ],
    brandKits: [
      {
        id: now,
        name: "Neon Goth Palette",
        tone: "Cinematic, cyberpunk Goth, extremely high-contrast darks, vibrant emerald/amethyst splashes.",
        typography: "Space Grotesk (Headers), IBM Plex Mono (Data)",
        swatches: ["#020617", "#c4ff0e", "#10b981", "#a855f7", "#ec4899"],
        sourceText: "Use dark shadows #020617. Splash of Neon Lime #c4ff0e and emerald #10b981 accents. Accentuate with synth colors pink #ec4899 and amethyst #a855f7.",
        createdAt: now,
        updatedAt: now
      }
    ],
    createdAt: now - 30 * dayMs,
    updatedAt: now
  });

  const clientId2 = await db.clients.add({
    name: "Vaporwave Records",
    status: 'active',
    notes: "Lofi Beats compilation animation. Style: Retro-futuristic VHS loops, pastel purples, glitch effects. Deliverables: 10x 1-hour lofi music video backing tracks.",
    quickLinks: [
      { title: "Audio stems folder", url: "https://dropbox.com" },
      { title: "Graphics Kit", url: "https://figma.com" }
    ],
    brandKits: [
      {
        id: now + 1,
        name: "Retro Sunset Theme",
        tone: "Chill, analog VHS texture, warm nostalgia",
        typography: "Playfair Display (Vintage Titles), Inter",
        swatches: ["#1e1b4b", "#f97316", "#fb7185", "#38bdf8"],
        createdAt: now,
        updatedAt: now
      }
    ],
    createdAt: now - 15 * dayMs,
    updatedAt: now
  });

  // 3. Seed Milestone Checklist Items
  const checklistItems = [
    { clientId: clientId1, itemKey: "ingestion", label: "Media Ingestion & Proxy Creation", completed: true },
    { clientId: clientId1, itemKey: "assembly", label: "Rough Assembly / Sound Sync", completed: true },
    { clientId: clientId1, itemKey: "fine_cut", label: "A-Roll / Narrative Flow Approved", completed: false },
    { clientId: clientId1, itemKey: "audio_mix", label: "Dialogue Levelling & Music Splicing", completed: false },
    { clientId: clientId1, itemKey: "color_grade", label: "Creative LUT & Color Grade", completed: false },
    { clientId: clientId1, itemKey: "graphics", label: "VFX Glitch Overlays & Titles", completed: false },
    { clientId: clientId1, itemKey: "master_render", label: "HQ Export & Frame.io Delivery", completed: false },
    
    { clientId: clientId2, itemKey: "ingestion", label: "Import Stems & Select Loops", completed: true },
    { clientId: clientId2, itemKey: "assembly", label: "Assemble 1-Hour Audio Timeline", completed: true },
    { clientId: clientId2, itemKey: "fine_cut", label: "Animate VHS Screen Drifts", completed: true },
    { clientId: clientId2, itemKey: "audio_mix", label: "Dynamic Bass Boosting EQ", completed: true },
    { clientId: clientId2, itemKey: "graphics", label: "Glitch Title Text Overlays", completed: false }
  ];

  for (const item of checklistItems) {
    await db.milestones.add({
      clientId: item.clientId,
      itemKey: item.itemKey,
      completed: item.completed,
      updatedAt: now
    });
  }

  // 4. Seed Revisions (Timecoded client feedback)
  await db.revisions.add({
    clientId: clientId1,
    timecode: "00:03:15",
    note: "The LUT conversion on Sarah's close-up has blown out skin highlight clips. Pull down white levels by 4%.",
    status: 'pending',
    createdAt: now - 2 * dayMs,
    updatedAt: now
  });

  await db.revisions.add({
    clientId: clientId1,
    timecode: "00:01:24",
    note: "Sound FX when the starship drives past is slightly muted. Boost space engine rumble by +3dB.",
    status: 'pending',
    createdAt: now - 1 * dayMs,
    updatedAt: now
  });

  await db.revisions.add({
    clientId: clientId2,
    timecode: "00:45:10",
    note: "Fixed periodic static popping in audio track - re-bounced music track with high-frequency limiter.",
    status: 'resolved',
    createdAt: now - 3 * dayMs,
    updatedAt: now
  });

  // 5. Seed Leads (Pipeline)
  await db.leads.add({
    companyName: "Cybernetic Athletics Org",
    status: 'proposal',
    xpRewarded: 25,
    notes: "Requested a quote for editing an eSports promo trailer. Estimated budget: £1,200. Sent proposal on Tuesday.",
    createdAt: now - 10 * dayMs,
    updatedAt: now
  });

  await db.leads.add({
    companyName: "Vapor Records Inc",
    status: 'signed',
    xpRewarded: 15,
    notes: "Lo-Fi Beats ongoing collaboration project, fully signed.",
    createdAt: now - 8 * dayMs,
    updatedAt: now
  });

  await db.leads.add({
    companyName: "Retro Synth Synthwaves",
    status: 'hunting',
    xpRewarded: 10,
    notes: "Spoke via LinkedIn. Interested in retro title animation sequences in Premiere / After Effects.",
    createdAt: now - 2 * dayMs,
    updatedAt: now
  });

  // 6. Seed Financial Ledger
  await db.financials.add({
    clientId: clientId1,
    type: 'invoice',
    amount: 1800,
    status: 'sent',
    notes: "Milestone 1 & 2 Completed: Assembly Narrative approved. Due in 5 days.",
    date: now,
    updatedAt: now
  });

  await db.financials.add({
    clientId: clientId1,
    type: 'invoice',
    amount: 1200,
    status: 'paid',
    notes: "Project Downpayment (40% retainer booked upfront immediately).",
    date: now - 30 * dayMs,
    updatedAt: now
  });

  await db.financials.add({
    clientId: clientId2,
    type: 'invoice',
    amount: 950,
    status: 'paid',
    notes: "Lofi album animation volume 1 package.",
    date: now - 14 * dayMs,
    updatedAt: now
  });

  await db.financials.add({
    clientId: clientId1,
    type: 'expense',
    amount: 50,
    status: 'paid',
    notes: "Premium CineLUT pack license (custom cinematic grade matching).",
    date: now - 28 * dayMs,
    updatedAt: now
  });

  // 7. Seed Receipts (Vault Intake)
  await db.receipts.add({
    date: now - 12 * dayMs,
    amount: 45.99,
    vendor: "Adobe Creative Cloud",
    notes: "Recurring monthly software subscription for Premiere Pro, After Effects, and Photoshop.",
    updatedAt: now
  });

  await db.receipts.add({
    date: now - 5 * dayMs,
    amount: 85.00,
    vendor: "Epidemic Sound",
    notes: "Yearly commercial sync soundtrack membership for stream deliverables.",
    updatedAt: now
  });

  // 8. Seed Comms Status Tracker
  await db.commsTracker.add({
    platform: "Upwork Messenger",
    lastChecked: now - 2 * 60 * 60 * 1000, // 2h ago
    updatedAt: now
  });

  await db.commsTracker.add({
    platform: "Fiverr Inbox",
    lastChecked: now - 6 * 1000, // Just checked
    updatedAt: now
  });

  await db.commsTracker.add({
    platform: "Client Discord Hub",
    lastChecked: now - 18 * 60 * 60 * 1000, // 18h ago
    updatedAt: now
  });

  // 9. Seed Calendar / Releasing Events
  await db.events.add({
    title: "Frame.io Goth Cut feedback due",
    clientId: clientId1,
    date: now + 1 * dayMs,
    allDay: true,
    updatedAt: now
  });

  await db.events.add({
    title: "EP Mix Stem files delivered",
    clientId: clientId2,
    date: now + 3 * dayMs,
    allDay: false,
    updatedAt: now
  });

  await db.events.add({
    title: "Weekly Backup & Media Archive",
    clientId: null,
    date: now + 5 * dayMs,
    allDay: true,
    updatedAt: now
  });
}
