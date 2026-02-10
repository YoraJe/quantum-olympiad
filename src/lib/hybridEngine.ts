// ============================================================
// QUANTUM OLYMPIAD — HYBRID QUESTION ENGINE
// ============================================================
// Combines Supabase question_bank (with image support) and
// the procedural Infinity Engine generator for infinite content.
// ============================================================

import { supabase, IS_DEMO_MODE, fetchQuizHistory } from '@/lib/supabaseClient';
import {
  generateQuestionBatch,
  type GeneratedQuestion,
  type Level,
  type Subject,
} from '@/lib/generator';

// ============================================================
// DB ROW SHAPE — matches `public.question_bank` table
// ============================================================
interface QuestionBankRow {
  id: string;
  level: string;
  subject: string;
  question: string;
  options: string[];      // JSONB array of strings
  answer: string;         // The correct answer text (must match one of options)
  explanation: string;
  image_url: string | null;
  created_at: string;
}

// ============================================================
// SHUFFLE UTILITY
// ============================================================
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// CONVERT DB ROW → GeneratedQuestion
// ============================================================
function mapDbRowToQuestion(row: QuestionBankRow): GeneratedQuestion {
  // Find correctIndex by matching `answer` text against options array
  const correctIndex = row.options.findIndex(
    (opt) => opt.trim().toLowerCase() === row.answer.trim().toLowerCase()
  );

  return {
    id: row.id,
    signature: row.id, // Use DB id as signature for dedup
    subject: row.subject as Subject,
    level: row.level as Level,
    question: row.question,
    options: row.options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0, // Fallback to 0 if no match
    explanation: row.explanation || '',
    diagramType: 'none',   // DB questions use image_url, not SVG diagrams
    diagramData: {},
    imageUrl: row.image_url || undefined,
  };
}

// ============================================================
// MAIN HYBRID FETCH
// ============================================================
/**
 * Fetches a smart quiz session that combines:
 *   1. Curated questions from Supabase `question_bank` table (with images)
 *   2. Procedurally generated questions from the Infinity Engine
 *
 * Priority: DB questions first (fresh ones the user hasn't seen),
 * then fill remaining slots with generated questions.
 */
export async function fetchSmartSession(
  level: Level,
  subject: Subject,
  count: number,
  userId: string
): Promise<{ questions: GeneratedQuestion[]; mastery: boolean }> {
  // ---- DEMO MODE: Skip DB, use generator only ----
  if (IS_DEMO_MODE) {
    return generateQuestionBatch(level, subject, count);
  }

  try {
    // ----------------------------------------------------------------
    // STEP 1: Get used question signatures for this user
    // ----------------------------------------------------------------
    const history = await fetchQuizHistory(userId);
    const usedSignatures = new Set(history.map((h) => h.question_signature));

    // ----------------------------------------------------------------
    // STEP 2: Query question_bank from Supabase
    // ----------------------------------------------------------------
    // Build the list of used IDs to exclude (only DB UUIDs, not generator sigs)
    const usedIds = Array.from(usedSignatures);

    let query = supabase
      .from('question_bank')
      .select('id, level, subject, question, options, answer, explanation, image_url, created_at')
      .eq('level', level)
      .eq('subject', subject)
      .limit(count);

    // Exclude already-answered questions (if any exist)
    if (usedIds.length > 0) {
      query = query.not('id', 'in', `(${usedIds.join(',')})`);
    }

    const { data: dbRows, error } = await query;

    if (error) {
      console.warn('Hybrid Engine: question_bank query failed, falling back to generator.', error.message);
      return generateQuestionBatch(level, subject, count, usedSignatures);
    }

    // ----------------------------------------------------------------
    // STEP 3: Map DB results to GeneratedQuestion format
    // ----------------------------------------------------------------
    const dbQuestions: GeneratedQuestion[] = (dbRows || []).map((row) =>
      mapDbRowToQuestion(row as QuestionBankRow)
    );

    // ----------------------------------------------------------------
    // STEP 4: Calculate how many more we need from the generator
    // ----------------------------------------------------------------
    const remainingNeeded = count - dbQuestions.length;
    let generatedQuestions: GeneratedQuestion[] = [];
    let mastery = false;

    if (remainingNeeded > 0) {
      // Merge DB question signatures into usedSignatures so generator doesn't duplicate
      const allUsedSigs = new Set(usedSignatures);
      dbQuestions.forEach((q) => allUsedSigs.add(q.signature));

      const genResult = generateQuestionBatch(level, subject, remainingNeeded, allUsedSigs);
      generatedQuestions = genResult.questions;
      mastery = genResult.mastery;
    }

    // ----------------------------------------------------------------
    // STEP 5: Combine and shuffle
    // ----------------------------------------------------------------
    const combined = shuffle([...dbQuestions, ...generatedQuestions]);

    return { questions: combined, mastery };
  } catch (err) {
    // Network error or unexpected failure — graceful fallback
    console.error('Hybrid Engine: Unexpected error, falling back to generator.', err);
    return generateQuestionBatch(level, subject, count);
  }
}
