'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getDisputeStatusLabel, getReasonCodeLabel, getPriorityLabel, cn } from '@/lib/utils';
import { Gavel, AlertTriangle, Clock, Shield, ArrowRight, CircleDot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading review queue" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-r-2 border border-line-primary/70 bg-surface p-3.5">
          <div className="h-10 w-10 animate-pulse rounded-r-1 bg-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-sunken" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-sunken" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(10),
  });

  const queueSummary = [
    {
      title: 'Ready for review',
      value: String(disputes.length),
      detail: 'Cases waiting for an L3 decision',
      icon: Gavel,
      color: 'text-state-caution-deep',
      bg: 'bg-state-caution-wash',
    },
    {
      title: 'Critical priority',
      value: String(disputes.filter((dispute) => dispute.priority > 1000).length),
      detail: 'Needs attention first',
      icon: AlertTriangle,
      color: 'text-state-danger-deep',
      bg: 'bg-state-danger-wash',
    },
    {
      title: 'High priority',
      value: String(disputes.filter((dispute) => dispute.priority > 500 && dispute.priority <= 1000).length),
      detail: 'Next in the review order',
      icon: CircleDot,
      color: 'text-state-caution-deep',
      bg: 'bg-state-caution-wash',
    },
    {
      title: 'Queue connection',
      value: isLoading ? 'Checking' : 'Live',
      detail: isLoading ? 'Loading current cases' : 'Updated from the review queue',
      icon: Shield,
      color: 'text-state-secure-deep',
      bg: 'bg-state-secure-wash',
    },
  ];

  return (
    <AdminLayout title="Reviewer workspace" subtitle="Start with the cases that need a human decision.">
      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queueSummary.map((stat) => (
          <Card key={stat.title} padding="sheet" className="flex min-h-[142px] items-start gap-4">
            <div className={cn('w-12 h-12 rounded-r-3 flex items-center justify-center flex-shrink-0', stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-caption text-ink-tertiary">{stat.title}</p>
              <p className="mt-1 text-display font-bold text-ink-primary">{stat.value}</p>
              <p className="mt-1 text-caption text-ink-secondary">{stat.detail}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Disputes */}
      <Card padding="sheet">
        <CardHeader
          title="Review queue"
          subtitle={isLoading ? 'Loading current cases' : `${disputes.length} cases require a decision`}
          action={
            <Link
              href="/disputes/queue"
              className="inline-flex items-center gap-1.5 text-label font-semibold text-state-secure-deep transition-colors hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/40"
            >
              View all cases <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        <CardContent>
          {isLoading ? (
            <DashboardSkeleton />
          ) : disputes.length === 0 ? (
            <div className="rounded-r-2 bg-state-secure-wash px-6 py-12 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-state-secure-deep" strokeWidth={1.6} />
              <p className="text-body font-semibold text-ink-primary">The review queue is clear</p>
              <p className="mt-1 text-caption text-ink-secondary">New escalations will appear here as they are routed to a Human Reviewer (L3).</p>
            </div>
          ) : (
            <Table className="max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              {disputes.map((dispute) => (
                <TableRow
                  key={dispute.disputeId}
                  state={dispute.priority > 1000 ? 'danger' : dispute.priority > 500 ? 'caution' : 'pending'}
                  onClick={() => router.push(`/disputes/${dispute.disputeId}`)}
                >
                  <TableRowMain
                    mark={<Gavel className="w-5 h-5" />}
                    title={`Dispute ${dispute.disputeId.slice(0, 8)}`}
                    subtitle={getReasonCodeLabel(dispute.reasonCode)}
                    value={formatCurrency(dispute.amount, dispute.currency)}
                    meta={formatRelativeTime(dispute.createdAt)}
                  />
                  <TableRowFoot>
                    <div className="flex items-center gap-3">
                      <Pill variant="caution" size="trace">{getPriorityLabel(dispute.priority)}</Pill>
                      <Pill variant={dispute.status === 'UNDER_HUMAN_REVIEW' ? 'caution' : 'pending'} size="trace">
                        {getDisputeStatusLabel(dispute.status)}
                      </Pill>
                    </div>
                    <TableNote>
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(dispute.createdAt)}
                    </TableNote>
                  </TableRowFoot>
                </TableRow>
              ))}
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
