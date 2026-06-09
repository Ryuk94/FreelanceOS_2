import React, { useMemo, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useToast } from './ToastContext';
import { 
  DollarSign, Receipt, PlusCircle, CreditCard, PieChart, 
  Trash2, Upload, AlertCircle, FileText, ChevronRight 
} from 'lucide-react';
import type { FinancialEntry } from '../types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(amount);
}

// Convert files to Base64 values for Dexie storage
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function FinancialLedger() {
  const { showToast } = useToast();
  
  // Dexie integrations
  const financials = useLiveQuery(() => db.financials.filter(f => !f.isDeleted).toArray(), []) ?? [];
  const receipts = useLiveQuery(() => db.receipts.filter(r => !r.isDeleted).toArray(), []) ?? [];
  const clients = useLiveQuery(() => db.clients.filter(c => !c.isDeleted).toArray(), []) ?? [];

  // Local financial input states
  const [clientIdStr, setClientIdStr] = useState<string>("global");
  const [entryType, setEntryType] = useState<'invoice' | 'expense' | 'deposit'>('invoice');
  const [entryAmount, setEntryAmount] = useState("");
  const [entryStatus, setEntryStatus] = useState<'sent' | 'pending' | 'paid' | 'overdue'>('pending');
  const [entryNotes, setEntryNotes] = useState("");

  // Target monthly financial parameters values [Vibe: EVA matrix Terminal]
  const targetMonthlyRevenue = 4000;

  // Local receipts input states
  const [recVendor, setRecVendor] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recImage, setRecImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Financial statistics calculations
  const stats = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    
    financials.forEach(f => {
      if (f.type === 'invoice' || f.type === 'deposit') {
        if (f.status === 'paid') {
          incomeSum += f.amount;
        }
      } else if (f.type === 'expense') {
        expenseSum += f.amount;
      }
    });

    const netCashflow = incomeSum - expenseSum;
    return {
      revenueCollected: incomeSum,
      recurringExpenses: expenseSum,
      netCashflow
    };
  }, [financials]);

  // Actions
  const handleAddFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(entryAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      const clientId = clientIdStr === "global" ? undefined : parseInt(clientIdStr);
      await db.financials.add({
        clientId,
        type: entryType,
        amount: amountNum,
        status: entryStatus,
        notes: entryNotes.trim(),
        date: Date.now(),
        updatedAt: Date.now()
      });

      showToast(`Ledger updated: logged ${entryType} for ${formatCurrency(amountNum)}`);
      setEntryAmount("");
      setEntryNotes("");
      setClientIdStr("global");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateInvoiceStatus = async (id: number, nextStatus: FinancialEntry['status']) => {
    try {
      await db.financials.update(id, {
        status: nextStatus,
        updatedAt: Date.now()
      });
      showToast(`Invoice status updated to: ${nextStatus}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLedgerEntry = async (id: number, type: string, amount: number) => {
    try {
      await db.financials.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast(`Archived ledger transaction of ${formatCurrency(amount)}`, 'warn', async () => {
        await db.financials.update(id, { isDeleted: false });
        showToast(`Transaction recovered.`);
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropReceipt = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setRecImage(files[0]);
      showToast(`Image loaded: ${files[0].name}`);
    }
  };

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(recAmount);
    if (!recVendor.trim() || isNaN(amt) || amt <= 0) return;

    let base64 = "";
    if (recImage) {
      try {
        base64 = await fileToBase64(recImage);
      } catch (err) {
        console.error('Failed encoding uploaded receipt layout file:', err);
      }
    }

    try {
      await db.receipts.add({
        date: Date.now(),
        amount: amt,
        vendor: recVendor.trim(),
        notes: recNotes.trim(),
        imageBase64: base64 || undefined,
        updatedAt: Date.now()
      });

      // Automatically duplicate into financials expenses log!
      await db.financials.add({
        type: 'expense',
        amount: amt,
        status: 'paid',
        notes: `Software/Hardware receipt: ${recVendor}`,
        date: Date.now(),
        updatedAt: Date.now()
      });

      showToast(`Logged receipt expense: ${recVendor} for ${formatCurrency(amt)}`);
      setRecVendor("");
      setRecAmount("");
      setRecNotes("");
      setRecImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReceipt = async (id: number, vendor: string) => {
    try {
      await db.receipts.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
      });
      showToast(`Archived expense receipt: ${vendor}`, 'warn', async () => {
        await db.receipts.update(id, { isDeleted: false });
        showToast(`Receipt restored.`);
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Health Summary cards */}
      <section className="bg-black border border-neutral-800 p-5 rounded-xl">
        <header className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.55em] text-neutral-500 mb-1 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-[#c4ff0e]" />
            [ FISCAL CONTROL MATRIX ]
          </div>
          <h2 className="text-xl font-serif text-white uppercase tracking-wide">Financial Core</h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-neutral-950 p-4 border border-neutral-850 flex flex-col justify-between">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">REVENUE PAID (NET)</div>
            <div className="text-2xl font-mono text-[#c4ff0e] font-bold mt-2">
              {formatCurrency(stats.revenueCollected)}
            </div>
            <div className="text-[9px] text-neutral-600 mt-2 uppercase tracking-wide">
              MTH GOAL: {formatCurrency(targetMonthlyRevenue)} ({Math.round(stats.revenueCollected / targetMonthlyRevenue * 100)}%)
            </div>
          </div>

          <div className="bg-neutral-950 p-4 border border-neutral-850 flex flex-col justify-between">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold font-mono">RECURRING OUTFLOW (BURN)</div>
            <div className="text-2xl font-mono text-[#f97316] font-bold mt-2">
              {formatCurrency(stats.recurringExpenses)}
            </div>
            <div className="text-[9px] text-neutral-600 mt-2 uppercase tracking-wide">
              SOFTWARE, HARWARE & CLOUD OVERHEADS
            </div>
          </div>

          <div className="bg-neutral-950 p-4 border border-neutral-850 flex flex-col justify-between">
            <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">NET OPERATING BANK CASH</div>
            <div className={`text-2xl font-mono font-bold mt-2 ${stats.netCashflow >= 0 ? 'text-white' : 'text-red-500'}`}>
              {formatCurrency(stats.netCashflow)}
            </div>
            <div className="text-[9px] text-neutral-600 mt-2 uppercase tracking-wide">
              ASSETS MINUS BURN RATE LOGS
            </div>
          </div>
        </div>

        {/* Goal progress indicator */}
        <div className="mt-4 pt-4 border-t border-neutral-900">
          <div className="flex justify-between items-center text-[9px] tracking-wide text-neutral-500 mb-1.5 font-bold">
            <span>MONTHLY SURPLUS TARGET VALUE PROGRESSION</span>
            <span>{Math.round(stats.revenueCollected / targetMonthlyRevenue * 100)}% DETAILED</span>
          </div>
          <div className="w-full bg-neutral-950 h-2 border border-neutral-850 rounded-full overflow-hidden">
            <div 
              className="bg-[#c4ff0e] h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(stats.revenueCollected / targetMonthlyRevenue * 100))}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main double column split: ledger vs. receipts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEDGER LOGGER */}
        <section className="space-y-4">
          <header className="flex justify-between items-center pb-2 border-b border-neutral-850">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">[ TRANSACTION LOG ]</div>
              <h3 className="text-base font-serif text-white tracking-wide">Financial Ledger</h3>
            </div>
          </header>

          <form onSubmit={handleAddFinancial} className="p-4 bg-neutral-900 border border-neutral-800 space-y-3 rounded-lg">
            <input 
              type="text" 
              style={{ display: 'none' }} 
              autoComplete="username" 
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[9px] text-neutral-500 font-bold mb-1">TRANSACTION TYPE</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['invoice', 'expense', 'deposit'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEntryType(t)}
                      className={`py-1 text-[9px] font-bold border transition-all ${
                        entryType === t
                          ? 'bg-[#c4ff0e] text-black border-[#c4ff0e]'
                          : 'bg-black text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-[#c4ff0e] font-bold mb-1">AMOUNT (£)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="E.G. 1200"
                  className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#c4ff0e] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[9px] text-neutral-500 font-bold mb-1">ASSOCIATE VAULT CLIENT</label>
                <select
                  value={clientIdStr}
                  onChange={(e) => setClientIdStr(e.target.value)}
                  className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#c4ff0e]"
                >
                  <option value="global">Unlinked Global Trans</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-neutral-500 font-bold mb-1">TRANSACTION STATE STATUS</label>
                <select
                  value={entryStatus}
                  onChange={(e) => setEntryStatus(e.target.value as any)}
                  className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#c4ff0e]"
                >
                  <option value="pending">Pending Hold</option>
                  <option value="sent">Invoice Sent</option>
                  <option value="paid">Cleared Paid</option>
                  <option value="overdue">Overdue Breach</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-neutral-500 font-bold mb-1">TRANSACTION MEMO NOTES</label>
              <input
                type="text"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                placeholder="E.G., DEPOSIT RETAINER / CAMERA BODY RENTAL EXPENSE ..."
                className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#c4ff0e] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-neutral-950 border border-neutral-800 text-xs font-bold text-[#c4ff0e] hover:bg-[#c4ff0e] hover:text-black tracking-widest transition-all"
            >
              COMMITT OPERATIONS TO LEDGER
            </button>
          </form>

          {/* Ledger Lists */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {financials.map(f => {
              const matchedClient = clients.find(c => c.id === f.clientId);
              return (
                <div 
                  key={f.id}
                  className={`p-3 border flex items-center justify-between gap-4 font-mono ${
                    f.status === 'paid' ? 'bg-neutral-950 border-neutral-850/60' : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-bold border px-1.5 py-0.5 uppercase ${
                        f.type === 'expense' 
                          ? 'border-[#f97316]/20 bg-[#f97316]/5 text-[#f97316]' 
                          : 'border-[#c4ff0e]/20 bg-[#c4ff0e]/5 text-[#c4ff0e]'
                      }`}>
                        {f.type}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-200">
                        {matchedClient?.name || "[ GLOBAL LINK ]"}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 normal-case leading-normal">{f.notes || "Dossier backup transaction"}</p>
                    <span className="text-[8px] text-neutral-600 block mt-1">LOGGED DATE: {new Date(f.date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-bold tracking-wider ${f.type === 'expense' ? 'text-[#f97316]' : 'text-[#c4ff0e]'}`}>
                        {f.type === 'expense' ? "-" : ""}{formatCurrency(f.amount)}
                      </div>
                      
                      {f.type === 'invoice' && f.status !== 'paid' && (
                        <button
                          onClick={() => handleUpdateInvoiceStatus(f.id!, 'paid')}
                          className="mt-1 text-[8px] font-bold border border-[#c4ff0e]/30 px-1 bg-[#c4ff0e]/10 text-[#c4ff0e] hover:bg-[#c4ff0e] hover:text-black transition-all"
                        >
                          SET PAID
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteLedgerEntry(f.id!, f.type, f.amount)}
                      className="text-neutral-600 hover:text-red-500 transition-colors"
                      title="Archive ledger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {financials.length === 0 && (
              <div className="p-8 border border-dashed border-neutral-800 text-center rounded text-xs text-neutral-600 uppercase">Ledger records clean. Log transactions upfront.</div>
            )}
          </div>
        </section>

        {/* VAULT INTAKES RECEIPTS */}
        <section className="space-y-4">
          <header className="flex justify-between items-center pb-2 border-b border-neutral-850">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#f97316] font-bold">[ VAULT STORAGE ]</div>
              <h3 className="text-base font-serif text-white tracking-wide">Receipt Ingestion</h3>
            </div>
          </header>

          {/* Form + Drag support */}
          <form onSubmit={handleAddReceipt} className="p-4 bg-neutral-900 border border-neutral-800 space-y-3 rounded-lg">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[9px] text-neutral-500 font-bold mb-1">VENDOR BRAND</label>
                <input
                  type="text"
                  required
                  value={recVendor}
                  onChange={(e) => setRecVendor(e.target.value)}
                  placeholder="E.G. ADOBE CORE"
                  className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#f97316] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] text-[#f97316] font-bold mb-1">VALUE MOUNT (£)</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="any"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  placeholder="E.G. 45.99"
                  className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#f97316] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-neutral-500 font-bold mb-1">EXPENSE DESCRIPTION</label>
              <input
                type="text"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                placeholder="E.G., SUBSCRIPTION / EXTERNAL DRIVE BACKUP ..."
                className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-[#f97316] focus:outline-none"
              />
            </div>

            {/* Drag & Drop File Selector */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropReceipt}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-neutral-800 hover:border-[#f97316] p-4 text-center cursor-pointer transition-all bg-neutral-950/40 rounded flex flex-col items-center justify-center gap-1.5"
            >
              <Upload className="h-5 w-5 text-neutral-600" />
              <div className="text-[10px] text-neutral-400 font-bold">DRAG & DROP RECEIPT IMAGE, OR TAP TO EXPLORE</div>
              <div className="text-[8px] text-neutral-600">LIMIT SIZE: jpeg/png compressed locally</div>
              {recImage && (
                <div className="text-[9px] text-[#f97316] bg-[#f97316]/10 px-2 py-0.5 border border-[#f97316]/25 mt-1 font-mono uppercase">
                  {recImage.name} (PROCESSED)
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) setRecImage(e.target.files[0]);
                }}
                accept="image/*"
                className="hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-neutral-950 border border-neutral-800 text-xs font-bold text-[#f97316] hover:bg-[#f97316] hover:text-black tracking-widest transition-all"
            >
              INGEST EXPENSE RECEIPT
            </button>
          </form>

          {/* Receipts grid logs */}
          <div className="grid gap-3 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-1">
            {receipts.map(rec => (
              <div key={rec.id} className="p-3 bg-neutral-950 border border-neutral-850 flex flex-col justify-between font-mono gap-2 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-bold text-neutral-200 uppercase">{rec.vendor}</div>
                    <div className="text-[8px] text-neutral-500 uppercase">{new Date(rec.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#f97316]">{formatCurrency(rec.amount)}</div>
                  </div>
                </div>

                {rec.notes && <p className="text-[9px] text-neutral-500 leading-normal normal-case">{rec.notes}</p>}

                {rec.imageBase64 && (
                  <div className="h-16 w-full border border-neutral-900 bg-neutral-900 overflow-hidden relative group">
                    <img 
                      src={rec.imageBase64} 
                      alt={rec.vendor} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="text-[8px] text-[#f97316]">EXPAND MEDIA</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1.5 border-t border-neutral-900">
                  <span className="text-[7px] text-neutral-700">INVENT_ID_{rec.id}</span>
                  <button
                    onClick={() => handleDeleteReceipt(rec.id!, rec.vendor)}
                    className="text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {receipts.length === 0 && (
              <div className="col-span-2 p-8 border border-dashed border-neutral-800 text-center rounded text-xs text-neutral-600 uppercase">No storage receipts ingested here.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
export default FinancialLedger;
