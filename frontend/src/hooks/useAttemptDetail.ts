import { useState, useEffect } from "react";
import { getAttemptDetail } from "@/services/student-test-practice";
import { cleanReadingTest1Data, CleanReadingQuestion } from "@/mocks/clean-dataset/reading-test-1-clean";
import { extractKeywordsFromExplanation, extractSentenceForBlank } from "@/utils/explanation-parser";

export interface DetailPassage {
  passage_number: number;
  title: string;
  content: string;
}

export interface DetailExerciseGroup {
  id?: string | number;
  passage_number: number;
  title: string;
  content: string;
  template?: string;
  question_start?: number;
  question_end?: number;
  questions?: CleanReadingQuestion[];
}

export interface AttemptDetailData {
  title: string;
  overall_band: number;
  correct_count: number;
  passages: DetailPassage[];
  questions: CleanReadingQuestion[];
  exercise_groups: DetailExerciseGroup[];
}

export function useAttemptDetail(attemptId?: string) {
  const [data, setData] = useState<AttemptDetailData>(cleanReadingTest1Data);
  const [loading, setLoading] = useState<boolean>(Boolean(attemptId));

  useEffect(() => {
    if (!attemptId) return;

    let mounted = true;
    setLoading(true);

    getAttemptDetail(attemptId)
      .then((res) => {
        if (!mounted || !res || !res.sections) return;

        const sections = res.sections || [];
        const passages: DetailPassage[] = sections.map((s: any, idx: number) => ({
          passage_number: s.order_no || idx + 1,
          title: s.title || `Passage ${idx + 1}`,
          content: s.passage_text || "",
        }));

        const exercise_groups: DetailExerciseGroup[] = sections.flatMap((s: any, sIdx: number) =>
          (s.question_groups || []).map((g: any, gIdx: number) => {
            const templateText = g.content?.template || "";
            const groupQuestions: CleanReadingQuestion[] = (g.questions || []).map((q: any) => {
              const pText =
                (q.prompt && !q.prompt.toLowerCase().startsWith('question') && !q.prompt.toLowerCase().startsWith('câu'))
                  ? q.prompt
                  : (extractSentenceForBlank(templateText, q.number) || q.prompt || `Câu ${q.number}`);

              const keywords =
                q.keywords_mapping && q.keywords_mapping.length > 0
                  ? q.keywords_mapping
                  : extractKeywordsFromExplanation(q.explanation_4_steps);

              return {
                id: q.id,
                group_id: g.id,
                question_number: q.number,
                passage_number: s.order_no || sIdx + 1,
                question_type: g.question_type || 1,
                prompt: pText,
                options: Array.isArray(q.options) ? q.options : [],
                user_answer: q.user_answer || "",
                correct_answer: q.correct_answer || "",
                is_correct: Boolean(q.is_correct),
                explanation_4_steps: q.explanation_4_steps || "",
                evidence_text: q.evidence_text || "",
                keywords_mapping: keywords,
              };
            });

            const qNums = groupQuestions.map((q) => q.question_number);
            const qStart = qNums.length > 0 ? Math.min(...qNums) : undefined;
            const qEnd = qNums.length > 0 ? Math.max(...qNums) : undefined;

            return {
              id: String(g.id || `g_${sIdx}_${gIdx}`),
              passage_number: s.order_no || sIdx + 1,
              title: g.instructions || (qStart && qEnd ? `Questions ${qStart}-${qEnd}` : `Questions in Section ${s.order_no || sIdx + 1}`),
              content: templateText || g.instructions || "",
              template: templateText || undefined,
              question_start: qStart,
              question_end: qEnd,
              questions: groupQuestions,
            };
          })
        );

        // Đảm bảo thứ tự nhóm câu hỏi tăng dần theo question_start
        exercise_groups.sort((a, b) => (a.question_start ?? 0) - (b.question_start ?? 0));

        const questions: CleanReadingQuestion[] = exercise_groups.flatMap((eg) => eg.questions || []);

        setData({
          title: res.title || "IELTS Practice Test",
          overall_band: Number(res.overall_band || 0),
          correct_count: Number(res.correct_count || 0),
          passages: passages.length > 0 ? passages : cleanReadingTest1Data.passages,
          questions: questions.length > 0 ? questions : cleanReadingTest1Data.questions,
          exercise_groups: exercise_groups.length > 0 ? exercise_groups : cleanReadingTest1Data.exercise_groups,
        });
      })
      .catch((err) => {
        console.warn("Could not load backend attempt detail, using fallback:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [attemptId]);

  return { data, loading };
}
