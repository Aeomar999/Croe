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
import { motion, Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading review queue" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-r-2 border border-line-primary/70 bg-surface p-3.5">
          <div className="h-10 w-10 animate-pulse rounded-full bg-sunken" />
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
      border: 'border-state-caution-deep/10',
    },
    {
      title: 'Critical priority',
      value: String(disputes.filter((dispute) => dispute.priority > 1000).length),
      detail: 'Needs attention first',
      icon: AlertTriangle,
      color: 'text-state-danger-deep',
      bg: 'bg-state-danger-wash',
      border: 'border-state-danger-deep/10',
    },
    {
      title: 'High priority',
      value: String(disputes.filter((dispute) => dispute.priority > 500 && dispute.priority <= 1000).length),
      detail: 'Next in the review order',
      icon: CircleDot,
      color: 'text-state-caution-deep',
      bg: 'bg-state-caution-wash',
      border: 'border-state-caution-deep/10',
    },
    {
      title: 'Queue connection',
      value: isLoading ? 'Checking' : 'Live',
      detail: isLoading ? 'Loading current cases' : 'Updated from the review queue',
      icon: Shield,
      color: 'text-state-secure-deep',
      bg: 'bg-state-secure-wash',
      border: 'border-state-secure-deep/10',
    },
  ];

  return (
    <AdminLayout title="Reviewer workspace" subtitle="Start with the cases that need a human decision.">
      {/* Stats Grid */}
      <motion.div suppressHydrationWarning
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        {queueSummary.map((stat) => (
          <motion.div suppressHydrationWarning key={stat.title} variants={item}>
            <Card padding="sheet-2" className={cn("flex min-h-[142px] items-start gap-4 transition-transform hover:scale-[1.02] duration-300", stat.border)}>
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-white/50', stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 mt-0.5">
                <p className="text-caption font-semibold text-ink-tertiary tracking-wide uppercase">{stat.title}</p>
                <p className="mt-1.5 text-display font-extrabold text-ink-primary tracking-tight">{stat.value}</p>
                <p className="mt-1 text-caption text-ink-secondary">{stat.detail}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Disputes */}
      <motion.div suppressHydrationWarning
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
      >
        <Card padding="sheet">
          <CardHeader
            title="Review queue"
            subtitle={isLoading ? 'Loading current cases' : `${disputes.length} cases require a decision`}
            action={
              <Link
                href="/disputes/queue"
                className="inline-flex items-center gap-1.5 text-label font-semibold text-state-secure-deep transition-all duration-300 hover:text-state-secure-deep/80 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-secure-deep/40 bg-state-secure-wash px-4 py-2 rounded-r-full"
              >
                View all cases <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          <CardContent>
            {isLoading ? (
              <DashboardSkeleton />
            ) : disputes.length === 0 ? (
              <div className="rounded-r-3 bg-state-secure-wash/50 border border-state-secure-deep/10 px-6 py-16 text-center shadow-sm">
                <div className="mx-auto mb-5 h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center text-state-secure-deep border border-state-secure-deep/10">
                  <Shield className="h-8 w-8" strokeWidth={1.8} />
                </div>
                <p className="text-title font-bold text-ink-primary tracking-tight">The review queue is clear</p>
                <p className="mt-2 text-body text-ink-secondary max-w-md mx-auto">New escalations will appear here as they are routed to a Human Reviewer (L3) based on AI confidence.</p>
              </div>
            ) : (
              <Table className="max-h-[520px] overflow-y-auto pr-2 scrollbar-thin">
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
      </motion.div>
    </AdminLayout>
  );
}
