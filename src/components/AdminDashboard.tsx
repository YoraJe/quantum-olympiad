import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, LogOut, Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  pollProfiles,
  subscribeToQuizFeed,
  type Profile,
  type RealtimeFeedItem,
} from '@/lib/supabaseClient';

interface AdminDashboardProps {
  currentUser: Profile;
  onLogout: () => void;
}

export function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feed, setFeed] = useState<RealtimeFeedItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [feedCount, setFeedCount] = useState(0);
  const [sortField, setSortField] = useState<'streak' | 'date' | 'name'>('streak');
  const [sortAsc, setSortAsc] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [, setTick] = useState(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToQuizFeed((item) => {
      setFeed(prev => [item, ...prev].slice(0, 50));
      setFeedCount(prev => prev + 1);
    });
    const connectTimer = setTimeout(() => setIsConnected(true), 500);
    return () => { unsubscribe(); clearTimeout(connectTimer); setIsConnected(false); };
  }, []);

  useEffect(() => {
    setProfilesLoading(true);
    const stopPolling = pollProfiles((data) => {
      setProfiles(data);
      setProfilesLoading(false);
    }, 10000);
    return stopPolling;
  }, []);

  const handleSort = useCallback((field: 'streak' | 'date' | 'name') => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(field === 'name'); }
  }, [sortField]);

  const sortedProfiles = [...profiles].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'streak': cmp = a.current_streak - b.current_streak; break;
      case 'name': cmp = a.display_name.localeCompare(b.display_name); break;
      case 'date': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const students = profiles.filter(p => p.role === 'student');
  const activeUsers = students.length;
  const avgStreak = students.length > 0
    ? Math.round(students.reduce((s, p) => s + p.current_streak, 0) / students.length) : 0;
  const topStreak = students.length > 0
    ? Math.max(...students.map(p => p.current_streak)) : 0;
  const totalSolved = feedCount + students.reduce((s, p) => s + p.current_streak, 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 3) return 'now';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen max-w-6xl mx-auto px-6 py-6 font-mono"
    >
      {/* ---- HEADER BAR ---- */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-2 h-2',
            isConnected ? 'bg-[#FF4D00]' : 'bg-zinc-800'
          )} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            {isConnected ? 'SYS_ONLINE' : 'SYS_CONNECTING'}
          </span>
          <span className="text-zinc-800">|</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-700">Admin Console</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-700 uppercase tracking-widest">{currentUser.display_name}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-400 transition-colors text-[10px] uppercase tracking-widest"
          >
            <LogOut className="w-3 h-3" />
            Exit
          </button>
        </div>
      </div>

      {/* ---- TELEMETRY STATS BAR ---- */}
      <div className="flex items-stretch border border-zinc-900 mb-8">
        {[
          { label: 'NET_SOLVED', value: totalSolved },
          { label: 'ACTIVE_OPS', value: activeUsers },
          { label: 'AVG_STREAK', value: avgStreak },
          { label: 'PEAK_STREAK', value: topStreak },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className={cn(
              'flex-1 px-4 py-4',
              idx > 0 && 'border-l border-zinc-900'
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-700 mb-1">{stat.label}</p>
            <AnimatePresence mode="popLayout">
              <motion.p
                key={stat.value}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 4, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xl font-bold text-white"
              >
                {stat.value.toLocaleString()}
              </motion.p>
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* ---- MAIN GRID ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ======== SYSTEM LOG (Live Feed) ======== */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-1.5 h-1.5',
                isConnected ? 'bg-[#FF4D00] animate-pulse' : 'bg-zinc-800'
              )} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Audit_Log</span>
            </div>
            <span className="text-[10px] text-zinc-800 uppercase tracking-widest">{feed.length} entries</span>
          </div>

          <div
            ref={feedContainerRef}
            className="max-h-[540px] overflow-y-auto border-t border-zinc-900"
          >
            {feed.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-zinc-800 text-[10px] uppercase tracking-widest animate-pulse">Awaiting telemetry...</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {feed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-zinc-900/50 px-2 py-2 hover:bg-white/[0.01] transition-colors text-[11px] leading-relaxed"
                  >
                    <span className="text-zinc-800">{formatTime(item.timestamp)}</span>
                    <span className="text-zinc-800 mx-1">&gt;</span>
                    <span className="text-zinc-400">{item.userName}</span>
                    <span className="text-zinc-800 mx-1">&gt;</span>
                    <span className="text-zinc-600">{item.subject}</span>
                    <span className="text-zinc-800 mx-1">&gt;</span>
                    {item.isCorrect ? (
                      <span className="text-emerald-600">[SUCCESS]</span>
                    ) : (
                      <span className="text-red-600">[FAIL]</span>
                    )}
                    {item.streak > 20 && (
                      <>
                        <span className="text-zinc-800 mx-1">&gt;</span>
                        <span className="text-[#FF4D00]">STR:{item.streak}</span>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ======== DATA GRID (User Table) ======== */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Operator_Registry</span>
            <span className="text-[10px] text-zinc-800 uppercase tracking-widest">{profiles.length} records</span>
          </div>

          {profilesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-4 h-4 text-zinc-800 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-zinc-900">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-900">
                    <th className="text-left py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em]">#</th>
                    <th
                      className="text-left py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em] cursor-pointer hover:text-zinc-400 transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      <span className="flex items-center gap-1">Operator <SortIcon field="name" /></span>
                    </th>
                    <th className="text-left py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em] hidden md:table-cell">Identity</th>
                    <th className="text-center py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em]">Class</th>
                    <th className="text-center py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em]">Lvl</th>
                    <th
                      className="text-right py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em] cursor-pointer hover:text-zinc-400 transition-colors select-none"
                      onClick={() => handleSort('streak')}
                    >
                      <span className="flex items-center gap-1 justify-end">Streak <SortIcon field="streak" /></span>
                    </th>
                    <th
                      className="text-right py-2 text-[10px] text-zinc-700 font-normal uppercase tracking-[0.15em] cursor-pointer hover:text-zinc-400 transition-colors select-none hidden lg:table-cell"
                      onClick={() => handleSort('date')}
                    >
                      <span className="flex items-center gap-1 justify-end">Registered <SortIcon field="date" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfiles.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01, layout: { duration: 0.15 } }}
                      className="border-b border-zinc-900/50 hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="py-2 text-[11px] text-zinc-800">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2 text-[12px] text-zinc-300">
                        {user.display_name}
                      </td>
                      <td className="py-2 text-[11px] text-zinc-700 hidden md:table-cell">
                        {user.email}
                      </td>
                      <td className="py-2 text-center">
                        <span className={cn(
                          'text-[10px] uppercase tracking-wider px-1.5 py-0.5 border',
                          user.role === 'admin'
                            ? 'border-zinc-600 text-zinc-400'
                            : 'border-zinc-800 text-zinc-600'
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-zinc-800 text-zinc-600">
                          {user.level}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={user.current_streak}
                            initial={{ y: -3, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 3, opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className={cn(
                              'text-[12px] font-bold',
                              user.current_streak >= 30 ? 'text-[#FF4D00]' :
                              user.current_streak >= 15 ? 'text-zinc-300' :
                              'text-zinc-700'
                            )}
                          >
                            {user.current_streak}
                          </motion.span>
                        </AnimatePresence>
                      </td>
                      <td className="py-2 text-right text-[11px] text-zinc-800 hidden lg:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <div className="mt-10 pt-4 border-t border-zinc-900 flex items-center justify-between">
        <span className="text-[10px] text-zinc-800 uppercase tracking-[0.3em]">Quantum Admin Console</span>
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5', isConnected ? 'bg-[#FF4D00]' : 'bg-zinc-800')} />
          <span className="text-[10px] text-zinc-800 uppercase tracking-[0.2em]">
            {isConnected ? 'TELEMETRY_ACTIVE' : 'TELEMETRY_OFF'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}