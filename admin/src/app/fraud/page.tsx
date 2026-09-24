'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserListItem } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Search, Loader2, ShieldAlert, ShieldCheck, UserX, SlidersHorizontal, Lock, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function FraudPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [trustScoreModal, setTrustScoreModal] = useState<{ user: UserListItem | null; score: number }>({ user: null, score: 0 });
  const [trustScoreReason, setTrustScoreReason] = useState('');
  const [trustScoreLoading, setTrustScoreLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getAll(),
  });

  const freezeMutation = useMutation({
    mutationFn: ({ userId, frozen }: { userId: string; frozen: boolean }) =>
      usersApi.freeze(userId, { frozen, reason: 'Quick action via Fraud Dashboard' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setActionLoading(null);
    },
  });

  const trustScoreMutation = useMutation({
    mutationFn: ({ userId, trust_score, reason }: { userId: string; trust_score: number; reason: string }) =>
      usersApi.adjustTrustScore(userId, { trust_score, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setTrustScoreModal({ user: null, score: 0 });
      setTrustScoreReason('');
    },
  });

  const filteredUsers = users
    .filter((u) =>
      u.userId.toLowerCase().includes(search.toLowerCase()) ||
      u.phoneNumber.includes(search)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleQuickFreeze = async (userId: string, frozen: boolean) => {
    setActionLoading(userId);
    await freezeMutation.mutateAsync({ userId, frozen });
  };

  const handleTrustScore = async () => {
    if (!trustScoreModal.user || !trustScoreReason.trim()) return;
    setTrustScoreLoading(true);
    await trustScoreMutation.mutateAsync({
      userId: trustScoreModal.user.userId,
      trust_score: trustScoreModal.score,
      reason: trustScoreReason,
    });
    setTrustScoreLoading(false);
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
          placeholder="Search by ID or phone..." 
          className="pl-10 pr-4 py-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] text-[13px] font-medium w-[240px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
        />
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="Trust & Fraud"
      subtitle="Account integrity and manual lockouts"
      headerAction={headerAction}
    >
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex-1 min-h-0 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        
        {/* Header Control Row */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[18px] font-bold text-ink-primary">
              {filteredUsers.length} Users Indexed
            </h3>
            <div className="bg-[#F36960]/10 text-[#F36960] px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-sm">
              <ShieldAlert className="w-3 h-3" /> High Risk Monitoring Active
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0 border-b border-black/[0.04] mb-2">
          <div className="col-span-4">Account & Handle</div>
          <div className="col-span-3">Trust Score & Tier</div>
          <div className="col-span-2">Account Status</div>
          <div className="col-span-3 text-right pr-4">Security Actions</div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-2 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-[60px] rounded-full bg-[#EBEAE5]/50 animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-tertiary">
              <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[14px] font-bold text-ink-primary">No users found</p>
              <p className="text-[12px] font-medium mt-1">Try clearing your search query.</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isHighRisk = user.trustScore < 30;
              const isCaution = user.trustScore >= 30 && user.trustScore < 70;
              
              return (
                <div 
                  key={user.userId} 
                  className={cn("group grid grid-cols-12 gap-4 items-center px-4 py-2.5 rounded-full hover:brightness-95 transition-all cursor-pointer relative shrink-0", user.isFrozen ? "bg-[#F36960]/5 border border-[#F36960]/10" : "bg-[#EBEAE5]")}
                >
                  {/* User Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-ink-primary shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-[14px] font-bold truncate", user.isFrozen ? "text-[#F36960]" : "text-ink-primary")}>{user.phoneNumber}</p>
                      <p className="text-[11px] font-medium text-ink-tertiary truncate">ID: {user.userId.slice(0, 8)}</p>
                    </div>
                  </div>

                  {/* Trust Score & Tier */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="flex flex-col justify-center">
                       <span className={cn("text-[14px] font-bold", isHighRisk ? "text-[#F36960]" : isCaution ? "text-[#FF9A24]" : "text-[#2ECA6A]")}>
                         {user.trustScore}/100
                       </span>
                       <span className="text-[9px] font-bold text-ink-tertiary uppercase mt-0.5">Trust Score</span>
                    </div>
                    <div className="w-px h-6 bg-black/5" />
                    <div className="flex flex-col justify-center">
                       <span className="text-[14px] font-bold text-ink-primary">Tier {user.kycTier}</span>
                       <span className="text-[9px] font-bold text-ink-tertiary uppercase mt-0.5">KYC Level</span>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="col-span-2 flex items-center">
                    {user.isFrozen ? (
                      <div className="px-3 py-1 bg-[#F36960]/10 rounded-full text-[11px] font-bold text-[#F36960] flex items-center gap-1.5 border border-[#F36960]/20">
                        <Lock className="w-3 h-3" /> FROZEN
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-white rounded-full text-[11px] font-bold text-ink-secondary flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <CheckCircle2 className="w-3 h-3 text-[#2ECA6A]" /> ACTIVE
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-2 pr-2">
                    {actionLoading === user.userId ? (
                      <div className="px-6 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" />
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setTrustScoreModal({ user, score: user.trustScore }); setTrustScoreReason(''); }}
                          className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-bold text-ink-secondary shadow-sm hover:shadow-md hover:text-ink-primary transition-all flex items-center gap-1.5"
                        >
                          <SlidersHorizontal className="w-3 h-3" /> Adjust Score
                        </button>
                        
                        {user.isFrozen ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickFreeze(user.userId, false); }}
                            className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#2ECA6A] shadow-sm hover:shadow-md hover:bg-[#2ECA6A]/10 transition-all"
                            title="Unfreeze Account"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickFreeze(user.userId, true); }}
                            className="w-8 h-8 rounded-full bg-[#F36960] border border-black/10 flex items-center justify-center text-white shadow-sm hover:shadow-md hover:bg-[#F36960]/90 transition-all"
                            title="Freeze Account"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Inline Trust Score Modal */}
      <AnimatePresence>
        {trustScoreModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#EBEAE5] rounded-[32px] p-2 shadow-2xl w-full max-w-[400px]">
              
              {/* Illustration Header */}
              <div className="w-full h-[200px] bg-white rounded-[24px] mb-4 flex flex-col items-center justify-center overflow-hidden relative">
                <img src="/assets/Admin_states/Trust Score Adjustment.png" alt="Trust Score" className="w-[80%] h-[80%] object-contain" />
              </div>

              <div className="px-4 pb-4">
                <h3 className="text-[20px] font-bold text-ink-primary mb-1">Adjust Trust Score</h3>
                <p className="text-[12px] font-medium text-ink-secondary mb-6 leading-relaxed">
                  Modifying score for {trustScoreModal.user.phoneNumber}. This is audit-logged and impacts transaction velocity limits.
                </p>
                
                <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary ml-1 block mb-1">New Score (0-100)</label>
                  <input 
                    type="number"
                    min={0}
                    max={100}
                    value={trustScoreModal.score}
                    onChange={(e) => setTrustScoreModal({ ...trustScoreModal, score: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-[20px] bg-[#EBEAE5] p-3 text-[14px] font-bold text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary ml-1 block mb-1">Audit Reason</label>
                  <textarea 
                    value={trustScoreReason}
                    onChange={(e) => setTrustScoreReason(e.target.value)}
                    placeholder="Enter justification..."
                    rows={2}
                    className="w-full rounded-[20px] bg-[#EBEAE5] p-3 text-[13px] font-medium text-ink-primary resize-none focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setTrustScoreModal({ user: null, score: 0 })}
                  className="flex-1 py-3 rounded-full bg-[#EBEAE5] text-ink-primary text-[13px] font-bold hover:brightness-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTrustScore}
                  disabled={trustScoreLoading || !trustScoreReason.trim()}
                  className="flex-1 py-3 rounded-full bg-ink-primary text-white text-[13px] font-bold hover:bg-ink-primary/90 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {trustScoreLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}