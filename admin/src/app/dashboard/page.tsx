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
  Package
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('Today');
  const [exporting, setExporting] = useState(false);

  const { data: queue } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(),
  });

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      window.alert('CSV Export generated and downloaded.');
      setExporting(false);
    }, 800);
  };

  const headerAction = (
    <div className="flex items-center gap-3">
      <div className="flex bg-[#EBEAE5] rounded-full p-1">
        {['Today', 'Week', 'Month'].map(p => (
          <button 
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-5 py-1.5 rounded-full text-[13px] font-medium transition-colors",
              period === p ? "bg-ink-primary text-white" : "text-ink-secondary hover:text-ink-primary"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <button 
        onClick={handleExport}
        disabled={exporting}
        className="px-5 py-2 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-1.5 disabled:opacity-50"
      >
        <span className="text-[16px] font-light leading-none">+</span> {exporting ? 'Exporting...' : 'Export Report'}
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Platform Pulse"
      subtitle="Real-time escrow network telemetry"
      headerAction={headerAction}
    >
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 flex-1 min-h-0">
        
        {/* Split KPI Row (God-Tier UI) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-shrink-0">
          
          {/* LEFT: Revenue at Risk (Green Feature Card) */}
          <motion.div variants={item} className="xl:col-span-5 bg-[#4A8B63] rounded-[32px] p-2 flex flex-col justify-between relative overflow-hidden shadow-lg border border-black/5">
            {/* Top row */}
            <div className="flex justify-between items-start mb-2 px-3 pt-2">
              <button className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-ink-primary text-[12px] font-medium shadow-sm">
                <CircleDollarSign className="w-3.5 h-3.5 text-ink-primary" strokeWidth={2} /> Escrow Volume at Risk
              </button>
              <button onClick={() => router.push('/disputes/queue')} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink-primary hover:bg-black/5 transition-colors shadow-sm">
                <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Dark Nest */}
            <div className="bg-[#3A7550] rounded-[24px] p-4 flex flex-col relative border border-white/5 shadow-inner">
              <div className="flex items-end justify-between mb-1">
                <h2 className="text-[56px] font-light leading-none tracking-tight text-white flex items-baseline">
                  <span className="text-[40px] font-light mr-1">₵</span>184,500
                </h2>
                {/* Mini Bar Chart */}
                <div className="flex items-end gap-1 pb-3 pl-2">
                  {[
                    { month: 'Apr', h: 'h-6' },
                    { month: 'May', h: 'h-4' },
                    { month: 'Jun', h: 'h-8' },
                    { month: 'Jul', h: 'h-5' },
                    { month: 'Aug', h: 'h-10' }
                  ].map(bar => (
                    <div key={bar.month} className="relative flex flex-col items-center">
                      <div 
                        className={cn("w-3 rounded-full border border-white/30", bar.h)}
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)' }}
                      />
                      <span className="absolute -bottom-4 text-[9px] text-white/60">{bar.month}</span>
                    </div>
                  ))}
                  {/* Current Month Active Bar */}
                  <div className="relative flex flex-col items-center ml-0.5">
                    <div className="w-3 h-12 bg-[#D7FF26] rounded-full shadow-[0_0_8px_rgba(215,255,38,0.4)]" />
                    <span className="absolute -bottom-4 text-[9px] text-white/60">Sep</span>
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-white/90 mb-3 font-medium">
                across {queue?.length || 8} cases that may miss their delivery SLA
              </p>

              {/* Bottom Split Stats */}
              <div className="grid grid-cols-3 border border-white/20 rounded-[12px] overflow-hidden">
                <div className="p-2.5 border-r border-white/20">
                  <p className="text-[10px] font-medium text-white/80 mb-0.5">Resolved this week</p>
                  <p className="text-[12px] font-bold text-white">₵121,300</p>
                </div>
                <div className="p-2.5 border-r border-white/20">
                  <p className="text-[10px] font-medium text-white/80 mb-0.5">Largest case</p>
                  <p className="text-[12px] font-bold text-white truncate">₵48,200 &middot; TXN-8829</p>
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] font-medium text-white/80 mb-0.5">Oldest procedure</p>
                  <p className="text-[12px] font-bold text-white">Sep 24</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Today's Metrics (White Nested Container) */}
          <motion.div variants={item} className="xl:col-span-7 bg-white rounded-[32px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex justify-between items-center mb-3 px-2">
              <h2 className="text-[18px] font-bold text-ink-primary">Today</h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              {[
                { title: 'Pending L3 Reviews', value: queue?.length || 42, label: '', change: '6 vs last week', up: false, icon: Hourglass, bg: 'bg-[#FFCC00]' },
                { title: 'AI Automation Rate', value: '87.4', label: '%', change: '2.1 pts last 30 days', up: true, icon: Bot, bg: 'bg-[#2ECA6A]' },
                { title: 'Active Fraud Locks', value: '12', label: 'users', change: '3 vs last week', up: false, icon: ShieldAlert, bg: 'bg-[#FF9A24]' },
                { title: 'Avg. turnaround', value: '3.2', label: 'days', change: '0.4 d to decision', up: true, icon: CheckCircle2, bg: 'bg-[#B292FA]' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#EBEAE5] rounded-[20px] p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[11px] font-bold text-ink-secondary leading-tight pr-1">{stat.title}</p>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", stat.bg)}>
                      <stat.icon className="w-2.5 h-2.5 text-ink-primary" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <h3 className="text-[28px] font-medium leading-none tracking-tight text-ink-primary">{stat.value}</h3>
                      {stat.label && <span className="text-[11px] font-bold text-ink-secondary">{stat.label}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center text-[9px] font-bold", stat.up ? "text-[#2ECA6A]" : "text-[#F36960]")}>
                        {stat.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      </div>
                      <span className="text-[9px] font-medium text-ink-tertiary truncate">{stat.change}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Split (9 col / 3 col) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
          
          {/* LEFT: Active L3 Queue */}
          <motion.div variants={item} className="xl:col-span-9 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-[18px] font-bold text-ink-primary flex items-center gap-2">
                  L3 Review Queue <span className="bg-[#FF9A24] text-ink-primary text-[10px] px-2 py-0.5 rounded-full font-bold">URGENT</span>
                </h3>
                <p className="text-[12px] text-ink-tertiary font-medium mt-1">Escalated disputes requiring human arbitration</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.alert('Filters modal would open here')} className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => router.push('/disputes/queue')} className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center text-ink-primary hover:brightness-95 transition-all" title="View all">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-tertiary flex-shrink-0 border-b border-black/[0.04] mb-2">
              <div className="col-span-3">Case ID & Context</div>
              <div className="col-span-3">Blocking Issue</div>
              <div className="col-span-2">Payer / Rail</div>
              <div className="col-span-2">AI Confidence</div>
              <div className="col-span-2">Due</div>
            </div>

            {/* Scrollable Rows Container */}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-2 pb-2 custom-scrollbar flex-1">
              {[
                { id: 'TXN-8829', icon: ShoppingBag, name: 'TXN-8829 &middot; iPhone 15 Pro Max', sub: 'Buyer: @davidk &middot; Vendor: @techstore', issue: 'AI Confidence < 90%', payer: 'MTN MoMo', color: 'text-[#FFCC00]', odds: 82, segments: 8, due: '2h ago' },
                { id: 'TXN-4921', icon: Package, name: 'TXN-4921 &middot; Nike Air Jordan', sub: 'Buyer: @samuel &middot; Vendor: @sneakerhead', issue: 'Missing delivery proof', payer: 'Telecel Cash', color: 'text-[#E31221]', odds: 61, segments: 6, due: '4h ago' },
                { id: 'TXN-1102', icon: ShieldAlert, name: 'TXN-1102 &middot; MacBook Pro M2', sub: 'Buyer: @emily &middot; Vendor: @macstore', issue: 'Rule 3: Suspect IP match', payer: 'AirtelTigo', color: 'text-[#1E90FF]', odds: 47, segments: 5, due: '6h ago' },
                { id: 'TXN-3394', icon: ShoppingBag, name: 'TXN-3394 &middot; PlayStation 5', sub: 'Buyer: @michael &middot; Vendor: @gamerzone', issue: 'Item completely damaged', payer: 'MTN MoMo', color: 'text-[#FFCC00]', odds: 66, segments: 7, due: '12h ago' },
                { id: 'TXN-8201', icon: Wallet, name: 'TXN-8201 &middot; Freelance Design', sub: 'Buyer: @sarah &middot; Vendor: @creatives', issue: 'Dispute over revisions', payer: 'Bank Transfer', color: 'text-[#008985]', odds: 54, segments: 5, due: '1d ago' },
                { id: 'TXN-5510', icon: Package, name: 'TXN-5510 &middot; Gucci Handbag', sub: 'Buyer: @chloe &middot; Vendor: @luxurybag', issue: 'Vendor unresponsive', payer: 'Telecel Cash', color: 'text-[#E31221]', odds: 32, segments: 3, due: '2d ago' },
              ].map((row, i) => (
                <div key={i} onClick={() => router.push(`/disputes/${row.id}`)} className="group grid grid-cols-12 gap-4 items-center px-4 py-2.5 rounded-full bg-[#EBEAE5] hover:brightness-95 transition-all cursor-pointer relative shrink-0">
                  
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
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/disputes/${row.id}`); }} className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium text-ink-primary shadow-sm hover:shadow-md transition-all">
                      Review case
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Recent Activity */}
          <motion.div variants={item} className="xl:col-span-3 flex flex-col bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-0">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-[18px] font-bold text-ink-primary">Platform Ledger Log</h3>
              <button onClick={() => router.push('/ledger')} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EBEAE5] text-ink-secondary hover:text-ink-primary transition-colors">
                <ArrowUpRight className="w-4 h-4" />
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
              <button onClick={() => router.push('/ledger')} className="w-full mt-3 py-2 rounded-full border border-black/5 text-[11px] font-bold text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-all">
                View full ledger
              </button>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
