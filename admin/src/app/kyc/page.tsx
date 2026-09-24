'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kycApi, type KYCQueueItem } from '@/lib/api';
import { formatDate, cn, formatRelativeTime } from '@/lib/utils';
import { FileText, Search, CheckCircle, XCircle, ArrowUpRight, Loader2, ShieldCheck, FileKey, Contact } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const ID_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  VOTER_ID: 'Voter ID',
};

function getIconForId(idType: string) {
  if (idType === 'PASSPORT') return FileKey;
  if (idType === 'VOTER_ID') return Contact;
  return FileText;
}

function KYCSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-[60px] rounded-full bg-[#EBEAE5]/50 animate-pulse" />
      ))}
    </div>
  );
}

export default function KYCPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  // Note: Modals would be implemented in a complete app, but we are focusing on the UI revamp of the main page
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  const { data: kycQueue = [], isLoading } = useQuery({
    queryKey: ['kyc-queue'],
    queryFn: () => kycApi.getQueue(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ kycId, approved }: { kycId: string; approved: boolean }) =>
      kycApi.review(kycId, { approved, reason: approved ? undefined : 'Declined via quick action' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setReviewLoading(null);
    },
  });

  const filteredQueue = kycQueue
    .filter((item) =>
      item.kycId.toLowerCase().includes(search.toLowerCase()) ||
      item.phoneNumber.includes(search) ||
      item.userId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleQuickReview = async (kycId: string, approved: boolean) => {
    setReviewLoading(kycId);
    await reviewMutation.mutateAsync({ kycId, approved });
  };

  const headerAction = (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search phone or user ID" 
          className="pl-10 pr-4 py-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] text-[13px] font-medium w-[240px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
        />
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="KYC Reviews"
      subtitle="Identity & Compliance"
      headerAction={headerAction}
    >
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex-1 min-h-0 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        
        {/* Header Control Row */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[18px] font-bold text-ink-primary">
              {filteredQueue.length} Pending
            </h3>
            <div className="bg-[#FF9A24] text-ink-primary px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-sm">
              Requires L3 action
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0 border-b border-black/[0.04] mb-2">
          <div className="col-span-3">User & Contact</div>
          <div className="col-span-3">Target Tier</div>
          <div className="col-span-3">Document Type</div>
          <div className="col-span-3 text-right pr-4">Actions</div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-2 pb-4">
          {isLoading ? (
            <KYCSkeleton />
          ) : filteredQueue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-tertiary">
              <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[14px] font-bold text-ink-primary">No pending KYC submissions</p>
              <p className="text-[12px] font-medium mt-1">The queue is clear. All users have been verified.</p>
            </div>
          ) : (
            filteredQueue.map((item) => {
              const Icon = getIconForId(item.idType);
              
              return (
                <div 
                  key={item.kycId} 
                  className="group grid grid-cols-12 gap-4 items-center px-4 py-2 rounded-full bg-[#EBEAE5] hover:brightness-95 transition-all cursor-pointer relative shrink-0"
                >
                  {/* User Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-ink-primary shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-ink-primary truncate">{item.phoneNumber}</p>
                      <p className="text-[11px] font-medium text-ink-tertiary truncate">User {item.userId.slice(0, 8)}</p>
                    </div>
                  </div>

                  {/* Target Tier */}
                  <div className="col-span-3 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#B292FA] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-white">{item.tier}</span>
                      </div>
                      <span className="text-[12px] font-bold text-ink-primary">Tier {item.tier} Upgrade</span>
                    </div>
                    <span className="text-[11px] text-ink-secondary mt-0.5">{formatRelativeTime(item.createdAt)}</span>
                  </div>

                  {/* Document Type */}
                  <div className="col-span-3 flex items-center">
                    <span className="px-3 py-1 bg-white rounded-full text-[11px] font-bold text-ink-secondary border border-black/[0.05]">
                      {ID_TYPE_LABELS[item.idType] || item.idType}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-2 pr-2">
                    {reviewLoading === item.kycId ? (
                      <div className="px-6 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" />
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleQuickReview(item.kycId, false)}
                          className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#F36960] shadow-sm hover:shadow-md hover:bg-[#F36960]/10 transition-all"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleQuickReview(item.kycId, true)}
                          className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#2ECA6A] shadow-sm hover:shadow-md hover:bg-[#2ECA6A]/10 transition-all"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); router.push('/fraud'); }} className="ml-1 w-9 h-9 rounded-full bg-ink-primary flex items-center justify-center text-white shadow-sm hover:bg-ink-primary/90 transition-all" title="View Trust Profile">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
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