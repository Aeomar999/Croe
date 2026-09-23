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
    <div className="flex items-center gap-4 mt-2 lg:mt-0">
      <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02]">
        <button className="px-5 py-1.5 rounded-full bg-ink-primary text-white text-[13px] font-medium">Today</button>
        <button className="px-5 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary">Week</button>
        <button className="px-5 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary">Month</button>
      </div>
      <button className="px-5 py-2 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
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
      <div className="-mt-1 mb-4">
        <p className="text-[13px] font-medium text-ink-tertiary">42 active authorization cases • Monday, Sep 21</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 flex-1 min-h-0">
        
        {/* TOP ROW: Hero Card & KPI Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-shrink-0">
          
          {/* GREEN HERO CARD */}
          <motion.div variants={item} className="xl:col-span-6 bg-[#4A8B63] rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden h-[280px]">
            {/* Pill and link */}
            <div className="flex items-center justify-between relative z-10">
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border border-[#4A8B63] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[#4A8B63]">$</span>
                </div>
                <span className="text-[12px] font-bold text-ink-primary">Revenue at risk</span>
              </div>
              <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-ink-primary hover:bg-white/90 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Main Value */}
            <div className="mt-8 mb-4 relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-[64px] font-medium text-white leading-none tracking-tighter">
                    {formatCurrency(String(totalAmount || 184500), 'USD').replace('.00', '')}
                  </h2>
                  <p className="text-white/80 text-[12px] mt-1 font-medium">
                    across {disputes.length || 8} cases that may miss their procedure date
                  </p>
                </div>
                {/* Bar Chart (Decorative) */}
                <div className="hidden sm:flex flex-col items-end opacity-100">
                  <div className="flex items-end gap-1.5 h-16 mb-2">
                    {[30, 45, 60, 50, 80, 100].map((h, i) => (
                      <div key={i} className={cn("w-3.5 rounded-sm opacity-90", i === 5 ? "bg-[#D8F04B]" : "bg-white/30")} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-white/50 font-medium w-full justify-between pr-1 uppercase tracking-wider">
                    <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Darker Section */}
            <div className="bg-[#38734E] rounded-[24px] px-5 py-4 flex items-center justify-between mt-auto relative z-10">
              <div>
                <p className="text-white/60 text-[11px] font-medium mb-1">Recoverable this week</p>
                <p className="text-white text-[14px] font-bold">{formatCurrency('121300', 'USD').replace('.00', '')}</p>
              </div>
              <div>
                <p className="text-white/60 text-[11px] font-medium mb-1">Largest case</p>
                <p className="text-white text-[14px] font-bold">{formatCurrency('48200', 'USD').replace('.00', '')} · Spinal fusion</p>
              </div>
              <div>
                <p className="text-white/60 text-[11px] font-medium mb-1">Earliest procedure</p>
                <p className="text-white text-[14px] font-bold">Sep 24</p>
              </div>
            </div>
            
            {/* Decorative background curve */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          </motion.div>

          {/* KPI CARDS CONTAINER */}
          <motion.div variants={item} className="xl:col-span-6 bg-white rounded-[32px] p-6 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-[280px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-ink-primary">Today</h3>
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-[#F4F5F6] flex items-center justify-center text-ink-secondary hover:text-ink-primary transition-all">
                  <Filter className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-full bg-[#F4F5F6] flex items-center justify-center text-ink-secondary hover:text-ink-primary transition-all">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 h-full min-h-0">
              {/* KPI 1 */}
              <div className="bg-[#F6F7F9] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Pending<br/>authorizations</p>
                  <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-amber-800 shrink-0">
                    <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">42</p>
                  <p className="text-[10px] font-medium text-state-danger-deep mt-2 flex items-center gap-0.5 opacity-80">
                    <ArrowUpRight className="w-2.5 h-2.5" /> 6 vs last week
                  </p>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-[#F6F7F9] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Approval rate<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#2ECA6A] flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">87.4</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">%</span>
                  </div>
                  <p className="text-[10px] font-medium text-state-secure-deep mt-2 flex items-center gap-0.5 opacity-80">
                    <ArrowUpRight className="w-2.5 h-2.5" /> 2.1 pts last 30 days
                  </p>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-[#F6F7F9] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">At risk<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#FF9A24] flex items-center justify-center text-white shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">8</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">cases</span>
                  </div>
                  <p className="text-[10px] font-medium text-state-secure-deep mt-2 flex items-center gap-0.5 opacity-80">
                    <ArrowDownRight className="w-2.5 h-2.5" /> 3 vs last week
                  </p>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-[#F6F7F9] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Avg. turnaround<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#B292FA] flex items-center justify-center text-white shrink-0">
                    <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">3.2</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">days</span>
                  </div>
                  <p className="text-[10px] font-medium text-state-secure-deep mt-2 flex items-center gap-0.5 opacity-80">
                    <ArrowDownRight className="w-2.5 h-2.5" /> 0.4 d to decision
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM ROW: Tables & Feed (Flexible Height) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
          
          {/* LEFT: Attention Required List */}
          <motion.div variants={item} className="xl:col-span-8 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-[18px] font-bold text-ink-primary">Attention required</h3>
                <p className="text-[12px] text-ink-tertiary font-medium mt-0.5">Sorted by procedure date, then approval odds</p>
              </div>
              <div className="bg-[#FF9A24] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(255,154,36,0.2)]">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                8 cases need action
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary flex-shrink-0">
              <div className="col-span-4">Case</div>
              <div className="col-span-3">Blocking issue</div>
              <div className="col-span-2">Payer</div>
              <div className="col-span-2">Approval odds</div>
              <div className="col-span-1">Due</div>
            </div>

            {/* Scrollable Rows Container */}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-2 pb-2 custom-scrollbar flex-1">
              {[
                { icon: Stethoscope, name: 'MRI · Lumbar Spine', sub: 'James Carter · PA-48291', issue: 'Missing imaging report', payer: 'United Healthcare', odds: 78, due: 'Sep 24' },
                { icon: BriefcaseMedical, name: 'Knee Arthroscopy', sub: 'Maria Gonzalez · PA-48277', issue: 'Missing clinical notes', payer: 'Aetna', odds: 61, due: 'Sep 25' },
                { icon: HeartPulse, name: 'Spinal Fusion · L4 to L5', sub: 'Thomas Reed · PA-48102', issue: 'Peer to peer review requested', payer: 'United Healthcare', odds: 47, due: 'Sep 25' },
                { icon: ActivitySquare, name: 'CT · Abdomen and Pelvis', sub: 'Emma Wilson · PA-48240', issue: 'Payer requested documents', payer: 'Cigna', odds: 66, due: 'Sep 26' },
                { icon: Stethoscope, name: 'Sleep Study · In lab', sub: 'David Kim · PA-48263', issue: 'Treatment history missing', payer: 'Anthem', odds: 54, due: 'Sep 28' },
                { icon: BriefcaseMedical, name: 'Hip Replacement', sub: 'Robert Taylor · PA-48299', issue: 'Missing clinical notes', payer: 'Aetna', odds: 32, due: 'Oct 01' },
                { icon: ActivitySquare, name: 'MRI · Cervical Spine', sub: 'Linda Brown · PA-48301', issue: 'Missing imaging report', payer: 'United Healthcare', odds: 85, due: 'Oct 02' },
              ].map((row, i) => (
                <div key={i} className="group grid grid-cols-12 gap-4 items-center px-4 py-2.5 rounded-full bg-[#F6F7F9] hover:bg-[#F0F1F3] transition-colors cursor-pointer relative shrink-0">
                  
                  {/* Case Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center text-ink-primary shrink-0 shadow-sm">
                      <row.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink-primary truncate">{row.name}</p>
                      <p className="text-[11px] text-ink-tertiary truncate">{row.sub}</p>
                    </div>
                  </div>

                  {/* Blocking Issue */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FFF0DB] flex items-center justify-center text-[#FF9A24] flex-shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
                    </div>
                    <span className="text-[12px] font-medium text-ink-secondary truncate">{row.issue}</span>
                  </div>

                  {/* Payer */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-sm bg-blue-100 flex items-center justify-center text-blue-700 text-[8px] font-bold shrink-0">
                        {row.payer.charAt(0)}
                      </div>
                      <span className="text-[11px] font-medium text-ink-primary truncate">{row.payer}</span>
                    </div>
                  </div>

                  {/* Approval Odds */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink-primary w-8">{row.odds}%</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                        <div 
                          key={bar} 
                          className={cn("w-1.5 h-2.5 rounded-sm", bar * 14 <= row.odds + 10 ? (row.odds > 70 ? 'bg-[#2ECA6A]' : row.odds > 50 ? 'bg-[#FFD700]' : 'bg-[#FF9A24]') : 'bg-black/10')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Due & Action */}
                  <div className="col-span-1 flex items-center justify-between min-w-[110px]">
                    <span className="text-[12px] font-medium text-ink-secondary">{row.due}</span>
                    <button className="px-3 py-1 rounded-full bg-white border border-black/5 text-[11px] font-medium text-ink-primary shadow-sm hover:shadow-md transition-all absolute right-2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100">
                      Review case
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Recent Activity */}
          <motion.div variants={item} className="xl:col-span-4 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-0">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-[18px] font-bold text-ink-primary">Recent activity</h3>
              <button className="w-7 h-7 rounded-full flex items-center justify-center bg-[#F4F5F6] text-ink-secondary hover:text-ink-primary transition-colors">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative border-l border-line-primary ml-3 flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
              <div className="space-y-6 pb-2">
                {/* Activity Item 1 */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#2ECA6A] flex items-center justify-center border-4 border-white shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">Authorization approved</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">MRI · Linda Park</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">9:12 AM</span>
                  </div>
                </div>

                {/* Activity Item 2 */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#FF9A24] flex items-center justify-center border-4 border-white shadow-sm">
                    <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">More documentation requested</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">CT Scan · Emma Wilson</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">8:47 AM</span>
                  </div>
                </div>

                {/* Activity Item 3 */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#F36960] flex items-center justify-center border-4 border-white shadow-sm">
                    <XCircle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">Authorization denied</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">Physical Therapy · Robert Smith</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">8:05 AM</span>
                  </div>
                </div>

                {/* Activity Item 4 */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#B292FA] flex items-center justify-center border-4 border-white shadow-sm">
                    <Activity className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">AI review completed</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">Knee Arthroscopy · Maria Gonzal...</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">Yesterday</span>
                  </div>
                </div>

                {/* Activity Item 5 */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#2ECA6A] flex items-center justify-center border-4 border-white shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">Appeal overturned</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">Epidural Injection · Noah Davis</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">Yesterday</span>
                  </div>
                </div>
                
                {/* Activity Item 6 (Extra for scrolling proof) */}
                <div className="relative pl-5">
                  <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center border-4 border-white shadow-sm">
                    <Clock className="w-2.5 h-2.5 text-amber-800" strokeWidth={3} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-medium text-ink-primary">Submitted to payer portal</p>
                      <p className="text-[11px] text-ink-tertiary mt-0.5">PET Scan · Olivia Brown</p>
                    </div>
                    <span className="text-[10px] font-medium text-ink-tertiary mt-0.5">Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
