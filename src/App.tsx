import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, XCircle,
  ArrowRight, Loader2, LogOut, ChevronRight, Eye, Trophy
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { DynamicDiagram } from '@/components/DynamicDiagram';
import { LoginPage } from '@/components/LoginPage';
import { AdminDashboard } from '@/components/AdminDashboard';
import {
  type Level,
  type Subject,
  type GeneratedQuestion,
} from '@/lib/generator';
import { fetchSmartSession } from '@/lib/hybridEngine';
import {
  signOut,
  saveQuizResult,
  updateStreak,
  recoverSessionFromURL,
  getExistingSession,
  type Profile,
} from '@/lib/supabaseClient';

// ============================================================
// TYPES & CONSTANTS
// ============================================================
type AppView = 'login' | 'onboarding' | 'dashboard' | 'exam' | 'results' | 'admin';

interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
}

const SMP_SUBJECTS: Subject[] = ['Matematika', 'IPA', 'IPS'];

const SMA_SUBJECTS: Subject[] = [
  'Matematika', 'Fisika', 'Kimia', 'Biologi',
  'Informatika', 'Astronomi', 'Ekonomi', 'Kebumian', 'Geografi',
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

  const [currentSubject, setCurrentSubject] = useState<Subject>('Matematika');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [mastery, setMastery] = useState(false);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const recoveredUser = await recoverSessionFromURL();
        if (recoveredUser) {
          setCurrentUser(recoveredUser);
          setCurrentStreak(recoveredUser.current_streak);
          setUserLevel(recoveredUser.level);
          setView(recoveredUser.role === 'admin' ? 'admin' : 'onboarding');
          setInitialLoading(false);
          return;
        }
        const existingUser = await getExistingSession();
        if (existingUser) {
          setCurrentUser(existingUser);
          setCurrentStreak(existingUser.current_streak);
          setUserLevel(existingUser.level);
          setView(existingUser.role === 'admin' ? 'admin' : 'onboarding');
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

  const subjects = userLevel === 'SMP' ? SMP_SUBJECTS : SMA_SUBJECTS;

  const handleLoginSuccess = useCallback((profile: Profile) => {
    setCurrentUser(profile);
    setCurrentStreak(profile.current_streak);
    setUserLevel(profile.level);
    setView(profile.role === 'admin' ? 'admin' : 'onboarding');
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentUser(null);
    setView('login');
    setCurrentStreak(0);
    setTotalSolved(0);
    window.location.hash = '';
  }, []);

  const handleSelectLevel = useCallback((level: Level) => {
    setUserLevel(level);
    setView('dashboard');
  }, []);

  const handleStartExam = useCallback(async (subject: Subject) => {
    setCurrentSubject(subject);
    setLoading(true);
    setCurrentQIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowFeedback(false);
    try {
      const userId = currentUser?.id || 'anonymous';
      const result = await fetchSmartSession(userLevel, subject, 5, userId);
      setQuestions(result.questions);
      setMastery(result.mastery);
      setView('exam');
    } catch (err) {
      console.error('Failed to start exam:', err);
    } finally {
      setLoading(false);
    }
  }, [userLevel, currentUser]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (showFeedback) return;
    setSelectedOption(optionIndex);
    setShowFeedback(true);

    const q = questions[currentQIndex];
    const isCorrect = optionIndex === q.correctIndex;

    setAnswers(prev => [...prev, { questionIndex: currentQIndex, selectedIndex: optionIndex, isCorrect }]);

    if (isCorrect) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setTotalSolved(p => p + 1);
      if (currentUser) {
        saveQuizResult(currentUser.id, q.subject, q.signature, true);
        updateStreak(currentUser.id, newStreak);
      }
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

  const handleCloseCelebration = useCallback(() => setShowCelebration(false), []);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#/admin' && currentUser?.role === 'admin') setView('admin');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono relative">
      {/* Initial Loading */}
      {initialLoading && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 text-zinc-700 animate-spin" />
          <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em]">Initializing system...</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!initialLoading && view === 'login' && (
          <LoginPage key="login" onLoginSuccess={handleLoginSuccess} />
        )}
        {!initialLoading && view === 'onboarding' && currentUser && (
          <OnboardingView
            key="onboarding"
            userName={currentUser.display_name}
            defaultLevel={currentUser.level}
            onSelectLevel={handleSelectLevel}
            onLogout={handleLogout}
          />
        )}
        {!initialLoading && view === 'dashboard' && currentUser && (
          <DashboardView
            key="dashboard"
            userName={currentUser.display_name}
            level={userLevel}
            streak={currentStreak}
            totalSolved={totalSolved}
            subjects={subjects}
            onStartExam={handleStartExam}
            onBack={() => setView('onboarding')}
            mastery={mastery}
            loading={loading}
          />
        )}
        {!initialLoading && view === 'exam' && questions.length > 0 && (
          <ExamView
            key="exam"
            question={questions[currentQIndex]}
            questionNumber={currentQIndex + 1}
            totalQuestions={questions.length}
            subject={currentSubject}
            selectedOption={selectedOption}
            showFeedback={showFeedback}
            onAnswer={handleAnswer}
            onBack={() => setView('dashboard')}
            streak={currentStreak}
          />
        )}
        {!initialLoading && view === 'results' && (
          <ResultsView
            key="results"
            questions={questions}
            answers={answers}
            streak={currentStreak}
            expandedReview={expandedReview}
            onToggleReview={(i) => setExpandedReview(expandedReview === i ? null : i)}
            onRetry={() => handleStartExam(currentSubject)}
            onBack={() => setView('dashboard')}
          />
        )}
        {!initialLoading && view === 'admin' && currentUser && (
          <AdminDashboard key="admin" currentUser={currentUser} onLogout={handleLogout} />
        )}
      </AnimatePresence>

      <CelebrationOverlay show={showCelebration} streak={celebrationStreak} onDone={handleCloseCelebration} />
    </div>
  );
}

