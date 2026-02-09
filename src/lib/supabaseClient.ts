// ============================================================
// QUANTUM OLYMPIAD — SUPABASE CLIENT v3.0 (Auth + Register + Realtime)
// ============================================================
// Full authentication layer: Login, Register, Email Verification.
// Real Supabase or Demo Mode with in-memory simulation.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const IS_DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (!IS_DEMO_MODE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  supabase = createClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export { supabase };

// ============================================================
// DATABASE TYPES
// ============================================================
export interface Profile {
  id: string;
  email: string;
  role: 'student' | 'admin';
  level: 'SMP' | 'SMA';
  current_streak: number;
  display_name: string;
  created_at: string;
}

export interface QuizHistoryRow {
  id: string;
  user_id: string;
  subject: string;
  question_signature: string;
  is_correct: boolean;
  created_at: string;
}

// ============================================================
// DEMO MODE — LOCAL SIMULATION
// ============================================================
const DEMO_USERS: Profile[] = [
  { id: 'demo-admin-001', email: 'admin@quantum.id', role: 'admin', level: 'SMA', current_streak: 0, display_name: 'System Admin', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'demo-student-001', email: 'student@quantum.id', role: 'student', level: 'SMP', current_streak: 12, display_name: 'Aditya K.', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'demo-student-002', email: 'rina@quantum.id', role: 'student', level: 'SMA', current_streak: 32, display_name: 'Rina S.', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'demo-student-003', email: 'budi@quantum.id', role: 'student', level: 'SMA', current_streak: 28, display_name: 'Budi P.', created_at: new Date(Date.now() - 18 * 86400000).toISOString() },
  { id: 'demo-student-004', email: 'sari@quantum.id', role: 'student', level: 'SMP', current_streak: 15, display_name: 'Sari W.', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'demo-student-005', email: 'dimas@quantum.id', role: 'student', level: 'SMA', current_streak: 51, display_name: 'Dimas A.', created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: 'demo-student-006', email: 'maya@quantum.id', role: 'student', level: 'SMP', current_streak: 8, display_name: 'Maya R.', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'demo-student-007', email: 'fikri@quantum.id', role: 'student', level: 'SMA', current_streak: 39, display_name: 'Fikri H.', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'demo-student-008', email: 'nadia@quantum.id', role: 'student', level: 'SMA', current_streak: 22, display_name: 'Nadia L.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'demo-student-009', email: 'reza@quantum.id', role: 'student', level: 'SMP', current_streak: 3, display_name: 'Reza T.', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'demo-student-010', email: 'putri@quantum.id', role: 'student', level: 'SMA', current_streak: 17, display_name: 'Putri M.', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
];

const demoQuizHistory: QuizHistoryRow[] = [];
let demoCurrentUser: Profile | null = null;

const DEMO_SUBJECTS = ['Matematika', 'Fisika', 'Kimia', 'IPA', 'IPS', 'Biologi', 'Astronomi', 'Informatika', 'Ekonomi', 'Geografi'];

function generateDemoFeedItem(): QuizHistoryRow {
  const students = DEMO_USERS.filter(u => u.role === 'student');
  const user = students[Math.floor(Math.random() * students.length)];
  const subject = DEMO_SUBJECTS[Math.floor(Math.random() * DEMO_SUBJECTS.length)];
  return {
    id: `demo-qh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: user.id,
    subject,
    question_signature: `${subject.slice(0, 3).toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
    is_correct: Math.random() > 0.25,
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// AUTH SERVICE — LOGIN
// ============================================================
export interface AuthResult {
  success: boolean;
  user?: Profile;
  error?: string;
  emailNotConfirmed?: boolean;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!IS_DEMO_MODE) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Check for unconfirmed email
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        return {
          success: false,
          error: 'Account not activated. Please verify your email.',
          emailNotConfirmed: true,
        };
      }
      return { success: false, error: error.message };
    }
    if (!data.user) {
      return { success: false, error: 'Authentication failed' };
    }
    // Fetch profile (created by DB trigger after email confirm)
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).single();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Profile not found. Contact administrator.' };
    }
    return { success: true, user: profile as Profile };
  }

  // ---- DEMO MODE ----
  await new Promise(r => setTimeout(r, 800));
  const user = DEMO_USERS.find(u => u.email === email);
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }
  if (password !== 'demo' && password !== 'admin123' && password !== 'student123' && password !== 'password') {
    return { success: false, error: 'Invalid email or password.' };
  }
  demoCurrentUser = user;
  return { success: true, user };
}

// ============================================================
// AUTH SERVICE — REGISTER (with Real Email Verification)
// ============================================================
export interface RegisterResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  level: 'SMP' | 'SMA'
): Promise<RegisterResult> {
  if (!IS_DEMO_MODE) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          level: level,
          role: 'student',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Supabase returns data.user even before confirmation
    // but data.user.identities will be empty if user already exists
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    return { success: true, emailSent: true };
  }

  // ---- DEMO MODE: Simulate registration ----
  await new Promise(r => setTimeout(r, 1000));

  // Check if email already exists
  if (DEMO_USERS.find(u => u.email === email)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // Create a new demo user (immediately "verified" in demo mode)
  const newUser: Profile = {
    id: `demo-student-${Date.now()}`,
    email,
    role: 'student',
    level,
    current_streak: 0,
    display_name: fullName,
    created_at: new Date().toISOString(),
  };
  DEMO_USERS.push(newUser);

  // Notify profile change listeners for admin dashboard
  notifyProfileChange();

  return { success: true, emailSent: true };
}

