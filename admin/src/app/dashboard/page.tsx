'use client';

import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils';
import { 
  AlertCircle, 
  ArrowRight, 
  ArrowUpRight,
  ArrowDownRight,
  BarChart3, 
  CheckCircle2,
  Clock, 
  Filter,
  MoreVertical,
  Activity,
  FileText,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(10),
  });

  const totalAmount = disputes.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  return (
    <AdminLayout title="Good morning, Sarah" subtitle="Revenue Cycle Overview">
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show" 
        className="flex flex-col gap-6"
      >
        
        {/* TOP ROW: Hero Card & KPI Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* GREEN HERO CARD */}
          <motion.div variants={item} className="xl:col-span-5 bg-[#3A7B5E] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_8px_30px_rgba(58,123,94,0.2)]">
            {/* Pill and link */}
            <div className="flex items-center justify-between relative z-10">
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#3A7B5E]" />
                <span className="text-[12px] font-bold text-[#3A7B5E]">Funds at risk</span>
              </div>
              <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Main Value */}
            <div className="mt-8 mb-6 relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-[48px] md:text-[64px] font-bold text-white leading-none tracking-tight">
                    {formatCurrency(String(totalAmount || 184500), 'GHS')}
                  </h2>
                  <p className="text-white/80 text-[14px] mt-2 font-medium">
                    across {disputes.length || 8} cases that may require manual review
                  </p>
                </div>
                {/* Fake Bar Chart */}
                <div className="hidden sm:flex items-end gap-1.5 opacity-90 h-16">
                  {[40, 70, 45, 90, 60, 100].map((h, i) => (
                    <div key={i} className="w-3 rounded-t-sm bg-white" style={{ height: `${h}%`, opacity: i === 5 ? 1 : 0.5 }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Darker Section */}
            <div className="bg-[#2D634B] rounded-2xl p-4 flex items-center justify-between mt-auto relative z-10">
              <div>
                <p className="text-white/60 text-[12px] font-medium mb-1">Recoverable this week</p>
                <p className="text-white text-[14px] font-bold">{formatCurrency('121300', 'GHS')}</p>
              </div>
              <div>
                <p className="text-white/60 text-[12px] font-medium mb-1">Largest case</p>
                <p className="text-white text-[14px] font-bold">{formatCurrency('48200', 'GHS')} · Merchant hold</p>
              </div>
              <div>
                <p className="text-white/60 text-[12px] font-medium mb-1">Earliest SLA</p>
                <p className="text-white text-[14px] font-bold">Sep 24</p>
              </div>
            </div>
            
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          </motion.div>

          {/* KPI CARDS */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold text-ink-primary">Today</h3>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center text-ink-secondary hover:text-ink-primary shadow-sm hover:-translate-y-px transition-all">
                  <Filter className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center text-ink-secondary hover:text-ink-primary shadow-sm hover:-translate-y-px transition-all">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              {/* KPI 1 */}
              <motion.div variants={item} className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-secondary leading-tight">Pending<br/>reviews</p>
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-3 h-3" strokeWidth={3} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-[32px] font-bold text-ink-primary leading-none tracking-tight">42</p>
                  <p className="text-[12px] font-medium text-state-danger-deep mt-2 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> 6 vs last week
                  </p>
                </div>
              </motion.div>

              {/* KPI 2 */}
              <motion.div variants={item} className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-secondary leading-tight">Resolution<br/>rate</p>
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[32px] font-bold text-ink-primary leading-none tracking-tight">87.4</p>
                    <span className="text-[14px] font-bold text-ink-tertiary">%</span>
                  </div>
                  <p className="text-[12px] font-medium text-state-secure-deep mt-2 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> 2.1 pts last 30 days
                  </p>
                </div>
              </motion.div>

              {/* KPI 3 */}
              <motion.div variants={item} className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-secondary leading-tight">At risk<br/>cases</p>
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <AlertTriangle className="w-3 h-3" strokeWidth={3} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[32px] font-bold text-ink-primary leading-none tracking-tight">8</p>
                    <span className="text-[14px] font-bold text-ink-tertiary">cases</span>
                  </div>
                  <p className="text-[12px] font-medium text-state-secure-deep mt-2 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> 3 vs last week
                  </p>
                </div>
              </motion.div>

              {/* KPI 4 */}
              <motion.div variants={item} className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-secondary leading-tight">Avg.<br/>turnaround</p>
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Activity className="w-3 h-3" strokeWidth={3} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[32px] font-bold text-ink-primary leading-none tracking-tight">3.2</p>
                    <span className="text-[14px] font-bold text-ink-tertiary">days</span>
                  </div>
                  <p className="text-[12px] font-medium text-state-secure-deep mt-2 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> 0.4 d to decision
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Tables & Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-2">
          
          {/* LEFT: Attention Required List */}
          <div className="xl:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-bold text-ink-primary">Attention required</h3>
                <p className="text-[13px] text-ink-tertiary font-medium">Sorted by SLA date, then AI confidence</p>
              </div>
              <div className="bg-amber-100/50 text-amber-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-[12px] font-bold cursor-pointer hover:bg-amber-100 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                8 cases need action
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="bg-transparent rounded-3xl overflow-hidden flex flex-col gap-2">
              {/* Header row (visual only) */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[12px] font-semibold text-ink-tertiary">
                <div className="col-span-5">Case</div>
                <div className="col-span-3">Blocking issue</div>
                <div className="col-span-2">Approval odds</div>
                <div className="col-span-2">Due</div>
              </div>

              {/* Rows */}
              {[
                { name: 'Dispute 88291a', sub: 'Non-delivery · GHS 1,450', issue: 'Missing tracking proof', odds: 78, due: 'Sep 24' },
                { name: 'Dispute 48277b', sub: 'Damaged item · GHS 8,200', issue: 'Missing photo evidence', odds: 61, due: 'Sep 25' },
                { name: 'Dispute 48102c', sub: 'Not as described · GHS 4,500', issue: 'Awaiting vendor reply', odds: 47, due: 'Sep 25' },
                { name: 'Dispute 48240d', sub: 'Non-delivery · GHS 600', issue: 'Buyer requested refund', odds: 66, due: 'Sep 26' },
                { name: 'Dispute 48263e', sub: 'Damaged item · GHS 1,200', issue: 'Video unboxing missing', odds: 54, due: 'Sep 28' },
              ].map((row, i) => (
                <motion.div variants={item} key={i} className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-sm flex items-center hover:shadow-md transition-shadow cursor-pointer">
                  <div className="grid grid-cols-12 gap-4 w-full items-center">
                    {/* Case Info */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black/[0.03] border border-black/5 flex items-center justify-center text-ink-secondary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-ink-primary">{row.name}</p>
                        <p className="text-[12px] font-medium text-ink-tertiary">{row.sub}</p>
                      </div>
                    </div>

                    {/* Blocking Issue */}
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <AlertTriangle className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-[13px] font-semibold text-ink-secondary truncate">{row.issue}</span>
                    </div>

                    {/* Approval Odds */}
                    <div className="col-span-2 flex items-center gap-3">
                      <span className="text-[14px] font-bold text-ink-primary">{row.odds}%</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((bar) => (
                          <div 
                            key={bar} 
                            className={cn("w-1.5 h-3.5 rounded-full", bar * 20 <= row.odds + 10 ? (row.odds > 70 ? 'bg-green-500' : row.odds > 50 ? 'bg-amber-400' : 'bg-orange-500') : 'bg-black/10')}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Due & Action */}
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink-secondary">{row.due}</span>
                      <button className="px-4 py-1.5 rounded-full border border-black/10 text-[13px] font-bold text-ink-primary hover:bg-black/5 transition-colors">
                        Review
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT: Recent Activity */}
          <div className="xl:col-span-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-ink-primary">Recent activity</h3>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-black/[0.04] shadow-sm flex-1">
              <div className="relative border-l border-black/5 ml-3 space-y-8 pb-4">
                
                {/* Activity Item */}
                <div className="relative pl-6">
                  <div className="absolute left-[-11px] top-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-4 border-white">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary">Dispute resolved</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">Dispute 11029a · Vendor released</p>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-tertiary">9:12 AM</span>
                  </div>
                </div>

                {/* Activity Item */}
                <div className="relative pl-6">
                  <div className="absolute left-[-11px] top-0.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-4 border-white">
                    <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary">More evidence requested</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">Dispute 99281b · Buyer</p>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-tertiary">8:47 AM</span>
                  </div>
                </div>

                {/* Activity Item */}
                <div className="relative pl-6">
                  <div className="absolute left-[-11px] top-0.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-4 border-white">
                    <XCircle className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary">Refund issued</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">Dispute 88392c · Merchant SLA missed</p>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-tertiary">8:05 AM</span>
                  </div>
                </div>

                {/* Activity Item */}
                <div className="relative pl-6">
                  <div className="absolute left-[-11px] top-0.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border-4 border-white">
                    <Activity className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary">AI review completed</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">Dispute 77281d · Low confidence</p>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-tertiary">Yesterday</span>
                  </div>
                </div>

                {/* Activity Item */}
                <div className="relative pl-6">
                  <div className="absolute left-[-11px] top-0.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center border-4 border-white">
                    <Clock className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary">Escrow locked</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">Dispute 44102e · High value</p>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-tertiary">Yesterday</span>
                  </div>
                </div>

              </div>
              <button className="w-full mt-2 py-2 rounded-xl text-[13px] font-bold text-ink-primary hover:bg-black/5 transition-colors">
                View all activity
              </button>
            </div>
          </div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
