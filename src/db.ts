import Dexie, { type Table } from 'dexie';
import type {
  Client,
  CommsRow,
  EventRow,
  FinancialEntry,
  GamificationState,
  Lead,
  MilestoneRow,
  Receipt,
  RevisionRow
} from './types';

export const CLEAN_GAMIFICATION_STATE: GamificationState = {
  id: 1,
  currentLevel: 0,
  currentXp: 0,
  dailyStreak: 0,
  updatedAt: 0
};

const DEMO_CLIENT_NAMES = ['Aether Film Studios', 'Vaporwave Records'];
const DEMO_LEAD_NAMES = ['Cybernetic Athletics Org', 'Vapor Records Inc', 'Retro Synth Synthwaves'];
const DEMO_RECEIPT_VENDORS = ['Adobe Creative Cloud', 'Epidemic Sound'];
const DEMO_EVENT_TITLES = [
  'Frame.io Goth Cut feedback due',
  'EP Mix Stem files delivered',
  'Weekly Backup & Media Archive'
];
const DEMO_COMMS_PLATFORMS = ['Upwork Messenger', 'Fiverr Inbox', 'Client Discord Hub'];

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

async function deletePrimaryKeys<T>(table: Table<T, number>, keys: number[]) {
  if (keys.length > 0) {
    await table.bulkDelete(keys);
  }
}

export async function removeLegacyDemoData() {
  const now = Date.now();

  const demoClients = await db.clients.where('name').anyOf(DEMO_CLIENT_NAMES).toArray();
  const demoClientIds = demoClients
    .map((client) => client.id)
    .filter((id): id is number => typeof id === 'number');

  if (demoClientIds.length > 0) {
    const [milestoneKeys, revisionKeys, financialKeys, eventKeys] = await Promise.all([
      db.milestones.where('clientId').anyOf(demoClientIds).primaryKeys(),
      db.revisions.where('clientId').anyOf(demoClientIds).primaryKeys(),
      db.financials.where('clientId').anyOf(demoClientIds).primaryKeys(),
      db.events.where('clientId').anyOf(demoClientIds).primaryKeys()
    ]);

    await Promise.all([
      deletePrimaryKeys(db.milestones, milestoneKeys as number[]),
      deletePrimaryKeys(db.revisions, revisionKeys as number[]),
      deletePrimaryKeys(db.financials, financialKeys as number[]),
      deletePrimaryKeys(db.events, eventKeys as number[])
    ]);
  }

  await Promise.all([
    db.leads.where('companyName').anyOf(DEMO_LEAD_NAMES).delete(),
    db.receipts.where('vendor').anyOf(DEMO_RECEIPT_VENDORS).delete(),
    db.events.where('title').anyOf(DEMO_EVENT_TITLES).delete(),
    db.commsTracker.where('platform').anyOf(DEMO_COMMS_PLATFORMS).delete(),
    db.clients.where('name').anyOf(DEMO_CLIENT_NAMES).delete()
  ]);

  await db.gamification.put({
    ...CLEAN_GAMIFICATION_STATE,
    updatedAt: now
  });
}

export async function resetDatabaseToCleanState() {
  await db.delete();
  await db.open();
  await db.gamification.put({
    ...CLEAN_GAMIFICATION_STATE,
    updatedAt: Date.now()
  });
}