export async function signOut(): Promise<void> {
  if (!IS_DEMO_MODE) {
    await supabase.auth.signOut();
  }
  demoCurrentUser = null;
}

export function getCurrentDemoUser(): Profile | null {
  return demoCurrentUser;
}

// ============================================================
// DATA SERVICE
// ============================================================
export async function fetchProfiles(): Promise<Profile[]> {
  if (!IS_DEMO_MODE) {
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Error fetching profiles:', error); return []; }
    return (data || []) as Profile[];
  }
  return DEMO_USERS.map(u => ({ ...u }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchQuizHistory(userId: string, subject?: string): Promise<QuizHistoryRow[]> {
  if (!IS_DEMO_MODE) {
    let query = supabase.from('quiz_history').select('*').eq('user_id', userId);
    if (subject) query = query.eq('subject', subject);
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as QuizHistoryRow[];
  }
  return demoQuizHistory.filter(q => q.user_id === userId && (!subject || q.subject === subject));
}

export async function saveQuizResult(userId: string, subject: string, signature: string, isCorrect: boolean): Promise<void> {
  if (!IS_DEMO_MODE) {
    await supabase.from('quiz_history').insert({ user_id: userId, subject, question_signature: signature, is_correct: isCorrect });
    return;
  }
  demoQuizHistory.push({
    id: `demo-qh-${Date.now()}`,
    user_id: userId, subject, question_signature: signature,
    is_correct: isCorrect, created_at: new Date().toISOString(),
  });
}

export async function updateStreak(userId: string, streak: number): Promise<void> {
  if (!IS_DEMO_MODE) {
    await supabase.from('profiles').update({ current_streak: streak }).eq('id', userId);
    return;
  }
  const user = DEMO_USERS.find(u => u.id === userId);
  if (user) user.current_streak = streak;
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  if (!IS_DEMO_MODE) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data as Profile | null;
  }
  const found = DEMO_USERS.find(u => u.id === userId);
  return found ? { ...found } : null;
}

// ============================================================
// REALTIME SUBSCRIPTION (v3.0)
// ============================================================
export interface RealtimeFeedItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  signature: string;
  isCorrect: boolean;
  timestamp: string;
  streak: number;
}

type FeedCallback = (item: RealtimeFeedItem) => void;
type ProfilesChangedCallback = (profiles: Profile[]) => void;

const profileChangeListeners = new Set<ProfilesChangedCallback>();

export function onProfilesChanged(cb: ProfilesChangedCallback): () => void {
  profileChangeListeners.add(cb);
  return () => { profileChangeListeners.delete(cb); };
}

function notifyProfileChange() {
  const snapshot = DEMO_USERS.map(u => ({ ...u }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  profileChangeListeners.forEach(cb => cb(snapshot));
}

export function subscribeToQuizFeed(callback: FeedCallback): () => void {
  if (!IS_DEMO_MODE) {
    const channel = supabase
      .channel('admin-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_history' },
        async (payload) => {
          const row = payload.new as QuizHistoryRow;
          const profile = await fetchProfileById(row.user_id);
          callback({
            id: row.id,
            userId: row.user_id,
            userName: profile?.display_name || 'Unknown',
            userEmail: profile?.email || '',
            subject: row.subject,
            signature: row.question_signature,
            isCorrect: row.is_correct,
            timestamp: row.created_at,
            streak: profile?.current_streak || 0,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  // ---- DEMO MODE: Recursive setTimeout ----
  let cancelled = false;

  function scheduleNext() {
    if (cancelled) return;
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => {
      if (cancelled) return;

      const row = generateDemoFeedItem();
      const user = DEMO_USERS.find(u => u.id === row.user_id);
      if (user) {
        if (row.is_correct) {
          user.current_streak += 1;
        } else {
          user.current_streak = Math.max(0, user.current_streak - 1);
        }

        callback({
          id: row.id,
          userId: row.user_id,
          userName: user.display_name,
          userEmail: user.email,
          subject: row.subject,
          signature: row.question_signature,
          isCorrect: row.is_correct,
          timestamp: row.created_at,
          streak: user.current_streak,
        });

        notifyProfileChange();
      }

      scheduleNext();
    }, delay);
  }

  scheduleNext();

  return () => { cancelled = true; };
}

// ============================================================
// PROFILE POLLING
// ============================================================
export function pollProfiles(
  callback: (profiles: Profile[]) => void,
  intervalMs = 10000
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    const profiles = await fetchProfiles();
    if (active) callback(profiles);
  };

  poll();

  const intervalId = setInterval(poll, intervalMs);

  const unsubPush = onProfilesChanged((profiles) => {
    if (active) callback(profiles);
  });

  return () => {
    active = false;
    clearInterval(intervalId);
    unsubPush();
  };
}
