/**
 * Shared Type Definitions for Freelance Video Editor Tracker
 */

export interface Lead {
  id?: number;
  companyName: string;
  status: 'hunting' | 'proposal' | 'signed' | 'archived';
  xpRewarded: number;
  notes?: string;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id?: number;
  name: string;
  status: 'active' | 'archived';
  notes?: string;
  quickLinks?: Array<{ title: string; url: string }>;
  brandKits?: Array<{
    id: number;
    name: string;
    tone: string;
    typography: string;
    swatches: string[];
    sourceText?: string;
    createdAt: number;
    updatedAt: number;
  }>;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FinancialEntry {
  id?: number;
  clientId?: number;
  type: 'invoice' | 'expense' | 'deposit';
  amount: number;
  status: 'pending' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  date: number;
  isDeleted?: boolean;
  updatedAt: number;
}

export interface GamificationState {
  id: number; // Single active row ID: 1
  currentLevel: number;
  currentXp: number;
  dailyStreak: number;
  lastActiveDate?: string; // YYYY-MM-DD
  updatedAt: number;
}

export interface Receipt {
  id?: number;
  date: number;
  amount: number;
  vendor: string;
  notes?: string;
  imageBase64?: string;
  isDeleted?: boolean;
  updatedAt: number;
}

export interface CommsRow {
  id?: number;
  platform: string;
  lastChecked: number;
  isDeleted?: boolean;
  updatedAt: number;
}

export interface EventRow {
  id?: number;
  title: string;
  clientId?: number | null;
  date: number;
  allDay: boolean;
  isDeleted?: boolean;
  updatedAt: number;
}

export interface RevisionRow {
  id?: number;
  clientId: number;
  timecode: string; // e.g. "01:05:12"
  note: string;
  status: 'pending' | 'resolved';
  createdAt: number;
  updatedAt: number;
}

export interface MilestoneRow {
  id?: number;
  clientId: number;
  itemKey: string; // e.g. "ingestion", "rough_cut", etc.
  completed: boolean;
  updatedAt: number;
}
