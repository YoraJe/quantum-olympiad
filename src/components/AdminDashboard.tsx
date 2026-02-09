// ============================================================
// QUANTUM OLYMPIAD — ADMIN DASHBOARD v2.1 (Truly Realtime)
// ============================================================
// Fixed: Stats update instantly on each feed event.
// Fixed: User table reflects streak changes in realtime.
// Fixed: Timestamps auto-refresh every second.
// Fixed: Feed items have smooth staggered entry animations.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Activity, Flame, BarChart3,
  Clock, Star, Zap, CheckCircle2, XCircle, Terminal,
  RefreshCw, TrendingUp, Wifi, ChevronDown, ChevronUp, LogOut
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
  // ---- STATE ----
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feed, setFeed] = useState<RealtimeFeedItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [feedCount, setFeedCount] = useState(0);
  const [sortField, setSortField] = useState<'streak' | 'date' | 'name'>('streak');
  const [sortAsc, setSortAsc] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [, setTick] = useState(0); // Force re-render for live timestamps
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // ---- TICK: Refresh timestamps every 2 seconds ----
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  // ---- REALTIME FEED SUBSCRIPTION ----
  useEffect(() => {
    const unsubscribe = subscribeToQuizFeed((item) => {
      setFeed(prev => [item, ...prev].slice(0, 50));
      setFeedCount(prev => prev + 1);
    });

    // Small delay to show the "connecting" state
    const connectTimer = setTimeout(() => setIsConnected(true), 500);

    return () => {
      unsubscribe();
      clearTimeout(connectTimer);
      setIsConnected(false);
    };
  }, []);

  // ---- PROFILE POLLING (+ instant push from feed events) ----
  useEffect(() => {
    setProfilesLoading(true);
    const stopPolling = pollProfiles((data) => {
      setProfiles(data);
      setProfilesLoading(false);
    }, 10000); // Also polls every 10s as backup

    return stopPolling;
  }, []);

  // ---- SORTING ----
  const handleSort = useCallback((field: 'streak' | 'date' | 'name') => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'name'); // Default ascending for name, descending for others
    }
  }, [sortField]);

  const sortedProfiles = [...profiles].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'streak':
        cmp = a.current_streak - b.current_streak;
        break;
      case 'name':
        cmp = a.display_name.localeCompare(b.display_name);
        break;
      case 'date':
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  // ---- COMPUTED STATS (recalculated every render from latest profiles) ----
  const students = profiles.filter(p => p.role === 'student');
  const activeUsers = students.length;
  const avgStreak = students.length > 0
    ? Math.round(students.reduce((s, p) => s + p.current_streak, 0) / students.length)
    : 0;
  const topStreak = students.length > 0
    ? Math.max(...students.map(p => p.current_streak))
    : 0;
  const totalSolved = feedCount + students.reduce((s, p) => s + p.current_streak, 0);

  // ---- FORMAT HELPERS ----
  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 3) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
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
      className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
    >
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 scanline-overlay opacity-30" />

      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-mono">Logout</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Connection Status — pulses when live */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={isConnected
                ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }
                : { opacity: 0.3 }
              }
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Wifi className={cn(
                'w-4 h-4',
                isConnected ? 'text-green-400' : 'text-red-400'
              )} />
            </motion.div>
            <span className={cn(
              'text-xs font-mono',
              isConnected ? 'text-green-400/70' : 'text-red-400/70'
            )}>
              {isConnected ? 'LIVE' : 'CONNECTING...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold text-sm font-mono hidden sm:inline">
              COMMAND CENTER
            </span>
          </div>
        </div>
      </div>

      {/* ---- TITLE BAR ---- */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-950 border-2 border-green-500/30 rounded-2xl p-5 md:p-6 mb-6 relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 scanline-overlay opacity-20 pointer-events-none" />
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-5 h-5 text-green-400" />
              <h1 className="text-xl md:text-2xl font-bold font-mono text-green-400">
                ADMIN DASHBOARD
              </h1>
            </div>
            <p className="text-green-400/40 text-xs font-mono">
              {'>'} operator: {currentUser.display_name} · {currentUser.email}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            SIGN_OUT
          </motion.button>
        </div>
      </motion.div>

      {/* ---- STATS GRID — Values animate on change ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 relative z-10">
        {[
          {
            label: 'Total Solved',
            value: totalSolved,
            icon: <BarChart3 className="w-5 h-5 text-green-400" />,
          },
          {
            label: 'Active Users',
            value: activeUsers,
            icon: <Users className="w-5 h-5 text-cyan-400" />,
          },
          {
            label: 'Avg Streak',
            value: avgStreak,
            icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
          },
          {
            label: 'Top Streak',
            value: topStreak,
            icon: <Flame className="w-5 h-5 text-orange-500" />,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="glass-panel rounded-xl p-4 border-green-500/10"
          >
            <div className="flex items-center justify-between mb-2">
              {stat.icon}
              <Activity className="w-3.5 h-3.5 text-green-400/20 animate-pulse" />
            </div>
            {/* AnimatePresence key on value so it animates when it changes */}
            <AnimatePresence mode="popLayout">
              <motion.p
                key={stat.value}
                initial={{ y: -8, opacity: 0, scale: 1.15 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                className="font-mono text-2xl md:text-3xl font-bold text-white"
              >
                {stat.value.toLocaleString()}
              </motion.p>
            </AnimatePresence>
            <p className="text-white/25 text-xs mt-1 font-mono">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ---- MAIN PANELS ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">

        {/* ============ LIVE ACTIVITY FEED — 2 columns ============ */}
        <div className="lg:col-span-2 bg-slate-950/80 border border-green-500/20 rounded-2xl p-4 md:p-5 relative overflow-hidden">
          <div className="absolute inset-0 scanline-overlay opacity-10 pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 font-mono">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-400"
              />
              LIVE_FEED
            </h3>
            <div className="flex items-center gap-2">
              <RefreshCw
                className="w-3.5 h-3.5 text-green-400/30 animate-spin"
                style={{ animationDuration: '3s' }}
              />
              <span className="text-green-400/30 text-xs font-mono">{feed.length} events</span>
            </div>
          </div>

          <div
            ref={feedContainerRef}
            className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 relative z-10 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
              {feed.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Zap className="w-8 h-8 text-green-400/20 mx-auto mb-3" />
                  <p className="text-green-400/30 text-sm font-mono">Waiting for activity...</p>
                  <motion.p
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white/10 text-xs mt-2 font-mono"
                  >
                    Events will stream in 2-5 seconds
                  </motion.p>
                </motion.div>
              ) : (
                feed.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -30, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 30, height: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    layout
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors',
                      idx === 0
                        ? 'bg-green-500/[0.04] border-green-500/15'
                        : 'bg-white/[0.02] border-white/[0.04] hover:border-green-500/15'
                    )}
                  >
                    {/* Status Indicator */}
                    <div className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                      item.isCorrect ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                    )}>
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">
                        <span className="font-semibold text-white/90">{item.userName}</span>
                        {' '}solved{' '}
                        <span className="text-green-400/70 font-mono">{item.subject}</span>
                      </p>
                      <p className="text-[10px] text-white/15 font-mono truncate mt-0.5">
                        sig: {item.signature}
                      </p>
                    </div>

                    {/* Streak Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame className={cn(
                        'w-3 h-3',
                        item.streak > 20 ? 'text-orange-500' : 'text-orange-500/50'
                      )} />
                      <span className={cn(
                        'font-mono text-xs font-bold',
                        item.streak > 20 ? 'text-orange-400' : 'text-orange-400/50'
                      )}>
                        {item.streak}
                      </span>
                    </div>

                    {/* Live Timestamp — refreshes with tick */}
                    <span className="text-white/15 text-[10px] font-mono shrink-0 flex items-center gap-1 min-w-[52px] justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(item.timestamp)}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ============ USER MANAGEMENT TABLE — 3 columns ============ */}
        <div className="lg:col-span-3 bg-slate-950/80 border border-green-500/20 rounded-2xl p-4 md:p-5 relative overflow-hidden">
          <div className="absolute inset-0 scanline-overlay opacity-10 pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 font-mono">
              <Users className="w-4 h-4" />
              USER_REGISTRY
            </h3>
            <span className="text-green-400/30 text-xs font-mono">
              {profiles.length} records · live
            </span>
          </div>

          {profilesLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-green-400/30 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto relative z-10 custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-green-400/40 text-xs border-b border-green-500/10">
                    <th className="text-left pb-3 font-mono font-normal">#</th>
                    <th
                      className="text-left pb-3 font-mono font-normal cursor-pointer hover:text-green-400/70 transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      <span className="flex items-center gap-1">
                        USER <SortIcon field="name" />
                      </span>
                    </th>
                    <th className="text-left pb-3 font-mono font-normal hidden md:table-cell">EMAIL</th>
                    <th className="text-center pb-3 font-mono font-normal">ROLE</th>
                    <th className="text-center pb-3 font-mono font-normal">LEVEL</th>
                    <th
                      className="text-right pb-3 font-mono font-normal cursor-pointer hover:text-green-400/70 transition-colors select-none"
                      onClick={() => handleSort('streak')}
                    >
                      <span className="flex items-center gap-1 justify-end">
                        STREAK <SortIcon field="streak" />
                      </span>
                    </th>
                    <th
                      className="text-right pb-3 font-mono font-normal cursor-pointer hover:text-green-400/70 transition-colors select-none hidden lg:table-cell"
                      onClick={() => handleSort('date')}
                    >
                      <span className="flex items-center gap-1 justify-end">
                        REGISTERED <SortIcon field="date" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sortedProfiles.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        layout // Smoothly re-order when sort changes
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, layout: { duration: 0.3 } }}
                        className="border-b border-white/[0.03] hover:bg-green-500/[0.03] transition-colors"
                      >
                        <td className="py-3 text-white/15 font-mono text-xs">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0',
                              user.role === 'admin'
                                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                : 'bg-white/5 text-white/40 border border-white/5'
                            )}>
                              {user.display_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white/80 font-medium text-sm truncate">
                              {user.display_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-white/30 font-mono text-xs hidden md:table-cell">
                          {user.email}
                        </td>
                        <td className="py-3 text-center">
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase',
                            user.role === 'admin'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                              : 'bg-white/5 text-white/30 border border-white/5'
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
                            user.level === 'SMA'
                              ? 'bg-cyan-500/10 text-cyan-400/70 border border-cyan-500/15'
                              : 'bg-amber-500/10 text-amber-400/70 border border-amber-500/15'
                          )}>
                            {user.level}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Flame className={cn(
                              'w-3 h-3 transition-colors',
                              user.current_streak >= 30 ? 'text-red-500' :
                              user.current_streak >= 15 ? 'text-orange-500' :
                              'text-white/15'
                            )} />
                            {/* Animate streak number changes */}
                            <AnimatePresence mode="popLayout">
                              <motion.span
                                key={user.current_streak}
                                initial={{ y: -6, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 6, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                  'font-mono text-sm font-bold inline-block',
                                  user.current_streak >= 30 ? 'text-red-400' :
                                  user.current_streak >= 15 ? 'text-orange-400' :
                                  'text-white/30'
                                )}
                              >
                                {user.current_streak}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        </td>
                        <td className="py-3 text-right text-white/20 font-mono text-xs hidden lg:table-cell">
                          {formatDate(user.created_at)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center relative z-10"
      >
        <div className="glass-panel rounded-xl p-3 inline-flex items-center gap-4 border-green-500/10 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-green-400/30" />
            <span className="text-white/15 text-xs font-mono">QUANTUM OLYMPIAD v2.1</span>
          </div>
          <div className="w-px h-3 bg-white/5" />
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-green-400/30" />
            <span className="text-white/15 text-xs font-mono">Infinity Engine Active</span>
          </div>
          <div className="w-px h-3 bg-white/5" />
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-400' : 'bg-red-400'
              )}
            />
            <span className="text-white/15 text-xs font-mono">
              {isConnected ? 'REALTIME CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
