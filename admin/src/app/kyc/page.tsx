'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kycApi, type KYCQueueItem } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { FileText, Search, Loader2, CheckCircle, XCircle, Eye, AlertTriangle, Loader2 as Loader } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const ID_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  VOTER_ID: 'Voter ID',
};

export default function KYCPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [reviewModal, setReviewModal] = useState<{ item: KYCQueueItem | null; action: 'approve' | 'reject' }>({ item: null, action: 'approve' });
  const [reviewReason, setReviewReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const { data: kycQueue = [], isLoading } = useQuery({
    queryKey: ['kyc-queue'],
    queryFn: () => kycApi.getQueue(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ kycId, approved, reason }: { kycId: string; approved: boolean; reason?: string }) =>
      kycApi.review(kycId, { approved, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setReviewModal({ item: null, action: 'approve' });
      setReviewReason('');
    },
  });

  const filteredQueue = kycQueue
    .filter((item) =>
      item.kycId.toLowerCase().includes(search.toLowerCase()) ||
      item.phoneNumber.includes(search) ||
      item.userId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const openReviewModal = (item: KYCQueueItem, action: 'approve' | 'reject') => {
    setReviewModal({ item, action });
    setReviewReason('');
  };

  const handleReview = async () => {
    if (!reviewModal.item) return;
    setReviewLoading(true);
    await reviewMutation.mutateAsync({
      kycId: reviewModal.item.kycId,
      approved: reviewModal.action === 'approve',
      reason: reviewReason,
    });
    setReviewLoading(false);
  };

  return (
    <AdminLayout
      title="KYC Review Queue"
      subtitle={`${filteredQueue.length} pending KYC submissions`}
      headerAction={
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
          <Input
            placeholder="Search by KYC ID, user ID, or phone..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      }
    >
      <motion.div suppressHydrationWarning
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
      >
        <Card padding="sheet">
          <CardContent className="space-y-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="rounded-r-3 bg-state-secure-wash/50 border border-state-secure-deep/10 px-6 py-20 text-center shadow-sm">
                <div className="mx-auto mb-5 h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center text-state-secure-deep border border-state-secure-deep/10">
                  <FileText className="h-8 w-8" strokeWidth={1.8} />
                </div>
                <p className="text-title font-bold text-ink-primary tracking-tight">No pending KYC submissions</p>
                <p className="mt-2 text-body text-ink-secondary">The queue is clear. All users have been verified.</p>
              </div>
            ) : (
              <Table className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredQueue.map((item) => (
                  <TableRow key={item.kycId}>
                    <TableRowMain
                      mark={<FileText className="w-5 h-5" />}
                      title={item.phoneNumber}
                      subtitle={`KYC: ${item.kycId.slice(0, 8)} • User: ${item.userId.slice(0, 8)}`}
                      value={ID_TYPE_LABELS[item.idType]}
                      meta={formatDate(item.createdAt)}
                    />
                    <TableRowFoot>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">Pending Review</Badge>
                        <Pill variant={item.tier >= 2 ? 'secure' : 'caution'} size="trace">
                          Tier {item.tier}
                        </Pill>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openReviewModal(item, 'approve')} className="hover:text-state-secure-deep hover:bg-state-secure-wash">
                          <CheckCircle className="w-4 h-4 text-state-secure-deep" />
                          Approve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openReviewModal(item, 'reject')} className="hover:text-state-danger-deep hover:bg-state-danger-wash">
                          <XCircle className="w-4 h-4 text-state-danger-deep" />
                          Reject
                        </Button>
                      </div>
                    </TableRowFoot>
                  </TableRow>
                ))}
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal.item}
        onClose={() => setReviewModal({ item: null, action: 'approve' })}
        title={reviewModal.action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
        size="sm"
      >
        <p className="text-body text-ink-secondary mb-4">
          {reviewModal.action === 'approve'
            ? 'Approving this KYC will upgrade the user to the requested tier level.'
            : 'Rejecting this KYC will keep the user at their current tier. Provide a reason for the rejection.'}
        </p>
        <div className="mb-4 p-3 bg-sunken rounded-r-2">
          <p className="text-caption text-ink-tertiary">Requested Tier: <span className="font-medium text-ink-primary">Tier {reviewModal.item?.tier}</span></p>
          <p className="text-caption text-ink-tertiary">ID Type: <span className="font-medium text-ink-primary">{ID_TYPE_LABELS[reviewModal.item?.idType || 'NATIONAL_ID']}</span></p>
        </div>
        <Textarea
          label={reviewModal.action === 'approve' ? 'Notes (optional)' : 'Reason for rejection (required)'}
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
          placeholder={reviewModal.action === 'approve' ? 'Optional notes...' : 'Explain why this KYC is being rejected...'}
          rows={3}
          required={reviewModal.action === 'reject'}
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-line-primary">
          <Button variant="ghost" onClick={() => setReviewModal({ item: null, action: 'approve' })} disabled={reviewLoading}>
            Cancel
          </Button>
          <Button
            variant={reviewModal.action === 'approve' ? 'primary' : 'danger'}
            onClick={handleReview}
            disabled={reviewLoading || (reviewModal.action === 'reject' && !reviewReason.trim())}
            loading={reviewLoading}
          >
            {reviewModal.action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}