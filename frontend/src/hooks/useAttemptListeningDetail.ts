import { useState, useEffect } from "react";
import { getAttemptDetail } from "@/services/student-test-practice";
import {
  cleanListeningTest1Data,
  CleanListeningTestData,
  CleanListeningSection,
  CleanListeningExerciseGroup,
  CleanListeningQuestion,
  CleanListeningUtterance
} from "@/mocks/clean-dataset/listening-test-1-clean";
import { extractKeywordsFromExplanation } from "@/utils/explanation-parser";

function parseUtterances(passageText?: string): CleanListeningUtterance[] {
  if (!passageText) return [];
  try {
    if (passageText.trim().startsWith('{')) {
      const parsed = JSON.parse(passageText);
      if (Array.isArray(parsed.transcripts)) {
        return parsed.transcripts.map((t: any, idx: number) => {
          const parts = (t.timestamp || '00:00').split(':');
          const secs = parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
          return {
            id: idx + 1,
            speaker_id: idx + 1,
            speaker_name: t.speaker || 'Narrator',
            role: t.speaker || 'Narrator',
            text: t.text || '',
            start_timestamp: secs * 1000,
            end_timestamp: (secs + 10) * 1000,
            start_seconds: secs,
            time_formatted: t.timestamp || '00:00'
          };
        });
      }
    }
  } catch (err) {
    console.warn("Could not parse transcripts JSON:", err);
  }
  return [];
}

export function useAttemptListeningDetail(attemptId?: string) {
  const [data, setData] = useState<CleanListeningTestData>(cleanListeningTest1Data);
  const [loading, setLoading] = useState<boolean>(Boolean(attemptId));

  useEffect(() => {
    if (!attemptId) return;

    let mounted = true;
    setLoading(true);

    getAttemptDetail(attemptId)
      .then((res) => {
        if (!mounted || !res || !res.sections) return;

        const rawSections = res.sections || [];
        const sections: CleanListeningSection[] = rawSections.map((s: any, idx: number) => {
          const utterances = parseUtterances(s.passage_text);
          return {
            section_number: s.order_no || idx + 1,
            title: s.title || `Part ${idx + 1}`,
            audio_url: s.audio_key || "",
            playtime_string: "07:30",
            duration_seconds: s.duration_seconds || 450,
            transcript_utterances: utterances.length > 0
              ? utterances
              : cleanListeningTest1Data.sections[idx]?.transcript_utterances || []
          };
        });

        const exercise_groups: CleanListeningExerciseGroup[] = rawSections.flatMap((s: any, sIdx: number) =>
          (s.question_groups || []).map((g: any, gIdx: number) => {
            const groupQuestions = (g.questions || []).map((q: any) => {
              const keywords =
                q.keywords_mapping && q.keywords_mapping.length > 0
                  ? q.keywords_mapping
                  : extractKeywordsFromExplanation(q.explanation_4_steps);

              return {
                id: q.id,
                question_number: q.number,
                section_number: s.order_no || sIdx + 1,
                question_type: g.question_type || 1,
                prompt: q.prompt || `Question ${q.number}`,
                options: Array.isArray(q.options) ? q.options : [],
                user_answer: q.user_answer || "",
                correct_answer: q.correct_answer || "",
                is_correct: Boolean(q.is_correct),
                explanation_4_steps: q.explanation_4_steps || "",
                evidence_text: q.evidence_text || "",
                keywords_mapping: keywords
              };
            });

            const qNums = groupQuestions.map((q: any) => q.question_number);
            const qStart = qNums.length > 0 ? Math.min(...qNums) : (gIdx * 10 + 1);
            const qEnd = qNums.length > 0 ? Math.max(...qNums) : (gIdx * 10 + 10);

            return {
              id: g.id || (sIdx * 10 + gIdx + 1),
              section_number: s.order_no || sIdx + 1,
              type: g.question_type || 1,
              title: g.instructions || `Questions ${qStart} - ${qEnd}`,
              content: g.content?.template || g.instructions || "",
              table_data: g.content?.table_data || undefined,
              question_start: qStart,
              question_end: qEnd
            };
          })
        );

        const allQuestions: CleanListeningQuestion[] = rawSections.flatMap((s: any, sIdx: number) =>
          (s.question_groups || []).flatMap((g: any) =>
            (g.questions || []).map((q: any) => ({
              id: q.id,
              question_number: q.number,
              section_number: s.order_no || sIdx + 1,
              question_type: g.question_type || 1,
              prompt: q.prompt || `Question ${q.number}`,
              options: Array.isArray(q.options) ? q.options : [],
              user_answer: q.user_answer || "",
              correct_answer: q.correct_answer || "",
              is_correct: Boolean(q.is_correct),
              explanation_4_steps: q.explanation_4_steps || "",
              evidence_text: q.evidence_text || "",
              keywords_mapping:
                q.keywords_mapping && q.keywords_mapping.length > 0
                  ? q.keywords_mapping
                  : extractKeywordsFromExplanation(q.explanation_4_steps)
            }))
          )
        );

        allQuestions.sort((a, b) => a.question_number - b.question_number);

        setData({
          test_id: res.test_id || "test-1",
          slug: res.test_id || "listening-test",
          title: res.title || "IELTS Listening Practice Test",
          overall_band: Number(res.overall_band || 0),
          correct_count: Number(res.correct_count || 0),
          total_questions: allQuestions.length || 40,
          time_spent: res.time_spent_sec ? `${Math.round(res.time_spent_sec / 60)} phút` : "30:00",
          submitted_at: res.submitted_at || new Date().toISOString(),
          task_formats_result: res.task_formats_result || cleanListeningTest1Data.task_formats_result,
          sections: sections.length > 0 ? sections : cleanListeningTest1Data.sections,
          exercise_groups: exercise_groups.length > 0 ? exercise_groups : cleanListeningTest1Data.exercise_groups,
          questions: allQuestions.length > 0 ? allQuestions : cleanListeningTest1Data.questions
        });
      })
      .catch((err) => {
        console.warn("Could not load backend listening attempt detail, using fallback:", err);
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
