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
  AlertTriangle,
  CircleDollarSign,
  ShieldAlert,
  Bot,
  Lock,
  Wallet,
  ShoppingBag,
  Package,
  FileWarning
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
        <span className="text-[16px] font-light leading-none">+</span> Export Report
      </button>
    </div>
  );

  return (
    <AdminLayout 
      title="Good morning, Reviewer" 
      subtitle="Croe Escrow & Adjudication"
      headerAction={headerAction}
    >
      {/* Date sub-header underneath the title */}
      <div className="-mt-1 mb-4">
        <p className="text-[13px] font-medium text-ink-tertiary">128 active escrow disputes &middot; Monday, Sep 21</p>
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
                <span className="text-[12px] font-bold text-ink-primary">Disputed Funds</span>
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
                    GHS {(totalAmount || 184500).toLocaleString('en-US')}
                  </h2>
                  <p className="text-white/80 text-[12px] mt-2 font-medium">
                    across 42 cases awaiting human adjudication (L3)
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
                  <p className="text-white/70 text-[11px] font-medium mb-1">Awaiting L3 review</p>
                  <p className="text-white text-[14px] font-bold">GHS 121,300</p>
                </div>
                <div className="border-l border-white/20 px-4">
                  <p className="text-white/70 text-[11px] font-medium mb-1">Largest dispute</p>
                  <p className="text-white text-[14px] font-bold truncate">GHS 48,200 &middot; iPhone 15 Pro Max</p>
                </div>
                <div className="border-l border-white/20 pl-4">
                  <p className="text-white/70 text-[11px] font-medium mb-1">Oldest dispute</p>
                  <p className="text-white text-[14px] font-bold">Sep 14</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KPI CARDS CONTAINER */}
          <motion.div variants={item} className="xl:col-span-6 bg-white rounded-[32px] p-6 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-ink-primary">Platform Pulse</h3>
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
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Total Secured<br/>Volume</p>
                  <div className="w-6 h-6 rounded-full bg-[#D8F04B] flex items-center justify-center text-ink-primary shrink-0">
                    <Lock className="w-3 h-3" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">2.4</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">M</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">12%</span> vs last week
                  </p>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Active<br/>Disputes</p>
                  <div className="w-6 h-6 rounded-full bg-[#FF9A24] flex items-center justify-center text-ink-primary shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">128</p>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#E94E41]" /> <span className="text-[#E94E41] font-semibold">14</span> vs last week
                  </p>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">AI Resolution<br/>Rate</p>
                  <div className="w-6 h-6 rounded-full bg-[#B292FA] flex items-center justify-center text-white shrink-0">
                    <Bot className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">94.2</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">%</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">2.1 pts</span> last 30 days
                  </p>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-ink-secondary leading-snug">Fraud<br/>Lockouts</p>
                  <div className="w-6 h-6 rounded-full bg-[#F36960] flex items-center justify-center text-white shrink-0">
                    <ShieldAlert className="w-3 h-3" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[36px] font-medium text-ink-primary leading-none tracking-tight">14</p>
                    <span className="text-[12px] font-medium text-ink-tertiary">users</span>
                  </div>
                  <p className="text-[10px] font-medium text-ink-secondary mt-2 flex items-center gap-0.5">
                    <ArrowDownRight className="w-2.5 h-2.5 text-[#2ECA6A]" /> <span className="text-[#2ECA6A] font-semibold">3</span> vs last week
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
                <h3 className="text-[18px] font-bold text-ink-primary">L3 Review Queue</h3>
                <p className="text-[12px] text-ink-tertiary font-medium mt-0.5">Sorted by amount, then AI risk score</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-[#FF9A24] text-ink-primary px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(255,154,36,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-ink-primary" />
                  42 cases need action
                </div>
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0">
              <div className="col-span-3">Transaction</div>
              <div className="col-span-3">Escalation Issue</div>
              <div className="col-span-2">Payment Rail</div>
              <div className="col-span-2">AI Confidence</div>
              <div className="col-span-2">Due</div>
            </div>

            {/* Scrollable Rows Container */}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-2 pb-2 custom-scrollbar flex-1">
              {[
                { icon: ShoppingBag, name: 'TXN-8829 &middot; iPhone 15 Pro Max', sub: 'Buyer: @davidk &middot; Vendor: @techstore', issue: 'AI Confidence < 90%', payer: 'MTN MoMo', color: 'text-[#FFCC00]', odds: 82, segments: 8, due: '2h ago' },
                { icon: Package, name: 'TXN-4921 &middot; Nike Air Jordan', sub: 'Buyer: @samuel &middot; Vendor: @sneakerhead', issue: 'Missing delivery proof', payer: 'Telecel Cash', color: 'text-[#E31221]', odds: 61, segments: 6, due: '4h ago' },
                { icon: ShieldAlert, name: 'TXN-1102 &middot; MacBook Pro M2', sub: 'Buyer: @emily &middot; Vendor: @macstore', issue: 'Rule 3: Suspect IP match', payer: 'AirtelTigo', color: 'text-[#1E90FF]', odds: 47, segments: 5, due: '6h ago' },
                { icon: ShoppingBag, name: 'TXN-3394 &middot; PlayStation 5', sub: 'Buyer: @michael &middot; Vendor: @gamerzone', issue: 'Item completely damaged', payer: 'MTN MoMo', color: 'text-[#FFCC00]', odds: 66, segments: 7, due: '12h ago' },
                { icon: Wallet, name: 'TXN-8201 &middot; Freelance Design', sub: 'Buyer: @sarah &middot; Vendor: @creatives', issue: 'Dispute over revisions', payer: 'Bank Transfer', color: 'text-[#008985]', odds: 54, segments: 5, due: '1d ago' },
                { icon: Package, name: 'TXN-5510 &middot; Gucci Handbag', sub: 'Buyer: @chloe &middot; Vendor: @luxurybag', issue: 'Vendor unresponsive', payer: 'Telecel Cash', color: 'text-[#E31221]', odds: 32, segments: 3, due: '2d ago' },
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

                  {/* Payer / Rail */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-sm bg-white shadow-sm flex items-center justify-center shrink-0">
                        <span className={cn("text-[10px] font-black tracking-tighter", row.color)}>{row.payer.charAt(0)}</span>
                      </div>
                      <span className={cn("text-[11px] font-black tracking-tighter truncate", row.color)}>{row.payer}</span>
                    </div>
                  </div>

                  {/* AI Confidence / Odds */}
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
              <h3 className="text-[18px] font-bold text-ink-primary">Platform Ledger Log</h3>
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EBEAE5] text-ink-secondary hover:text-ink-primary transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 divide-y divide-black/[0.04]">
              {[
                { icon: CheckCircle2, title: 'FUNDS_RELEASED', sub: 'TXN-4421 &middot; Automated by AI', time: '9:12 AM', color: 'bg-[#2ECA6A]' },
                { icon: AlertTriangle, title: 'DISPUTE_OPENED', sub: 'TXN-8829 &middot; Item not received', time: '8:47 AM', color: 'bg-[#FF9A24]' },
                { icon: Wallet, title: 'REFUND_ISSUED', sub: 'TXN-1029 &middot; Buyer fully refunded', time: '8:05 AM', color: 'bg-[#F36960]' },
                { icon: Bot, title: 'AI_PROCESSING', sub: 'TXN-8829 &middot; Analyzing evidence...', time: 'Yesterday', color: 'bg-[#B292FA]' },
                { icon: ShieldAlert, title: 'FRAUD_LOCKOUT', sub: 'User @scammer99 &middot; Frozen', time: 'Yesterday', color: 'bg-[#F36960]' },
                { icon: Lock, title: 'FUNDS_SECURED', sub: 'TXN-9011 &middot; Escrow held', time: 'Yesterday', color: 'bg-[#FFD700]' },
              ].map((item, i) => (
                <div key={i} className="py-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="w-4 h-4 text-ink-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-ink-primary">{item.title}</p>
                    <p className="text-[11px] font-medium text-ink-secondary truncate" dangerouslySetInnerHTML={{ __html: item.sub }}></p>
                  </div>
                  <span className="text-[10px] font-medium text-ink-tertiary whitespace-nowrap">{item.time}</span>
                </div>
              ))}
              </div>
              <button className="w-full mt-3 py-2 rounded-full border border-black/5 text-[11px] font-bold text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-all">
                View full ledger
              </button>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
