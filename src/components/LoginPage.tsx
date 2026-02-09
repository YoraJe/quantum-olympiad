import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Atom, Lock, Mail, Eye, EyeOff, AlertTriangle,
  ChevronRight, Zap, Terminal, Sparkles, Loader2, LogIn,
  UserPlus, User, GraduationCap, ArrowLeft, MailCheck
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  signIn, signUp, signOut, IS_DEMO_MODE,
  type Profile,
} from '@/lib/supabaseClient';

type AuthView = 'student-login' | 'student-register' | 'admin-login';
type RoleMode = 'student' | 'admin';

interface LoginPageProps {
  onLoginSuccess: (profile: Profile) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [authView, setAuthView] = useState<AuthView>('student-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'SMP' | 'SMA'>('SMP');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'generic' | 'access-denied' | 'email-unverified'>('generic');
  const [loading, setLoading] = useState(false);

  const roleMode: RoleMode = authView === 'admin-login' ? 'admin' : 'student';
  const isAdmin = roleMode === 'admin';
  const isRegister = authView === 'student-register';

  const switchToStudentLogin = useCallback(() => {
    setAuthView('student-login'); setError(''); setEmail(''); setPassword(''); setFullName('');
  }, []);
  const switchToRegister = useCallback(() => {
    setAuthView('student-register'); setError('');
  }, []);
  const switchToAdminLogin = useCallback(() => {
    setAuthView('admin-login'); setError(''); setEmail(''); setPassword('');
  }, []);
  const toggleMode = useCallback(() => {
    if (isAdmin) switchToStudentLogin(); else switchToAdminLogin();
  }, [isAdmin, switchToStudentLogin, switchToAdminLogin]);

  // ---- LOGIN ----
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setErrorType('generic'); setLoading(true);
    try {
      if (!email.trim() || !password.trim()) { setError('All fields are required'); setLoading(false); return; }
      const result = await signIn(email.trim(), password);
      if (!result.success || !result.user) {
        if (result.emailNotConfirmed) { setError('Account not activated. Please verify your email first.'); setErrorType('email-unverified'); setLoading(false); return; }
        setError(result.error || 'Authentication failed'); setErrorType('generic'); setLoading(false); return;
      }
      if (roleMode === 'admin' && result.user.role !== 'admin') {
        await signOut(); setError('ACCESS DENIED: Insufficient Permissions'); setErrorType('access-denied'); setLoading(false); return;
      }
      onLoginSuccess(result.user);
    } catch { setError('Network error. Please try again.'); setErrorType('generic'); } finally { setLoading(false); }
  }, [email, password, roleMode, onLoginSuccess]);

  // ---- REGISTER (INSTANT — no email verification) ----
  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setErrorType('generic'); setLoading(true);
    try {
      if (!email.trim() || !password.trim() || !fullName.trim()) { setError('All fields are required'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }

      const result = await signUp(email.trim(), password, fullName.trim(), selectedLevel);

      if (!result.success) { setError(result.error || 'Registration failed'); setLoading(false); return; }

      // signUp now ALWAYS returns a profile — go straight to dashboard
      if (result.user) {
        onLoginSuccess(result.user);
        return;
      }

      // Should never reach here, but just in case — try sign in
      const loginResult = await signIn(email.trim(), password);
      if (loginResult.success && loginResult.user) {
        onLoginSuccess(loginResult.user);
      } else {
        setError('Account created. Please sign in.');
        setAuthView('student-login');
      }
    } catch { setError('Network error. Please try again.'); } finally { setLoading(false); }
  }, [email, password, fullName, selectedLevel, onLoginSuccess]);

  const fillDemo = useCallback((type: 'student' | 'admin') => {
    if (type === 'admin') { setEmail('admin@quantum.id'); setAuthView('admin-login'); }
    else { setEmail('student@quantum.id'); setAuthView('student-login'); }
    setPassword('demo'); setError('');
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div animate={{ background: isAdmin ? 'radial-gradient(ellipse at 50% 30%, rgba(34,197,94,0.06) 0%, transparent 60%)' : 'radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.06) 0%, transparent 60%)' }} transition={{ duration: 0.8 }} className="absolute inset-0" />
      </div>

      {/* Logo */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
            <Atom className="w-9 h-9 text-cyan-400" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">QUANTUM</span>
          </h1>
        </div>
        <p className="text-white/30 text-xs tracking-[0.3em] uppercase">Olympiad Training Platform</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-1 mb-5 glass-panel rounded-full p-1 relative z-10">
        <button onClick={() => { if (isAdmin) switchToStudentLogin(); }} className={cn('px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2', !isAdmin ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/40 hover:text-white/60')}>
          <Sparkles className="w-4 h-4" /> Student
        </button>
        <button onClick={switchToAdminLogin} className={cn('px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2', isAdmin ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white/60')}>
          <Shield className="w-4 h-4" /> Admin
        </button>
      </motion.div>

      {/* Main Card */}
      <AnimatePresence mode="wait">
        <motion.div key={authView} layout initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -15 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.35 } }}
          className={cn('w-full max-w-md rounded-2xl relative z-10 overflow-hidden', isAdmin ? 'bg-slate-950 border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.15)]' : 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]')}>
          {isAdmin && <div className="absolute inset-0 pointer-events-none z-0 scanline-overlay" />}

          <div className="p-6 md:p-8">
            {/* Header */}
            <motion.div key={`header-${authView}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 relative z-10">
              {isAdmin ? <AdminHeader /> : isRegister ? <RegisterHeader onBack={switchToStudentLogin} /> : <StudentLoginHeader />}
            </motion.div>

            {/* Form */}
            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-3.5 relative z-10">
              {/* Full Name (register only) */}
              <AnimatePresence>
                {isRegister && (
                  <motion.div key="name-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                    <label className="text-xs font-medium mb-1.5 block tracking-wider text-white/40">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all duration-300 outline-none" autoComplete="name" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className={cn('text-xs font-medium mb-1.5 block tracking-wider', isAdmin ? 'text-green-400/70 font-mono' : 'text-white/40')}>{isAdmin ? 'OPERATOR_ID' : 'Email'}</label>
                <div className="relative">
                  <Mail className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isAdmin ? 'text-green-500/50' : 'text-white/20')} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={isAdmin ? 'admin@quantum.id' : 'your@email.com'}
                    className={cn('w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all duration-300 outline-none', isAdmin ? 'bg-black/50 border border-green-500/30 text-green-400 placeholder-green-500/20 font-mono focus:border-green-400/60 focus:shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)]')} autoComplete="email" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={cn('text-xs font-medium mb-1.5 block tracking-wider', isAdmin ? 'text-green-400/70 font-mono' : 'text-white/40')}>{isAdmin ? 'ACCESS_KEY' : 'Password'}</label>
                <div className="relative">
                  <Lock className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isAdmin ? 'text-green-500/50' : 'text-white/20')} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegister ? 'Min. 6 characters' : '••••••••'}
                    className={cn('w-full pl-10 pr-12 py-3 rounded-xl text-sm transition-all duration-300 outline-none', isAdmin ? 'bg-black/50 border border-green-500/30 text-green-400 placeholder-green-500/20 font-mono focus:border-green-400/60 focus:shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)]')} autoComplete={isRegister ? 'new-password' : 'current-password'} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className={cn('absolute right-3 top-1/2 -translate-y-1/2 transition-colors', isAdmin ? 'text-green-500/40 hover:text-green-400' : 'text-white/20 hover:text-white/50')}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Level (register only) */}
              <AnimatePresence>
                {isRegister && (
                  <motion.div key="level-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                    <label className="text-xs font-medium mb-1.5 block tracking-wider text-white/40">Education Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setSelectedLevel('SMP')} className={cn('py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 border', selectedLevel === 'SMP' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20')}>
                        <GraduationCap className="w-4 h-4" /> SMP
                      </button>
                      <button type="button" onClick={() => setSelectedLevel('SMA')} className={cn('py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 border', selectedLevel === 'SMA' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20')}>
                        <GraduationCap className="w-4 h-4" /> SMA
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -5, height: 0 }}
                    className={cn('flex items-start gap-2.5 p-3 rounded-lg text-sm', errorType === 'access-denied' ? 'bg-red-500/15 border-2 border-red-500/40 text-red-400 font-mono' : errorType === 'email-unverified' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : isAdmin ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-mono' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')}>
                    {errorType === 'access-denied' ? <Shield className="w-5 h-5 shrink-0 mt-0.5" /> : errorType === 'email-unverified' ? <MailCheck className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      {errorType === 'access-denied' && <p className="text-xs font-bold mb-0.5 text-red-300">⛔ SECURITY VIOLATION</p>}
                      <span className="text-xs leading-relaxed">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button type="submit" disabled={loading} whileHover={!loading ? { scale: 1.01 } : undefined} whileTap={!loading ? { scale: 0.99 } : undefined}
                className={cn('w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2',
                  isAdmin ? 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] font-mono tracking-wider'
                    : isRegister ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-400 hover:to-pink-500 shadow-lg shadow-purple-500/20'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20',
                  loading && 'opacity-70 cursor-not-allowed')}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>{isAdmin ? 'AUTHENTICATING...' : isRegister ? 'Creating account...' : 'Signing in...'}</span></>
                ) : (
                  <>{isAdmin ? <Shield className="w-4 h-4" /> : isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}<span>{isAdmin ? 'INITIATE_ACCESS' : isRegister ? 'Create Account' : 'Enter Arena'}</span><ChevronRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>

            {/* Register/Login toggle */}
            {!isAdmin && (
              <div className="mt-4 text-center relative z-10">
                {isRegister ? (
                  <button onClick={switchToStudentLogin} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    Already have an account? <span className="text-cyan-400/70 underline">Sign in</span>
                  </button>
                ) : (
                  <button onClick={switchToRegister} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    Don&apos;t have an account? <span className="text-cyan-400/70 underline">Register</span>
                  </button>
                )}
              </div>
            )}

            {/* Demo quickfill */}
            {IS_DEMO_MODE && !isRegister && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 relative z-10">
                <div className={cn('p-3 rounded-lg border text-center', isAdmin ? 'bg-green-500/5 border-green-500/15' : 'bg-cyan-500/5 border-cyan-500/15')}>
                  <p className={cn('text-xs mb-2', isAdmin ? 'text-green-400/50 font-mono' : 'text-white/30')}>{isAdmin ? '// DEMO MODE ACTIVE' : 'Demo Mode — Quick Access:'}</p>
                  <div className="flex gap-2 justify-center">
                    <button type="button" onClick={() => fillDemo('student')} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400/70 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">Student Login</button>
                    <button type="button" onClick={() => fillDemo('admin')} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400/70 border border-green-500/20 hover:bg-green-500/20 transition-colors font-mono">Admin Login</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Mode switch */}
            <div className="mt-4 text-center relative z-10">
              <button onClick={toggleMode} className={cn('text-xs transition-colors', isAdmin ? 'text-green-500/40 hover:text-green-400/70 font-mono' : 'text-white/20 hover:text-white/40')}>
                {isAdmin ? '> switch_to: student_portal' : 'Need admin access? →'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-white/10 text-xs font-mono relative z-10">
        QUANTUM OLYMPIAD v4.0 · Infinity Engine
      </motion.p>
    </motion.div>
  );
}

// Sub-components
function StudentLoginHeader() {
  return (<>
    <div className="flex items-center gap-2 mb-2"><motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}><Zap className="w-5 h-5 text-cyan-400" /></motion.div></div>
    <h2 className="text-2xl font-bold text-white">Enter the Arena</h2>
    <p className="text-white/40 text-sm mt-1">Sign in to continue your training</p>
  </>);
}

function RegisterHeader({ onBack }: { onBack: () => void }) {
  return (<>
    <button onClick={onBack} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors mb-3"><ArrowLeft className="w-4 h-4" /><span className="text-xs">Back to login</span></button>
    <div className="flex items-center gap-2 mb-2"><motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}><UserPlus className="w-5 h-5 text-purple-400" /></motion.div></div>
    <h2 className="text-2xl font-bold text-white">Join the <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Academy</span></h2>
    <p className="text-white/40 text-sm mt-1">Create your training account</p>
  </>);
}

function AdminHeader() {
  return (<>
    <div className="flex items-center gap-2 mb-3"><Terminal className="w-5 h-5 text-green-400" /><div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/80" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/80" /></div></div>
    <h2 className="text-xl font-bold font-mono text-green-400 tracking-wider">SYSTEM OVERRIDE</h2>
    <motion.p className="text-green-400/50 text-xs font-mono mt-1 tracking-wider" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>{'>'} AUTHORIZED PERSONNEL ONLY<span className="terminal-cursor">_</span></motion.p>
  </>);
}
