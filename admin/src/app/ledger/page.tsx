'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils';
import { Database, Search, ArrowDownToLine, Filter, Play, CheckCircle2, ShieldAlert, AlertTriangle, Wallet, Bot, Lock, Calendar } from 'lucide-react';
import { useState } from 'react';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const LEDGER_EVENTS = [
  { id: '1', type: 'FUNDS_SECURED', txId: 'TXN-9011', amount: '1250.00', currency: 'GHS', user: 'SYSTEM', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '2', type: 'DISPUTE_OPENED', txId: 'TXN-8829', amount: '4800.00', currency: 'GHS', user: 'Buyer: @davidk', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  { id: '3', type: 'FUNDS_RELEASED', txId: 'TXN-4421', amount: '320.00', currency: 'GHS', user: 'AI Arbitrator', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: '4', type: 'REFUND_ISSUED', txId: 'TXN-1029', amount: '550.00', currency: 'GHS', user: 'L3 Reviewer: Sarah', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '5', type: 'FRAUD_LOCKOUT', txId: 'SYS-AUTH', amount: null, currency: null, user: 'SYSTEM', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
  { id: '6', type: 'AI_PROCESSING', txId: 'TXN-8829', amount: null, currency: null, user: 'SYSTEM', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { id: '7', type: 'FUNDS_SECURED', txId: 'TXN-1123', amount: '950.00', currency: 'GHS', user: 'SYSTEM', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8) },
  { id: '8', type: 'FUNDS_SECURED', txId: 'TXN-3912', amount: '4100.00', currency: 'GHS', user: 'SYSTEM', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12) },
];

function getEventIcon(type: string) {
  switch (type) {
    case 'FUNDS_SECURED': return { icon: Lock, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/20' };
    case 'DISPUTE_OPENED': return { icon: AlertTriangle, color: 'text-[#FF9A24]', bg: 'bg-[#FF9A24]/20' };
    case 'FUNDS_RELEASED': return { icon: CheckCircle2, color: 'text-[#2ECA6A]', bg: 'bg-[#2ECA6A]/20' };
    case 'REFUND_ISSUED': return { icon: Wallet, color: 'text-[#F36960]', bg: 'bg-[#F36960]/20' };
    case 'FRAUD_LOCKOUT': return { icon: ShieldAlert, color: 'text-[#F36960]', bg: 'bg-[#F36960]/20' };
    case 'AI_PROCESSING': return { icon: Bot, color: 'text-[#B292FA]', bg: 'bg-[#B292FA]/20' };
    default: return { icon: Database, color: 'text-ink-secondary', bg: 'bg-black/5' };
  }
}

export default function LedgerPage() {
  const [search, setSearch] = useState('');
  
  const headerAction = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Hash, TXN, or Event" 
          className="pl-10 pr-4 py-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] text-[13px] font-medium w-[240px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
        />
      </div>
      <button className="px-5 py-2.5 rounded-full bg-white border border-black/10 text-[13px] font-medium text-ink-primary hover:bg-black/5 transition-colors shadow-sm flex items-center gap-2">
        <Filter className="w-4 h-4 text-ink-secondary" /> Filters
      </button>
      <button className="px-5 py-2.5 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors shadow-sm flex items-center gap-2">
        <ArrowDownToLine className="w-4 h-4" /> Export CSV
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Platform Ledger Log"
      subtitle="Immutable cryptographic event firehose"
      headerAction={headerAction}
    >
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex-1 min-h-0 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        
        {/* Header Control Row */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBEAE5] flex items-center justify-center">
              <Database className="w-5 h-5 text-ink-primary" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-ink-primary">transaction_ledger</h3>
              <p className="text-[12px] text-ink-tertiary font-medium mt-0.5">Live streaming mode</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-[#2ECA6A]/20 text-[#2ECA6A] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2ECA6A] animate-pulse" />
              Real-time connected
            </div>
            <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
              <Play className="w-4 h-4" fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0 border-b border-black/[0.04] mb-2">
          <div className="col-span-3">Event Type & TXN</div>
          <div className="col-span-3">Amount</div>
          <div className="col-span-3">Actor</div>
          <div className="col-span-3 text-right">Timestamp & Hash</div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-2 pb-4">
          {LEDGER_EVENTS.map((event) => {
            const { icon: Icon, color, bg } = getEventIcon(event.type);
            
            return (
              <div 
                key={event.id} 
                className="group grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-[24px] bg-[#EBEAE5] hover:brightness-95 transition-all cursor-pointer relative shrink-0"
              >
                {/* Event Type & TXN */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink-primary truncate">{event.type.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] font-medium text-ink-tertiary truncate">{event.txId}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="col-span-3 flex flex-col justify-center">
                  {event.amount ? (
                    <>
                      <span className={cn("text-[14px] font-bold", event.type.includes('RELEASED') || event.type.includes('SECURED') ? "text-[#2ECA6A]" : event.type.includes('REFUND') ? "text-[#F36960]" : "text-ink-primary")}>
                        {formatCurrency(event.amount, event.currency!)}
                      </span>
                      <span className="text-[10px] font-medium text-ink-tertiary uppercase mt-0.5">Numeric(15,2)</span>
                    </>
                  ) : (
                    <span className="text-[14px] font-bold text-ink-tertiary">--</span>
                  )}
                </div>

                {/* Actor */}
                <div className="col-span-3 flex items-center">
                  <span className="px-3 py-1 bg-white rounded-full text-[11px] font-bold text-ink-secondary border border-black/[0.05]">
                    {event.user}
                  </span>
                </div>

                {/* Timestamp & Hash */}
                <div className="col-span-3 flex flex-col items-end justify-center pr-2">
                  <span className="text-[12px] font-medium text-ink-secondary whitespace-nowrap mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-ink-tertiary" /> {formatRelativeTime(event.timestamp.toISOString())}
                  </span>
                  <span className="text-[9px] font-mono font-medium text-ink-tertiary px-2 py-0.5 bg-black/5 rounded uppercase tracking-wider">
                    {Array.from({ length: 8 }, () => Math.random().toString(36).charAt(2)).join('')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AdminLayout>
  );
}