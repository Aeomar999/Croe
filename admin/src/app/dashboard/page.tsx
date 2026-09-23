'use client';

import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock, 
  Filter,
  MoreVertical,
  Activity,
  AlertTriangle,
  XCircle,
  Stethoscope,
  BriefcaseMedical,
  HeartPulse,
  ActivitySquare
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const { data: disputes = [] } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(10),
  });

  const totalAmount = disputes.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

  const headerAction = (
    <div className="flex items-center gap-3 mt-4 lg:mt-0">
      <div className="flex items-center bg-white rounded-full p-1 border border-black/[0.04]">
        <button className="px-4 py-1.5 rounded-full bg-ink-primary text-white text-[13px] font-medium">Today</button>
        <button className="px-4 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary">Week</button>
        <button className="px-4 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary">Month</button>
      </div>
      <button className="px-4 py-1.5 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors">
        + New Authorization
      </button>
    </div>
  );

  return (
    <AdminLayout 
      title="Good morning, Sarah" 
      subtitle="Revenue Cycle Overview"
      headerAction={headerAction}
    >
      {/* Date sub-header underneath the title */}
      <div className="-mt-4 mb-6">
        <p className="text-[14px] text-ink-tertiary">42 active authorization cases • Monday, Sep 21</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
        
        {/* TOP ROW: Hero Card & KPI Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* GREEN HERO CARD */}
          <motion.div variants={item} className="xl:col-span-5 bg-[#368257] rounded-[32px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Pill and link */}
            <div className="flex items-center justify-between relative z-10">
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#368257]">℗</span>
                <span className="text-[12px] font-bold text-[#368257]">Revenue at risk</span>
              </div>
              <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink-primary hover:bg-white/90 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Main Value */}
            <div className="mt-12 mb-8 relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-[56px] lg:text-[72px] font-bold text-white leading-none tracking-tight">
                    {formatCurrency(String(totalAmount || 184500), 'USD')}
                  </h2>
                  <p className="text-white/90 text-[14px] mt-3 font-medium">
                    across {disputes.length || 8} cases that may miss their procedure date
                  </p>
                </div>
                {/* Bar Chart (Decorative) */}
                <div className="hidden sm:flex flex-col items-end opacity-100">
                  <div className="flex items-end gap-1.5 h-20 mb-2">
                    {[30, 45, 60, 50, 80, 100].map((h, i) => (
                      <div key={i} className={cn("w-3.5 rounded-sm", i === 5 ? "bg-[#D8F04B]" : "bg-[#80B899]")} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-white/70 font-semibold w-full justify-between pr-1">
                    <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Darker Section */}
            <div className="bg-[#2B6D47] rounded-[20px] p-5 flex items-center justify-between mt-auto relative z-10">
              <div>
                <p className="text-white/70 text-[13px] font-medium mb-1">Recoverable this week</p>
                <p className="text-white text-[15px] font-bold">{formatCurrency('121300', 'USD')}</p>
              </div>
              <div>
                <p className="text-white/70 text-[13px] font-medium mb-1">Largest case</p>
                <p className="text-white text-[15px] font-bold">{formatCurrency('48200', 'USD')} · Spinal fusion</p>
              </div>
              <div>
                <p className="text-white/70 text-[13px] font-medium mb-1">Earliest procedure</p>
                <p className="text-white text-[15px] font-bold">Sep 24</p>
              </div>
            </div>
            
            {/* Decorative background curve */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          </motion.div>

          {/* KPI CARDS */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-4">
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
              <motion.div variants={item} className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-tertiary leading-tight">Pending<br/>authorizations</p>
                  <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-amber-800">
                    <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-[36px] font-bold text-ink-primary leading-none tracking-tight">42</p>
                  <p className="text-[11px] font-bold text-state-danger-deep mt-3 flex items-center gap-0.5 opacity-80">
                    <ArrowUpRight className="w-3 h-3" /> 6 vs last week
                  </p>
                </div>
              </motion.div>

              {/* KPI 2 */}
              <motion.div variants={item} className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-tertiary leading-tight">Approval rate<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#2ECA6A] flex items-center justify-center text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-bold text-ink-primary leading-none tracking-tight">87.4</p>
                    <span className="text-[16px] font-bold text-ink-tertiary">%</span>
                  </div>
                  <p className="text-[11px] font-bold text-state-secure-deep mt-3 flex items-center gap-0.5 opacity-80">
                    <ArrowUpRight className="w-3 h-3" /> 2.1 pts last 30 days
                  </p>
                </div>
              </motion.div>

              {/* KPI 3 */}
              <motion.div variants={item} className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-tertiary leading-tight">At risk<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#FF9A24] flex items-center justify-center text-white">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-bold text-ink-primary leading-none tracking-tight">8</p>
                    <span className="text-[16px] font-bold text-ink-tertiary">cases</span>
                  </div>
                  <p className="text-[11px] font-bold text-state-secure-deep mt-3 flex items-center gap-0.5 opacity-80">
                    <ArrowDownRight className="w-3 h-3" /> 3 vs last week
                  </p>
                </div>
              </motion.div>

              {/* KPI 4 */}
              <motion.div variants={item} className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[13px] font-semibold text-ink-tertiary leading-tight">Avg. turnaround<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#B292FA] flex items-center justify-center text-white">
                    <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-bold text-ink-primary leading-none tracking-tight">3.2</p>
                    <span className="text-[16px] font-bold text-ink-tertiary">days</span>
                  </div>
                  <p className="text-[11px] font-bold text-state-secure-deep mt-3 flex items-center gap-0.5 opacity-80">
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
          <div className="xl:col-span-8 flex flex-col bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[20px] font-bold text-ink-primary">Attention required</h3>
                <p className="text-[13px] text-ink-tertiary font-medium mt-1">Sorted by procedure date, then approval odds</p>
              </div>
              <div className="bg-[#FF9A24] text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-[12px] font-bold cursor-pointer hover:bg-opacity-90 transition-colors shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                8 cases need action
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 px-2 py-1 text-[12px] font-semibold text-ink-tertiary">
                <div className="col-span-4">Case</div>
                <div className="col-span-3">Blocking issue</div>
                <div className="col-span-2 text-center">Payer</div>
                <div className="col-span-2">Approval odds</div>
                <div className="col-span-1">Due</div>
              </div>

              {/* Rows */}
              {[
                { icon: Stethoscope, name: 'MRI · Lumbar Spine', sub: 'James Carter · PA-48291', issue: 'Missing imaging report', payer: 'United Healthcare', odds: 78, due: 'Sep 24' },
                { icon: BriefcaseMedical, name: 'Knee Arthroscopy', sub: 'Maria Gonzalez · PA-48277', issue: 'Missing clinical notes', payer: 'Aetna', odds: 61, due: 'Sep 25' },
                { icon: HeartPulse, name: 'Spinal Fusion · L4 to L5', sub: 'Thomas Reed · PA-48102', issue: 'Peer to peer review requested', payer: 'United Healthcare', odds: 47, due: 'Sep 25' },
                { icon: ActivitySquare, name: 'CT · Abdomen and Pelvis', sub: 'Emma Wilson · PA-48240', issue: 'Payer requested documents', payer: 'Cigna', odds: 66, due: 'Sep 26' },
                { icon: Stethoscope, name: 'Sleep Study · In lab', sub: 'David Kim · PA-48263', issue: 'Treatment history missing', payer: 'Anthem', odds: 54, due: 'Sep 28' },
              ].map((row, i) => (
                <div key={i} className="group grid grid-cols-12 gap-4 items-center p-3 rounded-[16px] border border-line-primary/40 bg-white hover:border-black/10 transition-colors cursor-pointer">
                  
                  {/* Case Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#F1F2F4] border border-black/5 flex items-center justify-center text-ink-primary">
                      <row.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-ink-primary group-hover:text-[#368257] transition-colors">{row.name}</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5">{row.sub}</p>
                    </div>
                  </div>

                  {/* Blocking Issue */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#FFF0DB] flex items-center justify-center text-[#FF9A24] flex-shrink-0">
                      <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                    </div>
                    <span className="text-[13px] font-semibold text-ink-secondary truncate">{row.issue}</span>
                  </div>

                  {/* Payer */}
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-[11px] font-extrabold text-[#112399] tracking-tighter uppercase px-2 py-1 bg-blue-50 rounded-md">
                      {row.payer.slice(0, 8)}
                    </div>
                  </div>

                  {/* Approval Odds */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[14px] font-bold text-ink-primary w-10">{row.odds}%</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                        <div 
                          key={bar} 
                          className={cn("w-1.5 h-3 rounded-sm", bar * 14 <= row.odds + 10 ? (row.odds > 70 ? 'bg-[#2ECA6A]' : row.odds > 50 ? 'bg-[#FFD700]' : 'bg-[#FF9A24]') : 'bg-black/10')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Due & Action */}
                  <div className="col-span-1 flex items-center justify-between min-w-[130px]">
                    <span className="text-[13px] font-semibold text-ink-secondary">{row.due}</span>
                    <button className="px-4 py-1.5 rounded-full border border-black/10 text-[12px] font-bold text-ink-primary hover:bg-black/5 transition-colors opacity-0 group-hover:opacity-100 absolute right-12 bg-white shadow-sm">
                      Review case
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Recent Activity */}
          <div className="xl:col-span-4 flex flex-col bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[20px] font-bold text-ink-primary">Recent activity</h3>
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 text-ink-secondary hover:text-ink-primary transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="relative border-l-2 border-line-primary ml-4 space-y-8 flex-1">
              
              {/* Activity Item 1 */}
              <div className="relative pl-6">
                <div className="absolute left-[-13px] top-0 w-6 h-6 rounded-full bg-[#2ECA6A] flex items-center justify-center border-4 border-white shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-ink-primary">Authorization approved</p>
                    <p className="text-[12px] font-medium text-ink-tertiary mt-1">MRI · Linda Park</p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-tertiary mt-0.5">9:12 AM</span>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="relative pl-6">
                <div className="absolute left-[-13px] top-0 w-6 h-6 rounded-full bg-[#FF9A24] flex items-center justify-center border-4 border-white shadow-sm">
                  <AlertTriangle className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-ink-primary">More documentation requested</p>
                    <p className="text-[12px] font-medium text-ink-tertiary mt-1">CT Scan · Emma Wilson</p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-tertiary mt-0.5">8:47 AM</span>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div className="relative pl-6">
                <div className="absolute left-[-13px] top-0 w-6 h-6 rounded-full bg-[#F36960] flex items-center justify-center border-4 border-white shadow-sm">
                  <XCircle className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-ink-primary">Authorization denied</p>
                    <p className="text-[12px] font-medium text-ink-tertiary mt-1">Physical Therapy · Robert Smith</p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-tertiary mt-0.5">8:05 AM</span>
                </div>
              </div>

              {/* Activity Item 4 */}
              <div className="relative pl-6">
                <div className="absolute left-[-13px] top-0 w-6 h-6 rounded-full bg-[#B292FA] flex items-center justify-center border-4 border-white shadow-sm">
                  <Activity className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-ink-primary">AI review completed</p>
                    <p className="text-[12px] font-medium text-ink-tertiary mt-1">Knee Arthroscopy · Maria Gonzal...</p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-tertiary mt-0.5">Yesterday</span>
                </div>
              </div>

              {/* Activity Item 5 */}
              <div className="relative pl-6">
                <div className="absolute left-[-13px] top-0 w-6 h-6 rounded-full bg-[#2ECA6A] flex items-center justify-center border-4 border-white shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-ink-primary">Appeal overturned</p>
                    <p className="text-[12px] font-medium text-ink-tertiary mt-1">Epidural Injection · Noah Davis</p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-tertiary mt-0.5">Yesterday</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
