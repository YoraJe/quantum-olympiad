.import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, BookOpen, Trophy, ChevronRight, ArrowLeft, CheckCircle2, XCircle,
  Zap,
  Atom, Globe, Calculator, Microscope, Cpu, Telescope, DollarSign,
  Mountain, Map, FlaskConical, Sparkles, Brain, Crown, Eye
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ParticleField } from '@/components/ParticleField';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { DynamicDiagram } from '@/components/DynamicDiagram';
import { LoginPage } from '@/components/LoginPage';
import { AdminDashboard } from '@/components/AdminDashboard';
import {
  generateQuestionBatch,
  type Level,
  type Subject,
  type GeneratedQuestion,
} from '@/lib/generator';
import {
  signOut,
  saveQuizResult,
  updateStreak,
  recoverSessionFromURL,
  getExistingSession,
  type Profile,
} from '@/lib/supabaseClient';

// Re-export Level for use in sub-views
export type { Level } from '@/lib/generator';

// ============================================================
// TYPES & CONSTANTS
// ============================================================
type AppView = 'login' | 'onboarding' | 'dashboard' | 'exam' | 'results' | 'admin';

interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
}

interface SubjectConfig {
  name: Subject;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const SMP_SUBJECTS: SubjectConfig[] = [
  { name: 'Matematika', icon: <Calculator className="w-7 h-7" />, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/5' },
  { name: 'IPA', icon: <Atom className="w-7 h-7" />, color: 'text-green-400', gradient: 'from-green-500/20 to-green-600/5' },
  { name: 'IPS', icon: <Globe className="w-7 h-7" />, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-600/5' },
];

const SMA_SUBJECTS: SubjectConfig[] = [
  { name: 'Matematika', icon: <Calculator className="w-7 h-7" />, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-600/5' },
  { name: 'Fisika', icon: <Atom className="w-7 h-7" />, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-600/5' },
  { name: 'Kimia', icon: <FlaskConical className="w-7 h-7" />, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/5' },
  { name: 'Biologi', icon: <Microscope className="w-7 h-7" />, color: 'text-lime-400', gradient: 'from-lime-500/20 to-lime-600/5' },
  { name: 'Informatika', icon: <Cpu className="w-7 h-7" />, color: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-600/5' },
  { name: 'Astronomi', icon: <Telescope className="w-7 h-7" />, color: 'text-indigo-400', gradient: 'from-indigo-500/20 to-indigo-600/5' },
  { name: 'Ekonomi', icon: <DollarSign className="w-7 h-7" />, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-yellow-600/5' },
  { name: 'Kebumian', icon: <Mountain className="w-7 h-7" />, color: 'text-orange-400', gradient: 'from-orange-500/20 to-orange-600/5' },
  { name: 'Geografi', icon: <Map className="w-7 h-7" />, color: 'text-teal-400', gradient: 'from-teal-500/20 to-teal-600/5' },
];

// ============================================================
// APP COMPONENT
// ============================================================
export function App() {
  const [view, setView] = useState<AppView>('login');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userLevel, setUserLevel] = useState<Level>('SMP');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);

  // Quiz state
  const [currentSubject, setCurrentSubject] = useState<Subject>('Matematika');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [usedSignatures, setUsedSignatures] = useState<Set<string>>(new Set());
  const [mastery, setMastery] = useState(false);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);

  // On mount: check for auth callback in URL or existing session
  useEffect(() => {
    async function checkAuth() {
      try {
        // First: check if URL has auth tokens (redirect from email verification)
        const recoveredUser = await recoverSessionFromURL();
        if (recoveredUser) {
          setCurrentUser(recoveredUser);
          setCurrentStreak(recoveredUser.current_streak);
          setUserLevel(recoveredUser.level);
          if (recoveredUser.role === 'admin') {
            setView('admin');
          } else {
            setView('onboarding');
          }
          setInitialLoading(false);
          return;
        }

        // Second: check for existing session (page refresh)
        const existingUser = await getExistingSession();
        if (existingUser) {
          setCurrentUser(existingUser);
          setCurrentStreak(existingUser.current_streak);
          setUserLevel(existingUser.level);
          if (existingUser.role === 'admin') {
            setView('admin');
          } else {
            setView('onboarding');
          }
          setInitialLoading(false);
          return;
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
      setInitialLoading(false);
    }
    checkAuth();
  }, []);

  // Derived
  const accentTheme = view === 'admin' ? 'green' : userLevel === 'SMP' ? 'amber' : 'cyan';
  const accentHex = accentTheme === 'amber' ? '#f59e0b' : accentTheme === 'green' ? '#22c55e' : '#06b6d4';
  const subjects = userLevel === 'SMP' ? SMP_SUBJECTS : SMA_SUBJECTS;

  // ---- LOGIN HANDLER ----
  const handleLoginSuccess = useCallback((profile: Profile) => {
    setCurrentUser(profile);
    setCurrentStreak(profile.current_streak);
    setUserLevel(profile.level);

    if (profile.role === 'admin') {
      setView('admin');
    } else {
      setView('onboarding');
    }
  }, []);

  // ---- LOGOUT HANDLER ----
  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentUser(null);
    setView('login');
    setCurrentStreak(0);
    setTotalSolved(0);
    setUsedSignatures(new Set());
    window.location.hash = '';
  }, []);

  // ---- LEVEL SELECTION ----
  const handleSelectLevel = useCallback((level: Level) => {
    setUserLevel(level);
    setView('dashboard');
  }, []);

  // ---- START EXAM ----
  const handleStartExam = useCallback((subject: Subject) => {
    setCurrentSubject(subject);
    const result = generateQuestionBatch(userLevel, subject, 5, usedSignatures);
    setQuestions(result.questions);
    setMastery(result.mastery);
    setCurrentQIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowFeedback(false);
    setView('exam');
  }, [userLevel, usedSignatures]);

  // ---- ANSWER HANDLER ----
  const handleAnswer = useCallback((optionIndex: number) => {
    if (showFeedback) return;
    setSelectedOption(optionIndex);
    setShowFeedback(true);

    const q = questions[currentQIndex];
    const isCorrect = optionIndex === q.correctIndex;

    setAnswers(prev => [...prev, {
      questionIndex: currentQIndex,
      selectedIndex: optionIndex,
      isCorrect,
    }]);

    if (isCorrect) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setTotalSolved(p => p + 1);

      // Save signature
      setUsedSignatures(prev => {
        const next = new Set(prev);
        next.add(q.signature);
        return next;
      });

      // Persist to backend
      if (currentUser) {
        saveQuizResult(currentUser.id, q.subject, q.signature, true);
        updateStreak(currentUser.id, newStreak);
      }

      // Milestone check
      if (newStreak > 0 && newStreak % 25 === 0) {
        setCelebrationStreak(newStreak);
        setTimeout(() => setShowCelebration(true), 800);
      }
    } else {
      setCurrentStreak(0);
      setTotalSolved(p => p + 1);

      if (currentUser) {
        saveQuizResult(currentUser.id, q.subject, q.signature, false);
        updateStreak(currentUser.id, 0);
      }
    }

    // Auto advance after delay
    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowFeedback(false);
      } else {
        setView('results');
      }
    }, 1500);
  }, [showFeedback, questions, currentQIndex, currentStreak, currentUser]);

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  // Check for hash-based admin route
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#/admin' && currentUser?.role === 'admin') {
        setView('admin');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-deep-space text-white font-inter relative overflow-hidden">
      <ParticleField />

      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-10 animate-pulse"
          style={{ background: accentHex, top: '10%', left: '10%' }}
        />
        <div
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-5 animate-pulse"
          style={{ background: accentHex, bottom: '15%', right: '15%', animationDelay: '2s' }}
        />
      </div>

      <div className="relative z-10">
        {/* ---- INITIAL LOADING ---- */}
        {initialLoading && (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Atom className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <p className="text-white/30 text-sm font-mono tracking-wider">Initializing...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ---- LOGIN ---- */}
          {!initialLoading && view === 'login' && (
            <LoginPage
              key="login"
              onLoginSuccess={handleLoginSuccess}
            />
          )}

          {/* ---- ONBOARDING (Level Select) ---- */}
          {!initialLoading && view === 'onboarding' && currentUser && (
            <OnboardingView
              key="onboarding"
              userName={currentUser.display_name}
              defaultLevel={currentUser.level}
              onSelectLevel={handleSelectLevel}
              onLogout={handleLogout}
            />
          )}

          {/* ---- DASHBOARD ---- */}
          {!initialLoading && view === 'dashboard' && currentUser && (
            <DashboardView
              key="dashboard"
              userName={currentUser.display_name}
              level={userLevel}
              streak={currentStreak}
              totalSolved={totalSolved}
              subjects={subjects}
              accent={accentTheme}
              accentHex={accentHex}
              onStartExam={handleStartExam}
              onBack={() => setView('onboarding')}
              mastery={mastery}
            />
          )}

          {/* ---- EXAM ---- */}
          {!initialLoading && view === 'exam' && questions.length > 0 && (
            <ExamView
              key="exam"
              question={questions[currentQIndex]}
              questionNumber={currentQIndex + 1}
              totalQuestions={questions.length}
              subject={currentSubject}
              accent={accentTheme}
              accentHex={accentHex}
              selectedOption={selectedOption}
              showFeedback={showFeedback}
              onAnswer={handleAnswer}
              onBack={() => setView('dashboard')}
              streak={currentStreak}
            />
          )}

          {/* ---- RESULTS ---- */}
          {!initialLoading && view === 'results' && (
            <ResultsView
              key="results"
              questions={questions}
              answers={answers}
              accent={accentTheme}
              accentHex={accentHex}
              streak={currentStreak}
              expandedReview={expandedReview}
              onToggleReview={(i) => setExpandedReview(expandedReview === i ? null : i)}
              onRetry={() => handleStartExam(currentSubject)}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* ---- ADMIN DASHBOARD ---- */}
          {!initialLoading && view === 'admin' && currentUser && (
            <AdminDashboard
              key="admin"
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        streak={celebrationStreak}
        onDone={handleCloseCelebration}
      />
    </div>
  );
}

// ============================================================
// ONBOARDING VIEW
// ============================================================
function OnboardingView({ userName, defaultLevel, onSelectLevel, onLogout }: {
  userName: string;
  defaultLevel: Level;
  onSelectLevel: (l: Level) => void;
  onLogout: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      {/* Logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Atom className="w-12 h-12 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              QUANTUM
            </span>
          </h1>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white/80 tracking-widest">
          OLYMPIAD
        </h2>
        <p className="text-white/40 mt-2 text-sm tracking-wider uppercase">
          Welcome back, <span className="text-cyan-400">{userName}</span>
        </p>
      </motion.div>

      {/* Level Selection */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md space-y-4"
      >
        <p className="text-center text-white/50 text-sm mb-6">Select your level to begin</p>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectLevel('SMP')}
          className={cn(
            'w-full glass-panel rounded-2xl p-6 text-left group transition-all duration-300',
            defaultLevel === 'SMP' ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'hover:border-amber-500/30'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center border border-amber-500/20">
                <BookOpen className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  SMP
                </h3>
                <p className="text-white/40 text-sm">Junior High · 3 Subjects</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-3 flex gap-2">
            {['Matematika', 'IPA', 'IPS'].map(s => (
              <span key={s} className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/10">
                {s}
              </span>
            ))}
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectLevel('SMA')}
          className={cn(
            'w-full glass-panel rounded-2xl p-6 text-left group transition-all duration-300',
            defaultLevel === 'SMA' ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'hover:border-cyan-500/30'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 flex items-center justify-center border border-cyan-500/20">
                <Brain className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  SMA
                </h3>
                <p className="text-white/40 text-sm">Senior High · 9 Subjects</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-cyan-400 transition-colors" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Math', 'Fis', 'Kim', 'Bio', 'Info', 'Astro', 'Eko', 'Kbm', 'Geo'].map(s => (
              <span key={s} className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400/70 border border-cyan-500/10">
                {s}
              </span>
            ))}
          </div>
        </motion.button>
      </motion.div>

      {/* Logout link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onLogout}
        className="mt-8 flex items-center gap-2 text-white/20 hover:text-white/50 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Sign Out</span>
      </motion.button>
    </motion.div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ userName, level, streak, totalSolved, subjects, accent, accentHex, onStartExam, onBack, mastery }: {
  userName: string;
  level: Level;
  streak: number;
  totalSolved: number;
  subjects: SubjectConfig[];
  accent: string;
  accentHex: string;
  onStartExam: (s: Subject) => void;
  onBack: () => void;
  mastery: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Streak */}
          <motion.div
            className="flex items-center gap-2 glass-panel rounded-full px-4 py-2"
            animate={streak > 0 ? { scale: [1, 1.05, 1] } : undefined}
            transition={{ duration: 0.5 }}
          >
            <Flame className={cn('w-5 h-5', streak > 0 ? 'text-orange-500' : 'text-white/30')} />
            <span className="font-mono font-bold text-lg" style={{ color: streak > 0 ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
              {streak}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Welcome Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel-strong rounded-3xl p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome, <span style={{ color: accentHex }}>{userName}</span>
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold font-mono border"
                style={{
                  borderColor: `${accentHex}40`,
                  color: accentHex,
                  backgroundColor: `${accentHex}15`,
                }}
              >
                {level}
              </span>
            </div>
            <p className="text-white/40 text-sm">Choose a subject to begin your training session</p>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold" style={{ color: accentHex }}>{totalSolved}</p>
              <p className="text-white/30 text-xs mt-1">Solved</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-orange-500">{streak}</p>
              <p className="text-white/30 text-xs mt-1">Streak</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mastery Notice */}
      {mastery && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-4 mb-6 border-emerald-500/30 flex items-center gap-3"
        >
          <Crown className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-emerald-400 font-bold text-sm">Mastery Progress Detected!</p>
            <p className="text-white/40 text-xs">You've completed many unique questions. New variants are being generated.</p>
          </div>
        </motion.div>
      )}

      {/* Subject Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub, i) => (
          <motion.button
            key={sub.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onStartExam(sub.name)}
            className="glass-panel rounded-2xl p-5 text-left group transition-all duration-300 hover:border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center border border-white/10',
                sub.gradient
              )}>
                <span className={sub.color}>{sub.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                  {sub.name}
                </h3>
                <p className="text-white/30 text-xs mt-0.5">5 questions per session</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 glass-panel rounded-2xl p-4 flex items-center justify-center gap-8 text-center"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
          <span className="text-white/40 text-xs">
            {accent === 'amber' ? 'Neon Amber' : 'Cyber Cyan'} Theme Active
          </span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-white/30" />
          <span className="text-white/40 text-xs">Infinity Engine v2.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// EXAM VIEW
// ============================================================
function ExamView({ question, questionNumber, totalQuestions, subject, accentHex, selectedOption, showFeedback, onAnswer, onBack, streak }: {
  question: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  subject: Subject;
  accent: string;
  accentHex: string;
  selectedOption: number | null;
  showFeedback: boolean;
  onAnswer: (index: number) => void;
  onBack: () => void;
  streak: number;
}) {
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Exit</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm font-mono">{subject}</span>
          <div className="flex items-center gap-1.5 glass-panel rounded-full px-3 py-1.5">
            <Flame className={cn('w-4 h-4', streak > 0 ? 'text-orange-500' : 'text-white/20')} />
            <span className="font-mono text-sm font-bold" style={{ color: streak > 0 ? '#f97316' : 'rgba(255,255,255,0.2)' }}>
              {streak}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/40 text-xs font-mono">
            Question {questionNumber}/{totalQuestions}
          </span>
          <span className="text-white/30 text-xs font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: accentHex }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.35 }}
        >
          <div className="glass-panel-strong rounded-3xl p-6 md:p-8 mb-6">
            <p className="text-lg md:text-xl font-medium leading-relaxed text-white/90">
              {question.question}
            </p>
          </div>

          {/* Dynamic Diagram */}
          {question.diagramType !== 'none' && (
            <DynamicDiagram
              type={question.diagramType}
              data={question.diagramData}
              accent={accentHex === '#f59e0b' ? 'amber' : 'cyan'}
            />
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {question.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === question.correctIndex;
              let borderColor = 'border-white/10';
              let bgColor = '';
              let textColor = 'text-white/80';

              if (showFeedback) {
                if (isCorrect) {
                  borderColor = 'border-emerald-500/50';
                  bgColor = 'bg-emerald-500/10';
                  textColor = 'text-emerald-400';
                } else if (isSelected && !isCorrect) {
                  borderColor = 'border-rose-500/50';
                  bgColor = 'bg-rose-500/10';
                  textColor = 'text-rose-400';
                }
              }

              return (
                <motion.button
                  key={i}
                  whileHover={!showFeedback ? { scale: 1.02 } : undefined}
                  whileTap={!showFeedback ? { scale: 0.98 } : undefined}
                  onClick={() => !showFeedback && onAnswer(i)}
                  disabled={showFeedback}
                  className={cn(
                    'glass-panel rounded-xl p-4 text-left transition-all duration-300 border',
                    borderColor,
                    bgColor,
                    !showFeedback && 'hover:border-white/25 cursor-pointer',
                    showFeedback && 'cursor-default'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono font-bold border',
                        showFeedback && isCorrect ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400' :
                        showFeedback && isSelected && !isCorrect ? 'border-rose-500/50 bg-rose-500/20 text-rose-400' :
                        'border-white/10 text-white/40'
                      )}
                    >
                      {showFeedback && isCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : showFeedback && isSelected && !isCorrect ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </div>
                    <span className={cn('font-mono text-sm', textColor)}>{opt}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// RESULTS VIEW
// ============================================================
function ResultsView({ questions, answers, accentHex, streak, expandedReview, onToggleReview, onRetry, onBack }: {
  questions: GeneratedQuestion[];
  answers: QuizAnswer[];
  accent: string;
  accentHex: string;
  streak: number;
  expandedReview: number | null;
  onToggleReview: (i: number) => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const correctCount = answers.filter(a => a.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const grade = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'KEEP GOING' : 'PRACTICE MORE';
  const gradeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto"
    >
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors mb-6">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Dashboard</span>
      </button>

      {/* Score Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="glass-panel-strong rounded-3xl p-8 text-center mb-8"
      >
        <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: gradeColor }} />

        <div className="font-mono text-6xl font-black mb-2" style={{ color: gradeColor }}>
          {score}%
        </div>
        <p className="text-lg font-bold tracking-widest" style={{ color: gradeColor }}>{grade}</p>

        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-lg font-bold text-emerald-400">{correctCount}</span>
            </div>
            <p className="text-white/30 text-xs">Correct</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="font-mono text-lg font-bold text-rose-400">{questions.length - correctCount}</span>
            </div>
            <p className="text-white/30 text-xs">Wrong</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-mono text-lg font-bold text-orange-500">{streak}</span>
            </div>
            <p className="text-white/30 text-xs">Streak</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: accentHex }}
          >
            Try Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-bold text-sm glass-panel text-white/60 hover:text-white transition-colors"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </motion.div>

      {/* Review Accordion */}
      <h3 className="text-lg font-bold text-white/60 mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5" />
        Review Answers
      </h3>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const answer = answers[i];
          const isExpanded = expandedReview === i;
          const isCorrect = answer?.isCorrect ?? false;

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => onToggleReview(i)}
                className={cn(
                  'w-full glass-panel rounded-xl p-4 text-left transition-all duration-300',
                  isExpanded && 'border-white/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    isCorrect ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                  )}>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <span className="text-white/70 text-sm flex-1 truncate">
                    Q{i + 1}: {q.question}
                  </span>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-white/30 transition-transform',
                    isExpanded && 'rotate-90'
                  )} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="glass-panel rounded-xl p-5 mt-2 ml-4 border-l-2" style={{ borderLeftColor: isCorrect ? '#10b981' : '#f43f5e' }}>
                      <p className="text-white/80 text-sm mb-3">{q.question}</p>

                      {q.diagramType !== 'none' && (
                        <DynamicDiagram
                          type={q.diagramType}
                          data={q.diagramData}
                          accent={isCorrect ? 'green' : 'cyan'}
                        />
                      )}

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs w-24">Your Answer:</span>
                          <span className={cn('font-mono text-sm', isCorrect ? 'text-emerald-400' : 'text-rose-400')}>
                            {answer ? q.options[answer.selectedIndex] : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs w-24">Correct:</span>
                          <span className="font-mono text-sm text-emerald-400">
                            {q.options[q.correctIndex]}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
                        <p className="text-xs text-white/30 mb-1 font-bold">EXPLANATION</p>
                        <p className="text-sm text-white/60">{q.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
