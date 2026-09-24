'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi, type EvidenceArtifact, type LedgerEvent, type PartyInfo } from '@/lib/api';
import { formatCurrency, formatDate, getReasonCodeLabel, cn, formatRelativeTime } from '@/lib/utils';
import {
  ShieldAlert, Clock, ArrowLeft, Image as ImageIcon, Video, FileText, CheckCircle2,
  AlertTriangle, XCircle, ArrowUpRight, ShieldCheck, Wallet, Bot, Search, Gavel, User,
  CheckCircle, Shield
} from 'lucide-react';
import { useState } from 'react';
import { motion, Variants } from 'framer-motion';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const ARTIFACT_ICONS: Record<string, typeof ImageIcon> = {
  PHOTO: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
  SCREENSHOT: ImageIcon,
};

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline'>('evidence');
  const [showAdjudicate, setShowAdjudicate] = useState(false);
  const [adjudicateAction, setAdjudicateAction] = useState<'REFUND_BUYER' | 'RELEASE_VENDOR'>('REFUND_BUYER');
  const [adjudicateReason, setAdjudicateReason] = useState('');
  const [adjudicateLoading, setAdjudicateLoading] = useState(false);

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => disputesApi.getCase(disputeId),
    enabled: !!disputeId,
  });

  const resolveMutation = useMutation({
    mutationFn: () => disputesApi.resolve(disputeId, { action: adjudicateAction, reason: adjudicateReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['disputes-queue'] });
      setShowAdjudicate(false);
      setAdjudicateReason('');
    },
  });

  const handleResolve = async () => {
    if (!adjudicateReason.trim()) return;
    setAdjudicateLoading(true);
    await resolveMutation.mutateAsync();
    setAdjudicateLoading(false);
  };

  const headerAction = (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => router.push('/disputes/queue')}
        className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center text-ink-primary hover:bg-black/5 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex flex-col">
        <p className="text-[11px] font-bold text-ink-tertiary">Dispute ID</p>
        <p className="text-[14px] font-bold text-ink-primary">{disputeId.slice(0, 8)}</p>
      </div>
    </div>
  );

  if (isLoading || !dispute) {
    return (
      <AdminLayout title="Loading case..." headerAction={headerAction}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-ink-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const isResolved = dispute.status.includes('RESOLVED') || dispute.status.includes('REFUNDED') || dispute.status.includes('RELEASED');

  return (
    <AdminLayout
      title={`TXN-${dispute.transactionId.slice(0, 8).toUpperCase()}`}
      subtitle="Escrow Adjudication View"
      headerAction={headerAction}
    >
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        
        {/* LEFT COLUMN: Main Info & Actions */}
        <motion.div variants={itemVariants} className="w-full lg:w-5/12 flex flex-col gap-4 min-h-0">
          
          {/* Status & Value Card */}
          <div className={cn("rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden flex-shrink-0", isResolved ? "bg-[#111827] text-white" : "bg-[#4A8B63] text-white")}>
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm text-ink-primary">
                {isResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span className="text-[12px] font-bold">{dispute.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-white/80 text-[12px] font-medium mb-1">Disputed Value</p>
              <h2 className="text-[48px] font-medium leading-none tracking-tight mb-4">
                {formatCurrency(dispute.amount, dispute.currency)}
              </h2>
              
              <div className="border border-white/20 rounded-[16px] p-4 bg-black/15">
                <p className="text-white/70 text-[11px] font-medium mb-1">Escalation Reason</p>
                <p className="text-white text-[14px] font-bold">{getReasonCodeLabel(dispute.reasonCode)}</p>
              </div>
            </div>
          </div>

          {/* Adjudication Panel (If Active) */}
          {!isResolved && (
            <div className="bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col flex-1 min-h-0 relative">
              <h3 className="text-[18px] font-bold text-ink-primary mb-1">L3 Decision</h3>
              <p className="text-[12px] text-ink-tertiary font-medium mb-4">Action is irreversible and executes immediately.</p>
              
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setAdjudicateAction('REFUND_BUYER')}
                    className={cn("p-4 rounded-[20px] border-2 flex flex-col items-center justify-center gap-2 transition-all", adjudicateAction === 'REFUND_BUYER' ? "border-[#F36960] bg-[#F36960]/10" : "border-black/5 hover:border-black/20")}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", adjudicateAction === 'REFUND_BUYER' ? "bg-[#F36960] text-white" : "bg-black/5 text-ink-secondary")}>
                      <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className={cn("text-[13px] font-bold", adjudicateAction === 'REFUND_BUYER' ? "text-[#F36960]" : "text-ink-secondary")}>Refund Buyer</span>
                  </button>
                  <button 
                    onClick={() => setAdjudicateAction('RELEASE_VENDOR')}
                    className={cn("p-4 rounded-[20px] border-2 flex flex-col items-center justify-center gap-2 transition-all", adjudicateAction === 'RELEASE_VENDOR' ? "border-[#2ECA6A] bg-[#2ECA6A]/10" : "border-black/5 hover:border-black/20")}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", adjudicateAction === 'RELEASE_VENDOR' ? "bg-[#2ECA6A] text-white" : "bg-black/5 text-ink-secondary")}>
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className={cn("text-[13px] font-bold", adjudicateAction === 'RELEASE_VENDOR' ? "text-[#2ECA6A]" : "text-ink-secondary")}>Release Vendor</span>
                  </button>
                </div>
                
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[11px] font-bold text-ink-secondary ml-1">L3 Rationale Note (Required)</label>
                  <textarea 
                    value={adjudicateReason}
                    onChange={(e) => setAdjudicateReason(e.target.value)}
                    placeholder="Provide evidence-based reasoning for this decision..."
                    className="w-full flex-1 rounded-[20px] bg-[#EBEAE5] p-4 text-[13px] font-medium text-ink-primary resize-none focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => setShowAdjudicate(true)}
                disabled={!adjudicateReason.trim()}
                className="w-full mt-4 py-3.5 rounded-full bg-ink-primary text-white text-[14px] font-bold hover:bg-ink-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Gavel className="w-4 h-4" /> Execute Decision
              </button>
            </div>
          )}

            {/* AI Assessment Panel */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex-shrink-0 flex gap-6 items-center">
              <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                <img src="/assets/Admin_states/AI Reasoning Payload.png" alt="AI Reasoning" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-bold text-ink-primary flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#B292FA]" /> AI Assessment
                  </h3>
                  <div className="bg-[#B292FA]/20 text-[#B292FA] px-2 py-0.5 rounded-full text-[10px] font-bold">L2 Output</div>
                </div>
                
                <div className="bg-[#EBEAE5] rounded-[24px] p-5">
                  <p className="text-[12px] font-bold text-ink-secondary mb-1">Confidence Score: <span className="text-[#FF9A24]">82%</span></p>
                  <div className="w-full h-2 bg-black/10 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-[#FF9A24]" style={{ width: '82%' }} />
                  </div>
                  <p className="text-[13px] font-medium text-ink-primary leading-relaxed">
                    The buyer claims the item was never received, but the vendor has provided a waybill receipt. However, the signature on the waybill does not match the buyer&apos;s KYC record. Escalated to human review due to conflicting evidence.
                  </p>
                </div>
              </div>
            </div>
        </motion.div>

        {/* RIGHT COLUMN: Evidence & Timeline */}
        <motion.div variants={itemVariants} className="flex-1 bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col min-h-0">
          
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-ink-primary">Case Dossier</h3>
            <div className="flex items-center bg-[#EBEAE5] rounded-full p-1">
              <button 
                onClick={() => setActiveTab('evidence')} 
                className={cn("px-5 py-1.5 rounded-full text-[12px] font-bold transition-all", activeTab === 'evidence' ? "bg-white text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary")}
              >
                Evidence ({dispute.evidence.length})
              </button>
              <button 
                onClick={() => setActiveTab('timeline')} 
                className={cn("px-5 py-1.5 rounded-full text-[12px] font-bold transition-all", activeTab === 'timeline' ? "bg-white text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary")}
              >
                Ledger Log
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            {activeTab === 'evidence' ? (
              <div className="flex flex-col gap-3">
                {dispute.evidence.length === 0 ? (
                   <div className="py-12 text-center flex flex-col items-center justify-center opacity-40">
                     <FileText className="w-12 h-12 mb-3" />
                     <p className="text-[14px] font-bold text-ink-primary">No evidence uploaded</p>
                   </div>
                ) : (
                  dispute.evidence.map((item) => {
                    const Icon = ARTIFACT_ICONS[item.artifactType] || FileText;
                    return (
                      <div key={item.artifactId} className="bg-[#EBEAE5] rounded-[24px] p-4 flex gap-4">
                        <div className="w-16 h-16 rounded-[16px] bg-white flex items-center justify-center shrink-0 shadow-sm text-ink-tertiary">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-bold text-ink-primary capitalize">{item.artifactType.toLowerCase()} Evidence</span>
                            <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", item.isRecycled ? "bg-[#F36960]/20 text-[#F36960]" : "bg-[#2ECA6A]/20 text-[#2ECA6A]")}>
                              {item.isRecycled ? 'RECYCLED HASH' : 'SHA-256 VERIFIED'}
                            </div>
                          </div>
                          <p className="text-[10px] font-mono text-ink-tertiary truncate mb-2">{item.sha256Hash}</p>
                          <div className="flex items-center gap-3 text-[11px] font-medium text-ink-secondary">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.uploadedBy.slice(0, 8)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(item.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Party Context Cards appended at the bottom of evidence for L3 */}
                <h4 className="text-[14px] font-bold text-ink-primary mt-4 mb-2 ml-2">Party Context</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-black/5 rounded-[24px] p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-ink-primary text-white flex items-center justify-center text-[10px] font-bold">B</div>
                      <p className="text-[12px] font-bold text-ink-primary">Buyer</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#EBEAE5] rounded-xl py-2"><p className="text-[14px] font-bold text-ink-primary">{dispute.buyer.trustScore}</p><p className="text-[9px] font-bold text-ink-secondary uppercase">Trust</p></div>
                      <div className="bg-[#EBEAE5] rounded-xl py-2"><p className="text-[14px] font-bold text-ink-primary">T{dispute.buyer.kycTier}</p><p className="text-[9px] font-bold text-ink-secondary uppercase">KYC</p></div>
                    </div>
                  </div>
                  <div className="bg-white border border-black/5 rounded-[24px] p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-ink-primary text-white flex items-center justify-center text-[10px] font-bold">V</div>
                      <p className="text-[12px] font-bold text-ink-primary">Vendor</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#EBEAE5] rounded-xl py-2"><p className="text-[14px] font-bold text-ink-primary">{dispute.vendor.trustScore}</p><p className="text-[9px] font-bold text-ink-secondary uppercase">Trust</p></div>
                      <div className="bg-[#EBEAE5] rounded-xl py-2"><p className="text-[14px] font-bold text-ink-primary">T{dispute.vendor.kycTier}</p><p className="text-[9px] font-bold text-ink-secondary uppercase">KYC</p></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0 border-l-2 border-black/5 ml-4 pl-6 relative">
                
                {/* Forensic Audit Illustration Header */}
                <div className="mb-8 -ml-8 bg-white rounded-[24px] overflow-hidden flex flex-col items-center justify-center p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border-2 border-dashed border-black/5 relative">
                  <img src="/assets/Admin_states/Forensic Timeline Audit.png" alt="Forensic Timeline Audit" className="h-[140px] object-contain drop-shadow-sm mb-4" />
                  <h4 className="text-[16px] font-bold text-ink-primary">Forensic Ledger Log</h4>
                  <p className="text-[12px] font-medium text-ink-secondary text-center max-w-sm mt-1">Immutable cryptographic history of all actions related to this transaction.</p>
                </div>

                {dispute.timeline.map((event, i) => (
                  <div key={i} className="mb-6 relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] w-[11px] h-[11px] bg-ink-primary rounded-full border-2 border-white shadow-sm" />
                    
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-bold text-ink-primary">{event.eventType.replace(/_/g, ' ')}</p>
                      {event.amountDelta && (
                        <span className={cn("text-[13px] font-bold", event.amountDelta.startsWith('-') ? "text-ink-primary" : "text-[#2ECA6A]")}>
                           {event.amountDelta.startsWith('-') ? '' : '+'}{formatCurrency(event.amountDelta, event.currency || 'GHS')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-ink-secondary mb-2">{formatRelativeTime(event.createdAt)}</p>
                    
                    {event.deviceMetadata && Object.keys(event.deviceMetadata).length > 0 && (
                      <div className="bg-[#EBEAE5] rounded-xl p-3 text-[10px] font-mono text-ink-tertiary overflow-x-auto">
                        <pre>{JSON.stringify(event.deviceMetadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Confirmation Modal */}
      {showAdjudicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#EBEAE5] rounded-[32px] p-2 shadow-2xl w-full max-w-[420px]">
            <div className="w-full h-[200px] bg-white rounded-[24px] mb-4 flex flex-col items-center justify-center overflow-hidden relative">
              <img 
                src={adjudicateAction === 'REFUND_BUYER' 
                  ? '/assets/Admin_states/Adjudication Refund Buyer.png' 
                  : '/assets/Admin_states/Adjudication Release to Vendor.png'
                } 
                alt="Adjudication"
                className="w-[80%] h-[80%] object-contain drop-shadow-sm"
              />
            </div>
            
            <div className="px-4 pb-4">
              <h3 className="text-[20px] font-bold text-ink-primary mb-2">Execute Irreversible Action?</h3>
              <p className="text-[13px] font-medium text-ink-secondary mb-6 leading-relaxed">
                You are about to <span className="font-bold text-ink-primary">{adjudicateAction.replace('_', ' ')}</span>. This will immediately mutate the ledger and execute payout via the custody provider. This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAdjudicate(false)}
                  className="flex-1 py-3.5 rounded-full bg-white text-ink-primary text-[13px] font-bold hover:brightness-95 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResolve}
                  className={cn("flex-1 py-3.5 rounded-full text-white text-[13px] font-bold transition-all flex items-center justify-center shadow-sm",
                    adjudicateAction === 'REFUND_BUYER' ? "bg-[#F36960] hover:bg-[#F36960]/90" : "bg-[#2ECA6A] hover:bg-[#2ECA6A]/90"
                  )}
                >
                  {adjudicateLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Execution'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
