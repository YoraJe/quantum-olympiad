import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, Eye, EyeOff, AlertTriangle,
  Loader2, ArrowLeft, ArrowRight, User, GraduationCap
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  signIn, signUp, signOut, IS_DEMO_MODE,
  type Profile,
} from '@/lib/supabaseClient';

type AuthView = 'student-login' | 'student-register' | 'admin-login';

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
  const [loading, setLoading] = useState(false);

  const isAdmin = authView === 'admin-login';
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

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (!email.trim() || !password.trim()) { setError('All fields are required.'); setLoading(false); return; }
      const result = await signIn(email.trim(), password);
      if (!result.success || !result.user) {
        if (result.emailNotConfirmed) { setError('Email not verified. Check your inbox.'); setLoading(false); return; }
        setError(result.error || 'Authentication failed.'); setLoading(false); return;
      }
      if (isAdmin && result.user.role !== 'admin') {
        await signOut(); setError('Access denied. Admin credentials required.'); setLoading(false); return;
      }
      onLoginSuccess(result.user);
    } catch { setError('Network error. Try again.'); } finally { setLoading(false); }
  }, [email, password, isAdmin, onLoginSuccess]);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (!email.trim() || !password.trim() || !fullName.trim()) { setError('All fields are required.'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      const result = await signUp(email.trim(), password, fullName.trim(), selectedLevel);
      if (!result.success) { setError(result.error || 'Registration failed.'); setLoading(false); return; }
      if (result.user) { onLoginSuccess(result.user); return; }
      const loginResult = await signIn(email.trim(), password);
      if (loginResult.success && loginResult.user) { onLoginSuccess(loginResult.user); }
      else { setError('Account created. Please sign in.'); setAuthView('student-login'); }
    } catch { setError('Network error. Try again.'); } finally { setLoading(false); }
  }, [email, password, fullName, selectedLevel, onLoginSuccess]);

  const fillDemo = useCallback((type: 'student' | 'admin') => {
    if (type === 'admin') { setEmail('admin@quantum.id'); setAuthView('admin-login'); }
    else { setEmail('student@quantum.id'); setAuthView('student-login'); }
    setPassword('demo'); setError('');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
    >
      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-[0.4em] mb-4">Training Platform</p>
          <h1 className="text-4xl font-bold tracking-tighter text-white">QUANTUM</h1>
          <div className="w-8 h-px bg-zinc-800 mx-auto mt-4" />
        </div>

        {/* Auth Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={authView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* Title Row */}
            <div className="mb-6">
              {isRegister && (
                <button onClick={switchToStudentLogin} className="flex items-center gap-1 text-zinc-700 hover:text-zinc-400 transition-colors mb-4 text-[10px] font-mono uppercase tracking-widest">
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono uppercase tracking-widest text-white">
                  {isAdmin ? 'Admin Access' : isRegister ? 'New Account' : 'Sign In'}
                </h2>
                <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
                  {isAdmin ? 'RESTRICTED' : isRegister ? 'REGISTER' : 'AUTH'}
                </span>
              </div>
              <div className="w-full h-px bg-zinc-800 mt-3" />
            </div>

            {/* Form */}
            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">

              {/* Full Name */}
              <AnimatePresence>
                {isRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1.5 block">Designation</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
                      <input
                        type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Full name"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-sm text-sm text-white placeholder-zinc-700 focus:border-white focus:outline-none transition-colors font-mono"
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1.5 block">Identity</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-sm text-sm text-white placeholder-zinc-700 focus:border-white focus:outline-none transition-colors font-mono"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1.5 block">Passcode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={isRegister ? 'Min. 6 characters' : '••••••••'}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-sm text-sm text-white placeholder-zinc-700 focus:border-white focus:outline-none transition-colors font-mono"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Level Selection */}
              <AnimatePresence>
                {isRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1.5 block">Classification</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['SMP', 'SMA'] as const).map(lvl => (
                        <button
                          key={lvl} type="button"
                          onClick={() => setSelectedLevel(lvl)}
                          className={cn(
                            'py-2.5 rounded-sm text-[11px] font-mono uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-2 border',
                            selectedLevel === lvl
                              ? 'border-white text-white bg-white/5'
                              : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                          )}
                        >
                          <GraduationCap className="w-3 h-3" />
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 border border-red-500/20 rounded-sm bg-red-500/5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-red-400 text-[11px] font-mono">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className={cn(
                  'w-full py-3 rounded-sm text-[11px] font-mono uppercase tracking-[0.2em] font-bold transition-all duration-150 flex items-center justify-center gap-2',
                  'bg-white text-black hover:bg-zinc-200 active:scale-[0.99]',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing</>
                ) : (
                  <>{isRegister ? 'Create Account' : 'Initialize Session'} <ArrowRight className="w-3 h-3" /></>
                )}
              </button>
            </form>

            {/* Separator */}
            <div className="w-full h-px bg-zinc-800/50 my-5" />

            {/* Toggle Register/Login */}
            {!isAdmin && (
              <div className="text-center">
                {isRegister ? (
                  <button onClick={switchToStudentLogin} className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest hover:text-zinc-400 transition-colors">
                    Existing operator? <span className="text-zinc-400 underline underline-offset-4 decoration-zinc-700">Sign in</span>
                  </button>
                ) : (
                  <button onClick={switchToRegister} className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest hover:text-zinc-400 transition-colors">
                    New operator? <span className="text-zinc-400 underline underline-offset-4 decoration-zinc-700">Register</span>
                  </button>
                )}
              </div>
            )}

            {/* Demo Mode */}
            {IS_DEMO_MODE && !isRegister && (
              <div className="mt-5 pt-4 border-t border-zinc-800/30">
                <p className="text-zinc-700 text-[10px] font-mono uppercase tracking-widest text-center mb-3">Demo Mode Active</p>
                <div className="flex gap-2 justify-center">
                  <button type="button" onClick={() => fillDemo('student')}
                    className="text-[10px] px-4 py-2 border border-zinc-800 text-zinc-600 rounded-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors font-mono uppercase tracking-widest">
                    Student
                  </button>
                  <button type="button" onClick={() => fillDemo('admin')}
                    className="text-[10px] px-4 py-2 border border-zinc-800 text-zinc-600 rounded-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors font-mono uppercase tracking-widest">
                    Admin
                  </button>
                </div>
              </div>
            )}

            {/* Mode Switch */}
            <div className="mt-4 text-center">
              <button
                onClick={isAdmin ? switchToStudentLogin : switchToAdminLogin}
                className="text-zinc-700 text-[10px] font-mono uppercase tracking-widest hover:text-zinc-500 transition-colors"
              >
                {isAdmin ? '← Operator Login' : 'Admin Access →'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="w-6 h-px bg-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-800 text-[10px] font-mono uppercase tracking-[0.3em]">
            Quantum Systems v4.0
          </p>
        </div>
      </div>
    </motion.div>
  );
}