// ============================================================
// ONBOARDING — Protocol Selection
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
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.4em] mb-4">Training Platform</p>
        <h1 className="text-4xl font-bold tracking-tighter text-white font-sans">QUANTUM</h1>
        <div className="w-8 h-px bg-zinc-800 mx-auto mt-4 mb-3" />
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
          Operator: <span className="text-zinc-400">{userName}</span>
        </p>
      </div>

      {/* Protocol Selection */}
      <div className="w-full max-w-lg">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em] mb-4 text-center">Select Protocol</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { level: 'SMP' as Level, label: 'PROTOCOL: SMP', sub: 'Junior High — 3 Modules', code: '01' },
            { level: 'SMA' as Level, label: 'PROTOCOL: SMA', sub: 'Senior High — 9 Modules', code: '02' },
          ]).map(item => (
            <button
              key={item.level}
              onClick={() => onSelectLevel(item.level)}
              className={cn(
                'border border-zinc-800 bg-[#050505] px-6 py-8 text-left transition-all duration-150 ease-out group hover:border-white active:scale-[0.995]',
                defaultLevel === item.level && 'border-zinc-600'
              )}
            >
              <span className="text-zinc-800 text-[10px] uppercase tracking-[0.3em] block mb-3">{item.code}</span>
              <span className="text-white text-sm font-medium block mb-1 font-sans">{item.label}</span>
              <span className="text-zinc-700 text-[10px] uppercase tracking-widest">{item.sub}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-800 group-hover:text-[#FF4D00] transition-colors mt-4" />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="mt-12 flex items-center gap-1.5 text-zinc-800 hover:text-zinc-500 transition-colors text-[10px] uppercase tracking-[0.3em]"
      >
        <LogOut className="w-3 h-3" />
        Disconnect
      </button>
    </motion.div>
  );
}

// ============================================================
// DASHBOARD — Job Board List
// ============================================================
function DashboardView({ userName, level, streak, totalSolved, subjects, onStartExam, onBack, mastery, loading }: {
  userName: string;
  level: Level;
  streak: number;
  totalSolved: number;
  subjects: Subject[];
  onStartExam: (s: Subject) => void;
  onBack: () => void;
  mastery: boolean;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen max-w-3xl mx-auto px-6 py-8"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <button onClick={onBack} className="text-zinc-700 hover:text-zinc-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-zinc-700">{userName}</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600">{level}</span>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="flex items-center gap-6 mb-8 text-[11px]">
        <span className="text-zinc-600 uppercase tracking-widest">
          STREAK {streak > 0 ? '[ACTIVE]' : '[IDLE]'} — <span className={streak > 0 ? 'text-[#FF4D00] font-bold' : 'text-zinc-700'}>{streak}</span>
        </span>
        <span className="text-zinc-800">|</span>
        <span className="text-zinc-600 uppercase tracking-widest">
          SOLVED — <span className="text-white font-bold">{totalSolved}</span>
        </span>
      </div>

      {/* Mastery */}
      {mastery && (
        <div className="border-b border-zinc-900 pb-4 mb-6 text-[10px] text-zinc-600 uppercase tracking-widest">
          [NOTICE] Mastery threshold reached. Generating new question variants.
        </div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]/95"
          >
            <Loader2 className="w-4 h-4 text-zinc-700 animate-spin mb-3" />
            <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em]">Loading modules...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Header */}
      <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-zinc-600">Available Modules</span>
        <span className="text-zinc-800">{subjects.length} modules</span>
      </div>

      {/* Module List */}
      <div className="border-t border-zinc-900">
        {subjects.map((sub, i) => (
          <motion.button
            key={sub}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onStartExam(sub)}
            disabled={loading}
            className={cn(
              'w-full flex items-center justify-between px-3 py-4 border-b border-zinc-900 transition-all duration-150 ease-out hover:bg-zinc-900 group text-left',
              loading && 'opacity-30 pointer-events-none'
            )}
          >
            <div className="flex items-center gap-4">
              <span className="text-zinc-700 text-[11px] w-5">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-white text-sm font-sans font-medium">{sub}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-700 text-[10px] uppercase tracking-widest hidden sm:inline">[READY]</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-800 group-hover:text-[#FF4D00] transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 pt-4 border-t border-zinc-900 text-center">
        <p className="text-zinc-800 text-[10px] uppercase tracking-[0.3em]">Quantum — Hybrid Engine v3.0</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// EXAM — Terminal Interface
// ============================================================
function ExamView({ question, questionNumber, totalQuestions, subject, selectedOption, showFeedback, onAnswer, onBack, streak }: {
  question: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  subject: Subject;
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
      className="min-h-screen max-w-3xl mx-auto px-6 py-8"
    >
      {/* Progress Line — 1px at top */}
      <div className="h-px bg-zinc-900 mb-6 relative">
        <motion.div
          className="h-px bg-zinc-500 absolute left-0 top-0"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-zinc-700 hover:text-zinc-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-zinc-600">{subject}</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-700">
            {String(questionNumber).padStart(2, '0')}/{String(totalQuestions).padStart(2, '0')}
          </span>
          <span className="text-zinc-800">|</span>
          <span className={cn('font-bold', streak > 0 ? 'text-[#FF4D00]' : 'text-zinc-700')}>
            STR:{streak}
          </span>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* Question Text */}
          <Card variant="outlined" className="px-5 py-6 mb-6">
            <p className="text-white text-base leading-relaxed font-sans">
              {question.question}
            </p>
          </Card>

          {/* Image or Diagram */}
          {question.imageUrl ? (
            <div className="mb-6 border border-zinc-800 overflow-hidden">
              <img
                src={question.imageUrl}
                alt="Question illustration"
                className="w-full h-auto max-h-64 object-contain bg-[#0A0A0A]"
                loading="eager"
              />
            </div>
          ) : question.diagramType !== 'none' ? (
            <DynamicDiagram type={question.diagramType} data={question.diagramData} />
          ) : null}

          {/* Terminal Options */}
          <div className="space-y-1 mt-6">
            {question.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === question.correctIndex;
              const letter = String.fromCharCode(65 + i);

              let rowStyle = 'border-zinc-800/50 hover:bg-zinc-900';
              let tagStyle = 'text-zinc-600 border-zinc-800';
              let textStyle = 'text-zinc-300';

              if (showFeedback) {
                if (isCorrect) {
                  rowStyle = 'border-emerald-800/50 bg-emerald-500/5';
                  tagStyle = 'text-emerald-500 border-emerald-800';
                  textStyle = 'text-emerald-400';
                } else if (isSelected && !isCorrect) {
                  rowStyle = 'border-red-800/50 bg-red-500/5';
                  tagStyle = 'text-red-500 border-red-800';
                  textStyle = 'text-red-400';
                } else {
                  rowStyle = 'border-zinc-900/30 opacity-30';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => !showFeedback && onAnswer(i)}
                  disabled={showFeedback}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 border transition-all duration-150 ease-out text-left',
                    rowStyle,
                    !showFeedback && 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center text-[10px] font-bold border shrink-0',
                    tagStyle
                  )}>
                    {showFeedback && isCorrect ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : showFeedback && isSelected && !isCorrect ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      letter
                    )}
                  </div>
                  <span className={cn('text-sm', textStyle)}>{opt}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// RESULTS — Session Report
// ============================================================
function ResultsView({ questions, answers, streak, expandedReview, onToggleReview, onRetry, onBack }: {
  questions: GeneratedQuestion[];
  answers: QuizAnswer[];
  streak: number;
  expandedReview: number | null;
  onToggleReview: (i: number) => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const correctCount = answers.filter(a => a.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const grade = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'ACCEPTABLE' : score >= 40 ? 'BELOW_THRESHOLD' : 'CRITICAL';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen max-w-3xl mx-auto px-6 py-8"
    >
      <button onClick={onBack} className="text-zinc-700 hover:text-zinc-400 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Score Report */}
      <div className="border-b border-zinc-900 pb-8 mb-8">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em] mb-4">Session Report</p>

        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-5xl font-bold text-white font-sans">{score}%</span>
          <span className="text-zinc-700 text-[10px] uppercase tracking-[0.2em]">{grade}</span>
        </div>

        <div className="flex items-center gap-6 mt-4 text-[11px]">
          <span className="text-zinc-600">
            CORRECT <span className="text-emerald-500 font-bold">{correctCount}</span>
          </span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600">
            FAILED <span className="text-red-500 font-bold">{questions.length - correctCount}</span>
          </span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600">
            STREAK <span className={cn('font-bold', streak > 0 ? 'text-[#FF4D00]' : 'text-zinc-700')}>{streak}</span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-10">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-white text-black text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-zinc-200 transition-colors active:scale-[0.995]"
        >
          Retry Module
        </button>
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-[0.15em] hover:border-zinc-600 hover:text-white transition-colors active:scale-[0.995]"
        >
          Dashboard
        </button>
      </div>

      {/* Review Log */}
      <div className="border-t border-zinc-900">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.2em] py-3 flex items-center gap-2">
          <Eye className="w-3 h-3" />
          Audit Log
        </p>

        {questions.map((q, i) => {
          const answer = answers[i];
          const isExpanded = expandedReview === i;
          const isCorrect = answer?.isCorrect ?? false;

          return (
            <div key={q.id}>
              <button
                onClick={() => onToggleReview(i)}
                className="w-full flex items-center gap-3 px-3 py-3 border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors text-left"
              >
                <span className={cn(
                  'text-[10px] font-bold shrink-0',
                  isCorrect ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {isCorrect ? '[OK]' : '[ERR]'}
                </span>
                <span className="text-zinc-700 text-[10px] shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-zinc-400 text-sm flex-1 truncate font-sans">{q.question}</span>
                <ChevronRight className={cn(
                  'w-3 h-3 text-zinc-800 transition-transform shrink-0',
                  isExpanded && 'rotate-90'
                )} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-5 ml-8 border-b border-zinc-900 border-l border-l-zinc-800">
                      <p className="text-zinc-300 text-sm mb-4 font-sans">{q.question}</p>

                      {q.imageUrl ? (
                        <div className="mb-4 border border-zinc-800 overflow-hidden">
                          <img src={q.imageUrl} alt="Question" className="w-full h-auto max-h-48 object-contain bg-[#0A0A0A]" />
                        </div>
                      ) : q.diagramType !== 'none' ? (
                        <DynamicDiagram type={q.diagramType} data={q.diagramData} />
                      ) : null}

                      <div className="space-y-1.5 text-[11px]">
                        <p className="text-zinc-600">
                          Response: <span className={isCorrect ? 'text-emerald-500' : 'text-red-500'}>
                            {answer ? q.options[answer.selectedIndex] : '—'}
                          </span>
                        </p>
                        <p className="text-zinc-600">
                          Expected: <span className="text-emerald-500">{q.options[q.correctIndex]}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-900">
                        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] mb-1">Analysis</p>
                        <p className="text-zinc-500 text-sm font-sans">{q.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-zinc-900 text-center">
        <p className="text-zinc-800 text-[10px] uppercase tracking-[0.3em]">Quantum Platform</p>
      </div>
    </motion.div>
  );
}