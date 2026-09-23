'use client';

import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Hourglass, 
  SlidersHorizontal,
  MoreVertical,
  Timer,
  AlertTriangle,
  XCircle,
  Stethoscope,
  BriefcaseMedical,
  HeartPulse,
  ActivitySquare,
  User,
  Sparkles,
  CircleDollarSign,
  Heart,
  CheckCheck
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
        <button className="px-5 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary transition-colors">Week</button>
        <button className="px-5 py-1.5 rounded-full text-ink-secondary text-[13px] font-medium hover:text-ink-primary transition-colors">Month</button>
      </div>
      <button className="px-5 py-2 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-1.5">
        <span className="text-[16px] font-light leading-none">+</span> New Authorization
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
        <p className="text-[13px] font-medium text-ink-tertiary">42 active authorization cases &middot; Monday, Sep 21</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 flex-1 min-h-0">
        
        {/* TOP ROW: Hero Card & KPI Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-shrink-0">
          
          {/* GREEN HERO CARD */}
          <motion.div variants={item} className="xl:col-span-6 bg-[#4A8B63] rounded-[32px] p-3.5 flex flex-col relative overflow-hidden">
            {/* Decorative background curve */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            {/* Pill and link */}
            <div className="flex items-center justify-between px-2 pt-1 pb-3 relative z-10 flex-shrink-0">
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <CircleDollarSign className="w-3.5 h-3.5 text-ink-primary" />
                <span className="text-[12px] font-bold text-ink-primary">Revenue at risk</span>
              </div>
              <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-ink-primary hover:bg-white/90 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-black/15 rounded-[24px] p-5 flex flex-col justify-between relative z-10">
              {/* Main Value */}
              <div className="relative z-10 flex items-end justify-between">
                <div className="mb-2">
                  <h2 className="text-[64px] font-medium text-white leading-none tracking-tighter">
                    ${(totalAmount || 184500).toLocaleString('en-US')}
                  </h2>
                  <p className="text-white/80 text-[12px] mt-2 font-medium">
                    across {disputes.length || 8} cases that may miss their procedure date
                  </p>
                </div>
                {/* Bar Chart (Decorative) */}
                <div className="hidden sm:flex flex-col items-end opacity-100">
                  <div className="flex items-end gap-2 h-[72px] mb-2">
                    {[30, 45, 60, 50, 80, 100].map((h, i) => (
                      <div key={i} className={cn("w-[22px] rounded-full opacity-90", i === 5 ? "bg-[#D8F04B] shadow-[0_0_12px_rgba(216,240,75,0.2)]" : "bg-white/10 bg-hatch border border-white/30")} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-white/50 font-medium uppercase tracking-wider">
                    {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month, i) => (
                      <span key={i} className="w-[22px] text-center">{month}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="border border-white/20 rounded-[16px] p-4 grid grid-cols-3 relative z-10">
                <div className="pr-4">
                  <p className="text-white/70 text-[11px] font-medium mb-1">Recoverable this week</p>
                  <p className="text-white text-[14px] font-bold">$121,300</p>
                </div>
                <div className="border-l border-white/20 px-4">
                  <p className="text-white/70 text-[11px] font-medium mb-1">Largest case</p>
                  <p className="text-white text-[14px] font-bold truncate">$48,200 &middot; Spinal fusion</p>
                </div>
                <div className="border-l border-white/20 pl-4">
                  <p className="text-white/70 text-[11px] font-medium mb-1">Earliest procedure</p>
                  <p className="text-white text-[14px] font-bold">Sep 24</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KPI CARDS CONTAINER */}
          <motion.div variants={item} className="xl:col-span-6 bg-white rounded-[32px] p-6 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-ink-primary">Today</h3>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 h-full min-h-0">
              {/* KPI 1 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Pending<br/>authorizations</p>
                  <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-ink-primary shrink-0">
                    <Hourglass className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">42</p>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#E94E41]" /> <span className="text-[#E94E41] font-semibold">8</span> vs last week
                  </p>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Approval rate<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#2ECA6A] flex items-center justify-center text-ink-primary shrink-0">
                    <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">87.4</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">%</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">2.1 pts</span> last 30 days
                  </p>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">At risk<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#FF9A24] flex items-center justify-center text-ink-primary shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">8</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">cases</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowDownRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">3</span> vs last week
                  </p>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Avg. turnaround<br/>&nbsp;</p>
                  <div className="w-6 h-6 rounded-full bg-[#B292FA] flex items-center justify-center text-white shrink-0">
                    <Timer className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">3.2</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">days</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowDownRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">0.4 d</span> to decision
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
              <div className="flex items-center gap-2">
                <div className="bg-[#FF9A24] text-ink-primary px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(255,154,36,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-ink-primary" />
                  8 cases need action
                </div>
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0">
              <div className="col-span-3">Case</div>
              <div className="col-span-3">Blocking issue</div>
              <div className="col-span-2">Payer</div>
              <div className="col-span-2">Approval odds</div>
              <div className="col-span-2">Due</div>
            </div>

            {/* Scrollable Rows Container */}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-2 pb-2 custom-scrollbar flex-1">
              {[
                { icon: User, name: 'MRI &middot; Lumbar Spine', sub: 'James Carter &middot; PA-48291', issue: 'Missing imaging report', payer: 'UnitedHealthcare', color: 'text-[#1B4086]', odds: 78, segments: 8, due: 'Sep 24' },
                { icon: BriefcaseMedical, name: 'Knee Arthroscopy', sub: 'Maria Gonzalez &middot; PA-48277', issue: 'Missing clinical notes', payer: 'Aetna', color: 'text-[#9C3886]', odds: 61, segments: 6, due: 'Sep 25' },
                { icon: Heart, name: 'Spinal Fusion &middot; L4 to L5', sub: 'Thomas Reed &middot; PA-48102', issue: 'Peer to peer review requested', payer: 'UnitedHealthcare', color: 'text-[#1B4086]', odds: 47, segments: 5, due: 'Sep 25' },
                { icon: User, name: 'CT &middot; Abdomen and Pelvis', sub: 'Emma Wilson &middot; PA-48240', issue: 'Payer requested documents', payer: 'Cigna', color: 'text-[#008985]', odds: 66, segments: 7, due: 'Sep 26' },
                { icon: Stethoscope, name: 'Sleep Study &middot; In lab', sub: 'David Kim &middot; PA-48263', issue: 'Treatment history missing', payer: 'Anthem', color: 'text-[#0060A9]', odds: 54, segments: 5, due: 'Sep 28' },
                { icon: BriefcaseMedical, name: 'Hip Replacement', sub: 'Robert Taylor &middot; PA-48299', issue: 'Missing clinical notes', payer: 'Aetna', color: 'text-[#9C3886]', odds: 32, segments: 3, due: 'Oct 01' },
              ].map((row, i) => (
                <div key={i} className="group grid grid-cols-12 gap-4 items-center px-4 py-2.5 rounded-full bg-[#EBEAE5] hover:brightness-95 transition-all cursor-pointer relative shrink-0">
                  
                  {/* Case Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink-primary shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                      <row.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-ink-primary truncate" dangerouslySetInnerHTML={{ __html: row.name }}></p>
                      <p className="text-[11px] text-ink-tertiary truncate" dangerouslySetInnerHTML={{ __html: row.sub }}></p>
                    </div>
                  </div>

                  {/* Blocking Issue */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FF9A24] flex items-center justify-center text-ink-primary flex-shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </div>
                    <span className="text-[12px] font-medium text-ink-secondary truncate">{row.issue}</span>
                  </div>

                  {/* Payer */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-sm bg-white shadow-sm flex items-center justify-center shrink-0">
                        <span className={cn("text-[10px] font-black tracking-tighter", row.color)}>{row.payer.charAt(0)}</span>
                      </div>
                      <span className={cn("text-[11px] font-black tracking-tighter truncate", row.color)}>{row.payer.toLowerCase().includes('healthcare') ? 'United' : row.payer}</span>
                    </div>
                  </div>

                  {/* Approval Odds */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[13px] font-bold text-ink-primary w-8">{row.odds}%</span>
                    <div className="flex gap-[3px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                        <div 
                          key={bar} 
                          className={cn("w-[3px] h-2.5 rounded-[1px]", bar <= row.segments ? (row.odds > 70 ? 'bg-[#2ECA6A]' : row.odds > 50 ? 'bg-[#FFD700]' : 'bg-[#FF9A24]') : 'bg-black/10')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Due & Action */}
                  <div className="col-span-2 flex items-center justify-between min-w-[110px]">
                    <span className="text-[12px] font-medium text-ink-secondary">{row.due}</span>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium text-ink-primary shadow-sm hover:shadow-md transition-all">
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
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EBEAE5] text-ink-secondary hover:text-ink-primary transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 divide-y divide-black/[0.04]">
              {[
                { icon: CheckCircle2, title: 'Authorization approved', sub: 'MRI &middot; Linda Park', time: '9:12 AM', color: 'bg-[#2ECA6A]' },
                { icon: AlertTriangle, title: 'More documentation requested', sub: 'CT Scan &middot; Emma Wilson', time: '8:47 AM', color: 'bg-[#FF9A24]' },
                { icon: XCircle, title: 'Authorization denied', sub: 'Physical Therapy &middot; Robert Smith', time: '8:05 AM', color: 'bg-[#F36960]' },
                { icon: Sparkles, title: 'AI review completed', sub: 'Knee Arthroscopy &middot; Maria Gonzal...', time: 'Yesterday', color: 'bg-[#B292FA]' },
                { icon: CheckCircle2, title: 'Appeal overturned', sub: 'Epidural Injection &middot; Noah Davis', time: 'Yesterday', color: 'bg-[#2ECA6A]' },
                { icon: Hourglass, title: 'Submitted to payer portal', sub: 'PET Scan &middot; Olivia Brown', time: 'Yesterday', color: 'bg-[#FFD700]' },
              ].map((item, i) => (
                <div key={i} className="py-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="w-4 h-4 text-ink-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 flex justify-between items-start mt-0.5">
                    <div>
                      <p className="text-[13px] font-bold text-ink-primary">{item.title}</p>
                      <p className="text-[12px] font-medium text-ink-tertiary mt-0.5" dangerouslySetInnerHTML={{ __html: item.sub }}></p>
                    </div>
                    <span className="text-[11px] font-medium text-ink-tertiary shrink-0 ml-2">{item.time}</span>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
