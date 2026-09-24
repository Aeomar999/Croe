'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { compareDecimalStrings, formatCurrency, formatRelativeTime, getReasonCodeLabel, cn } from '@/lib/utils';
import { Search, Package, ShoppingBag, ShieldAlert, Wallet, ArrowUpRight, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function getIconForReason(reason: string) {
  switch (reason) {
    case 'ITEM_NOT_RECEIVED': return Package;
    case 'ITEM_DAMAGED': return ShoppingBag;
    case 'WRONG_ITEM': return ShoppingBag;
    case 'ITEM_NOT_AS_DESCRIBED': return ShieldAlert;
    default: return Wallet;
  }
}

function getProviderColor(provider: string) {
  const p = provider.toLowerCase();
  if (p.includes('mtn')) return 'text-[#FFCC00]';
  if (p.includes('telecel')) return 'text-[#E31221]';
  if (p.includes('airtel')) return 'text-[#1E90FF]';
  return 'text-[#008985]';
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-[60px] rounded-full bg-[#EBEAE5]/50 animate-pulse" />
      ))}
    </div>
  );
}

export default function DisputesQueuePage() {
  const router = useRouter();
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(200),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('UNDER_HUMAN_REVIEW');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'amount'>('priority');

  const filteredDisputes = disputes
    .filter((d) => {
      const query = search.trim().toLowerCase();
      if (query && !d.disputeId.toLowerCase().includes(query) && !d.transactionId.toLowerCase().includes(query)) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'amount') return compareDecimalStrings(b.amount, a.amount);
      return 0;
    });

  const headerAction = (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search TXNs or Dispute IDs" 
          className="pl-10 pr-4 py-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] text-[13px] font-medium w-[240px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
        />
      </div>
      
      {/* Filters inside pill */}
      <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02]">
        <button 
          onClick={() => setStatusFilter('all')}
          className={cn("px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors", statusFilter === 'all' ? "bg-ink-primary text-white" : "text-ink-secondary hover:text-ink-primary")}
        >
          All Cases
        </button>
        <button 
          onClick={() => setStatusFilter('UNDER_HUMAN_REVIEW')}
          className={cn("px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5", statusFilter === 'UNDER_HUMAN_REVIEW' ? "bg-ink-primary text-white" : "text-ink-secondary hover:text-ink-primary")}
        >
          {statusFilter === 'UNDER_HUMAN_REVIEW' && <div className="w-1.5 h-1.5 rounded-full bg-[#FF9A24]" />}
          L3 Review Queue
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="L3 Review Queue"
      subtitle="Escrow Adjudication"
      headerAction={headerAction}
    >
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex-1 min-h-0 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        
        {/* Header Control Row */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[18px] font-bold text-ink-primary">
              {filteredDisputes.length} {filteredDisputes.length === 1 ? 'Case' : 'Cases'} Found
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-ink-secondary mr-2">Sort by:</span>
            <div className="flex items-center bg-[#EBEAE5] rounded-full p-1">
              <button onClick={() => setSortBy('priority')} className={cn("px-4 py-1 rounded-full text-[11px] font-bold transition-all", sortBy === 'priority' ? "bg-white text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary")}>
                Risk Score
              </button>
              <button onClick={() => setSortBy('amount')} className={cn("px-4 py-1 rounded-full text-[11px] font-bold transition-all", sortBy === 'amount' ? "bg-white text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary")}>
                Amount
              </button>
              <button onClick={() => setSortBy('date')} className={cn("px-4 py-1 rounded-full text-[11px] font-bold transition-all", sortBy === 'date' ? "bg-white text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary")}>
                Oldest
              </button>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0 border-b border-black/[0.04] mb-2">
          <div className="col-span-3">Dispute & Transaction</div>
          <div className="col-span-3">Escalation Issue</div>
          <div className="col-span-2">Value & Rail</div>
          <div className="col-span-2">AI Confidence</div>
          <div className="col-span-2 text-right pr-4">Due</div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-2 pb-4">
          {isLoading ? (
            <QueueSkeleton />
          ) : filteredDisputes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-tertiary">
              <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[14px] font-bold text-ink-primary">No cases match these filters</p>
              <p className="text-[12px] font-medium mt-1">Try clearing your search or switching tabs.</p>
            </div>
          ) : (
            filteredDisputes.map((dispute) => {
              const Icon = getIconForReason(dispute.reasonCode);
              const isHighPriority = dispute.priority > 500;
              const odds = isHighPriority ? Math.floor(Math.random() * 40) + 20 : Math.floor(Math.random() * 20) + 70; // Dummy odds logic for visualization
              const segments = Math.floor(odds / 10);
              
              return (
                <div 
                  key={dispute.disputeId} 
                  onClick={() => router.push(`/disputes/${dispute.disputeId}`)}
                  className="group grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-full bg-[#EBEAE5] hover:brightness-95 transition-all cursor-pointer relative shrink-0"
                >
                  
                  {/* Case Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-ink-primary shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-ink-primary truncate">TXN-{dispute.transactionId.slice(0, 6).toUpperCase()}</p>
                      <p className="text-[11px] font-medium text-ink-tertiary truncate">Dispute {dispute.disputeId.slice(0, 8)}</p>
                    </div>
                  </div>

                  {/* Blocking Issue */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", isHighPriority ? 'bg-[#F36960] text-white' : 'bg-[#FF9A24] text-ink-primary')}>
                      <AlertTriangle className="w-3 h-3" strokeWidth={3} />
                    </div>
                    <span className="text-[13px] font-medium text-ink-secondary truncate">
                      {getReasonCodeLabel(dispute.reasonCode)}
                    </span>
                  </div>

                  {/* Value & Payer */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <span className="text-[13px] font-bold text-ink-primary">{formatCurrency(dispute.amount, dispute.currency)}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-3.5 h-3.5 rounded-sm bg-white shadow-sm flex items-center justify-center shrink-0">
                        <span className={cn("text-[9px] font-black tracking-tighter", getProviderColor('MTN'))}>M</span>
                      </div>
                      <span className={cn("text-[10px] font-black tracking-tighter truncate", getProviderColor('MTN'))}>MTN MoMo</span>
                    </div>
                  </div>

                  {/* AI Confidence / Odds */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[13px] font-bold text-ink-primary w-8">{odds}%</span>
                    <div className="flex gap-[3px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                        <div 
                          key={bar} 
                          className={cn("w-[3px] h-2.5 rounded-[1px]", bar <= segments ? (odds > 70 ? 'bg-[#2ECA6A]' : odds > 50 ? 'bg-[#FFD700]' : 'bg-[#FF9A24]') : 'bg-black/10')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Due & Action */}
                  <div className="col-span-2 flex items-center justify-end gap-3 pr-2">
                    <span className="text-[12px] font-medium text-ink-secondary whitespace-nowrap">
                      {formatRelativeTime(dispute.createdAt)}
                    </span>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium text-ink-primary shadow-sm hover:shadow-md transition-all whitespace-nowrap">
                      Review
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
