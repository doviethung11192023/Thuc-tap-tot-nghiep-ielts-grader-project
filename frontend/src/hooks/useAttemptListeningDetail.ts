import { useState, useEffect } from "react";
import { getAttemptDetail } from "@/services/student-test-practice";
import type {
  CleanListeningTestData,
  CleanListeningSection,
  CleanListeningExerciseGroup,
  CleanListeningQuestion,
  CleanListeningUtterance,
} from "@/types/clean-detail";
import {
  extractKeywordsFromExplanation,
  extractQuestionContextFromExplanation,
  extractSentenceForBlank,
} from "@/utils/explanation-parser";

function resolveListeningPrompt(rawPrompt: string | undefined, template: string, q: any): string {
  const clean = (rawPrompt || "").trim();
  const isGeneric = !clean || /^(?:question|câu)\s*\d*[:.\s]*$/i.test(clean);
  if (!isGeneric) return clean;
  const fromTemplate = extractSentenceForBlank(template, q.number);
  const bareToken = `{{${q.number}}}`;
  if (fromTemplate && fromTemplate.trim() !== bareToken) return fromTemplate;
  const fromExpl = extractQuestionContextFromExplanation(q.explanation_4_steps);
  if (fromExpl) return fromExpl;
  return clean || `Question ${q.number}`;
}

function parseUtterances(passageText?: string): CleanListeningUtterance[] {
  if (!passageText) return [];
  try {
    if (passageText.trim().startsWith('{')) {
      const parsed = JSON.parse(passageText);
      if (Array.isArray(parsed.transcripts)) {
        return parsed.transcripts.map((t: any, idx: number) => {
          const parts = (t.timestamp || '00:00').split(':');
          const secs = parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
          const speakerName = String(t.speaker || 'Narrator').trim();
          const rawRole = String(t.role || '').trim();
          return {
            id: idx + 1,
            speaker_id: idx + 1,
            speaker_name: speakerName,
            role: rawRole && rawRole.toLowerCase() !== speakerName.toLowerCase() ? rawRole : '',
            text: t.text || '',
            start_timestamp: secs * 1000,
            end_timestamp: (secs + 10) * 1000,
            start_seconds: secs,
            time_formatted: t.timestamp || '00:00',
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
  const [data, setData] = useState<CleanListeningTestData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(attemptId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setData(null);
      setError("Không tìm thấy mã bài làm (attemptId). Vui lòng mở lại từ Lịch sử làm bài.");
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getAttemptDetail(attemptId)
      .then((res) => {
        if (!mounted) return;
        if (!res || !Array.isArray(res.sections) || res.sections.length === 0) {
          setData(null);
          setError("Không tìm thấy dữ liệu bài làm Listening.");
          return;
        }

        const rawSections = res.sections;
        const sections: CleanListeningSection[] = rawSections.map((s: any, idx: number) => ({
          section_number: s.order_no || idx + 1,
          title: s.title || `Part ${idx + 1}`,
          audio_url: s.audio_key || "",
          playtime_string: "07:30",
          duration_seconds: s.duration_seconds || 450,
          transcript_utterances: parseUtterances(s.transcript || s.passage_text),
        }));

        const exercise_groups: CleanListeningExerciseGroup[] = rawSections.flatMap((s: any, sIdx: number) =>
          (s.question_groups || []).map((g: any, gIdx: number) => {
            const templateText = g.content?.template || "";
            const qNums = (g.questions || []).map((q: any) => Number(q.number)).filter(Boolean);
            const qStart = qNums.length > 0 ? Math.min(...qNums) : (gIdx * 10 + 1);
            const qEnd = qNums.length > 0 ? Math.max(...qNums) : (gIdx * 10 + 10);
            return {
              id: g.id || (sIdx * 10 + gIdx + 1),
              section_number: s.order_no || sIdx + 1,
              type: g.question_type || 1,
              title: g.instructions || `Questions ${qStart} - ${qEnd}`,
              content: templateText || g.instructions || "",
              template: templateText || undefined,
              options_pool: g.content?.options_pool || undefined,
              diagram_image_url: g.content?.diagram_image_url || g.image_key || undefined,
              table_data: g.content?.table_data || undefined,
              question_start: qStart,
              question_end: qEnd,
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
              prompt: resolveListeningPrompt(q.prompt, g.content?.template || "", q),
              options: Array.isArray(q.options) ? q.options : [],
              user_answer: q.user_answer || "",
              correct_answer: q.correct_answer || "",
              is_correct: Boolean(q.is_correct),
              explanation_4_steps: q.explanation_4_steps || "",
              evidence_text: q.evidence_text || "",
              keywords_mapping:
                q.keywords_mapping && q.keywords_mapping.length > 0
                  ? q.keywords_mapping
                  : extractKeywordsFromExplanation(q.explanation_4_steps),
            }))
          )
        );
        allQuestions.sort((a, b) => a.question_number - b.question_number);

        setData({
          test_id: res.test_id || "",
          slug: res.test_id || "listening-test",
          title: res.title || "IELTS Listening Test",
          overall_band: res.overall_band == null ? null : Number(res.overall_band),
          correct_count: Number(res.correct_count || 0),
          total_questions: allQuestions.length,
          time_spent: res.time_spent_sec ? `${Math.round(res.time_spent_sec / 60)} phút` : "—",
          submitted_at: res.submitted_at || "",
          task_formats_result: Array.isArray(res.task_formats_result) ? res.task_formats_result : [],
          sections,
          exercise_groups,
          questions: allQuestions,
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setData(null);
        setError(err?.response?.data?.detail || "Không thể tải chi tiết bài làm Listening. Vui lòng thử lại sau.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [attemptId]);

  return { data, loading, error };
}
