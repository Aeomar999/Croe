'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi, type DisputeCaseDetail, type EvidenceArtifact, type LedgerEvent, type PartyInfo } from '@/lib/api';
import { formatCurrency, formatDate, getReasonCodeLabel, getDisputeStatusLabel, cn } from '@/lib/utils';
import {
  Gavel,
  Shield,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Video,
  Hash,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

const ARTIFACT_TYPE_ICONS: Record<string, typeof Image> = {
  PHOTO: Image,
  VIDEO: Video,
  DOCUMENT: FileText,
  SCREENSHOT: Image,
};

function EvidenceCard({ artifact }: { artifact: EvidenceArtifact }) {
  const Icon = ARTIFACT_TYPE_ICONS[artifact.artifactType] || FileText;
  const isRecycled = artifact.isRecycled;

  return (
    <Card padding="sheet-2" className={cn('flex items-start gap-4', isRecycled && 'border-state-danger-fill/50 bg-state-danger-wash/30')}>
      <div className="w-16 h-16 rounded-r-2 bg-sunken flex items-center justify-center flex-shrink-0">
        <Icon className="w-7 h-7 text-ink-tertiary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-caption font-medium text-ink-secondary capitalize">{artifact.artifactType.toLowerCase()}</span>
          <Badge variant={isRecycled ? 'danger' : 'success'}>
            {isRecycled ? 'Recycled Hash' : 'SHA-256 Verified'}
          </Badge>
        </div>
        <p className="text-micro font-mono text-ink-tertiary truncate">{artifact.sha256Hash}</p>
        <div className="flex items-center gap-3 mt-2 text-caption text-ink-tertiary">
          <span>By {artifact.uploadedBy.slice(0, 8)}</span>
          <span>{formatDate(artifact.uploadedAt)}</span>
        </div>
      </div>
    </Card>
  );
}

function TimelineEvent({ event, index, total }: { event: LedgerEvent; index: number; total: number }) {
  const isLast = index === total - 1;
  const isFirst = index === 0;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-surface flex-shrink-0',
            event.eventType.includes('DEPOSITED') || event.eventType.includes('RELEASED') || event.eventType.includes('REFUND')
              ? 'bg-state-secure-fill'
              : event.eventType.includes('DISPUTE')
              ? 'bg-state-caution-fill'
              : event.eventType.includes('SHIP')
              ? 'bg-state-secure-fill'
              : 'bg-ink-primary'
          )}
        />
        {!isLast && <div className="flex-1 w-0.5 bg-line-primary mt-1" />}
      </div>
      <div className="flex-1 min-w-0 pt-1 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-body font-semibold text-ink-primary">{event.eventType.replace(/_/g, ' ')}</p>
            <p className="text-caption text-ink-tertiary">{formatDate(event.createdAt)}</p>
          </div>
          {event.amountDelta && (
            <div className="text-right">
            <p className={cn('text-body font-bold tabular-nums', event.amountDelta.startsWith('-') ? 'text-ink-primary' : 'text-state-secure-deep')}>
                {event.amountDelta.startsWith('-') ? '' : '+'}{formatCurrency(event.amountDelta, event.currency || 'GHS')}
              </p>
            </div>
          )}
        </div>
        {event.deviceMetadata && Object.keys(event.deviceMetadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-caption text-ink-tertiary cursor-pointer">Device Metadata</summary>
            <pre className="mt-2 text-micro font-mono text-ink-tertiary bg-sunken p-3 rounded-r-1 overflow-x-auto">
              {JSON.stringify(event.deviceMetadata, null, 2)}
            </pre>
          </details>
        )}
        {event.previousStatus && event.newStatus && (
          <div className="mt-2 flex items-center gap-2 text-caption">
            <Badge variant="default">{event.previousStatus}</Badge>
            <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary" />
            <Badge variant="success">{event.newStatus}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function PartyCard({ party, label }: { party: PartyInfo; label: string }) {
  return (
    <Card padding="sheet-2">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-ink-primary flex items-center justify-center text-on-ink font-bold text-body">
          {label.charAt(0)}
        </div>
        <div>
          <p className="text-label font-semibold text-ink-primary">{label}</p>
          <p className="text-caption text-ink-tertiary">{party.phoneNumber}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 bg-sunken rounded-r-2">
          <p className="text-heading font-bold text-ink-primary">{party.trustScore}</p>
          <p className="text-caption text-ink-tertiary">Trust Score</p>
        </div>
        <div className="p-3 bg-sunken rounded-r-2">
          <p className="text-heading font-bold text-ink-primary">Tier {party.kycTier}</p>
          <p className="text-caption text-ink-tertiary">KYC Level</p>
        </div>
        <div className="p-3 bg-sunken rounded-r-2">
          <p className="text-heading font-bold text-ink-primary">{party.accountAgeDays}d</p>
          <p className="text-caption text-ink-tertiary">Account Age</p>
        </div>
        <div className="p-3 bg-sunken rounded-r-2">
          <Badge variant={party.isFrozen ? 'danger' : 'success'}>
            {party.isFrozen ? 'Frozen' : 'Active'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const queryClient = useQueryClient();

  const [showAdjudicate, setShowAdjudicate] = useState(false);
  const [adjudicateAction, setAdjudicateAction] = useState<'REFUND_BUYER' | 'RELEASE_VENDOR'>('REFUND_BUYER');
  const [adjudicateReason, setAdjudicateReason] = useState('');
  const [adjudicateLoading, setAdjudicateLoading] = useState(false);
  const [adjudicateError, setAdjudicateError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: dispute, isLoading, error } = useQuery({
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
      setShowConfirm(false);
      setAdjudicateReason('');
    },
    onError: (err) => {
      console.error('Failed to resolve dispute:', err);
      setAdjudicateError('We could not record this decision. Check the case is still available, then try again.');
      setShowConfirm(false);
    },
  });

  const handleAdjudicate = async () => {
    if (!adjudicateReason.trim()) return;
    setAdjudicateError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setAdjudicateLoading(true);
    try {
      await resolveMutation.mutateAsync();
    } finally {
      setAdjudicateLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Loading..." subtitle="Fetching dispute details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !dispute) {
    return (
      <AdminLayout title="Not Found" subtitle="Dispute not found">
        <Card padding="sheet" className="max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-state-danger-fill mx-auto mb-4" />
          <p className="text-body text-ink-secondary">Dispute not found</p>
          <Button onClick={() => router.push('/disputes/queue')} className="mt-4">
            Back to Queue
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  const canAdjudicate = dispute.status === 'UNDER_HUMAN_REVIEW';

  return (
    <AdminLayout
      title={`Dispute ${dispute.disputeId.slice(0, 8)}`}
      subtitle={`${getReasonCodeLabel(dispute.reasonCode)} • ${formatCurrency(dispute.amount, dispute.currency)}`}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/disputes/queue"
            className="inline-flex h-11 items-center gap-2 rounded-r-1 px-3 text-label font-semibold text-ink-secondary transition-colors hover:bg-sunken hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Queue
          </Link>
          {canAdjudicate && (
            <Button onClick={() => setShowAdjudicate(true)} variant="primary">
              <Gavel className="w-4 h-4" />
              Record decision
            </Button>
          )}
        </div>
      }
    >
      {/* AI Recommendation Banner */}
      {dispute.aiRecommendedAction && (
        <Card padding="sheet" className="mb-6 bg-state-caution-wash border-state-caution-fill">
          <CardHeader
            title="AI Recommendation"
            subtitle={dispute.aiConfidence
              ? `Confidence: ${(dispute.aiConfidence * 100).toFixed(1)}%`
              : undefined}
          />
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-r-3 bg-state-caution-fill flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-state-caution-on" />
              </div>
              <div className="flex-1">
                <p className="text-body text-state-caution-deep font-medium">
                  AI recommends: <span className="font-bold capitalize">{dispute.aiRecommendedAction.replace('_', ' ').toLowerCase()}</span>
                </p>
                {dispute.aiReasoningPayload && (
                  <details className="mt-2">
                    <summary className="text-caption text-state-caution-deep cursor-pointer">View reasoning</summary>
                    <pre className="mt-2 text-micro font-mono text-ink-tertiary bg-surface p-3 rounded-r-1 overflow-x-auto border border-line-primary">
                      {JSON.stringify(dispute.aiReasoningPayload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <Pill variant={dispute.aiConfidence && dispute.aiConfidence >= 0.9 ? 'secure' : 'caution'} size="signal">
                {dispute.aiConfidence ? `${(dispute.aiConfidence * 100).toFixed(1)}%` : 'Pending'}
              </Pill>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Timeline & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Forensic Timeline */}
          <Card padding="sheet">
            <CardHeader title="Forensic Timeline" subtitle={`${dispute.timeline.length} events recorded`} />
            <CardContent>
              <div className="space-y-0">
                {dispute.timeline.map((event: LedgerEvent, i: number) => (
                  <TimelineEvent key={event.ledgerId} event={event} index={i} total={dispute.timeline.length} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card padding="sheet">
            <CardHeader title="Evidence" subtitle={`${dispute.evidence.length} artifacts submitted`} />
            <CardContent>
              {dispute.evidence.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-ink-tertiary mx-auto mb-3" />
                  <p className="text-body text-ink-secondary">No evidence submitted</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dispute.evidence.map((artifact: EvidenceArtifact) => (
                    <EvidenceCard key={artifact.artifactId} artifact={artifact} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Parties & Actions */}
        <div className="space-y-6">
          {/* Parties */}
          <Card padding="sheet">
            <CardHeader title="Parties Involved" />
            <CardContent className="space-y-4">
              <PartyCard party={dispute.vendor} label="Vendor" />
              <PartyCard party={dispute.buyer} label="Buyer" />
            </CardContent>
          </Card>

          {/* Dispute Details */}
          <Card padding="sheet">
            <CardHeader title="Dispute Details" />
            <CardContent className="space-y-4">
              <div>
                <p className="text-caption text-ink-tertiary">Dispute ID</p>
                <p className="text-body font-mono text-ink-primary">{dispute.disputeId}</p>
              </div>
              <div>
                <p className="text-caption text-ink-tertiary">Transaction ID</p>
                <p className="text-body font-mono text-ink-primary">{dispute.transactionId}</p>
              </div>
              <div>
                <p className="text-caption text-ink-tertiary">Reason</p>
                <p className="text-body text-ink-primary">{getReasonCodeLabel(dispute.reasonCode)}</p>
              </div>
              <div>
                <p className="text-caption text-ink-tertiary">Claim Description</p>
                <p className="text-body text-ink-secondary whitespace-pre-wrap">{dispute.claimDescription}</p>
              </div>
              <div>
                <p className="text-caption text-ink-tertiary">Status</p>
                <Pill
                  variant={
                    dispute.status === 'UNDER_HUMAN_REVIEW'
                      ? 'caution'
                      : dispute.status === 'AI_PROCESSING'
                      ? 'caution'
                      : dispute.status === 'RESOLVED_AUTO'
                      ? 'done'
                      : dispute.status === 'FRAUD_LOCKOUT'
                      ? 'danger'
                      : 'pending'
                  }
                  size="signal"
                >
                  {getDisputeStatusLabel(dispute.status)}
                </Pill>
              </div>
              <div>
                <p className="text-caption text-ink-tertiary">Created</p>
                <p className="text-body text-ink-primary">{formatDate(dispute.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjudication Modal */}
      <Modal isOpen={showAdjudicate} onClose={() => setShowAdjudicate(false)} title="Adjudicate Dispute" size="lg">
        <div className="space-y-6">
          <div>
            <p className="text-body text-ink-secondary mb-4">
              Select the resolution action and provide a detailed reason. This action is irreversible and will be audit-logged.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant={adjudicateAction === 'REFUND_BUYER' ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => setAdjudicateAction('REFUND_BUYER')}
              >
                <Shield className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Refund Buyer</p>
                  <p className="text-caption text-ink-tertiary">Return funds to buyer</p>
                </div>
              </Button>
              <Button
                variant={adjudicateAction === 'RELEASE_VENDOR' ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => setAdjudicateAction('RELEASE_VENDOR')}
              >
                <DollarSign className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Release to Vendor</p>
                  <p className="text-caption text-ink-tertiary">Pay out to vendor (net of commission)</p>
                </div>
              </Button>
            </div>
          </div>

          <Textarea
            label="Reason (required)"
            value={adjudicateReason}
            onChange={(e) => setAdjudicateReason(e.target.value)}
            placeholder="Explain the basis for this decision..."
            rows={4}
            required
          />

          {adjudicateError && (
            <div className="rounded-r-1 bg-state-danger-wash px-4 py-3 text-caption font-medium text-state-danger-deep" role="alert">
              {adjudicateError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-line-primary">
            <Button variant="ghost" onClick={() => setShowAdjudicate(false)} disabled={adjudicateLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdjudicate} disabled={adjudicateLoading || !adjudicateReason.trim()}>
              {adjudicateAction === 'REFUND_BUYER' ? 'Refund Buyer' : 'Release to Vendor'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Adjudication"
        message={`Are you sure you want to ${adjudicateAction === 'REFUND_BUYER' ? 'refund the buyer' : 'release funds to vendor'}? This action cannot be undone.`}
        confirmText={adjudicateAction === 'REFUND_BUYER' ? 'Confirm Refund' : 'Confirm Release'}
        variant="danger"
        loading={adjudicateLoading}
      />
    </AdminLayout>
  );
}
