import type { ReadingTestData } from "@/types/exam";
import type { ListeningTestData, ListeningSectionData } from "@/mocks/exam-listening";
import { mockWritingExamDataset } from "@/mocks/exam-writing";
import { mockSpeakingExamDataset, type SpeakingPartData } from "@/mocks/exam-speaking";
import { parseReadingParagraphs, mapQuestionGroup } from "./exam-mapper-helpers";

export { parseReadingParagraphs, mapQuestionGroup };

export function mapToReadingTestData(apiData: any): ReadingTestData | null {
  const sections = apiData?.sections || [];
  if (!sections.length) return null;

  const passages = sections.map((sec: any, idx: number) => {
    const firstGrpContent = sec.question_groups?.[0]?.content || {};
    const paragraphs = parseReadingParagraphs(sec.passage_text || "", firstGrpContent.paragraphs);
    const question_groups = (sec.question_groups || []).map(mapQuestionGroup);

    return {
      passage: {
        id: String(sec.id || `p${idx + 1}`),
        title: sec.title || `Reading Passage ${idx + 1}`,
        content: sec.passage_text || "",
        paragraphs,
      },
      question_groups,
    };
  });

  if (passages.every((p: any) => p.question_groups.length === 0 && !p.passage.content)) {
    return null;
  }

  return {
    test_id: String(apiData.test_id || "reading-test"),
    title: apiData.title || "IELTS Academic Reading Test",
    passages,
  };
}

export function mapToListeningTestData(apiData: any): ListeningTestData | null {
  const rawSections = apiData?.sections || [];
  if (!rawSections.length) return null;

  const sections: ListeningSectionData[] = rawSections.map((sec: any, idx: number) => {
    let transcripts = [];
    if (sec.passage_text && sec.passage_text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(sec.passage_text);
        transcripts = parsed.transcripts || [];
      } catch {
        transcripts = [];
      }
    }
    return {
      section_number: ((idx % 4) + 1) as 1 | 2 | 3 | 4,
      title: sec.title || `Section ${idx + 1}`,
      audio_url: sec.audio_key || "https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3",
      duration_seconds: 450,
      transcripts,
      question_groups: (sec.question_groups || []).map(mapQuestionGroup),
    };
  });

  if (sections.every((s) => s.question_groups.length === 0)) {
    return null;
  }

  return {
    test_id: String(apiData.test_id || "listening-test"),
    title: apiData.title || "IELTS Academic Listening Test",
    total_duration_minutes: Number(apiData.duration_min || 35),
    sections,
  };
}

export function mapToWritingExamData(apiData: any) {
  const sections = apiData?.sections || [];
  if (!sections.length) return null;

  const sec1 = sections[0];
  const sec2 = sections[1] || sections[0];
  const q1 = sec1?.question_groups?.[0]?.questions?.[0];
  const q2 = sec2?.question_groups?.[0]?.questions?.[0];
  const img1 = sec1?.question_groups?.[0]?.image_key || null;

  return {
    ...mockWritingExamDataset,
    test_id: String(apiData.test_id || mockWritingExamDataset.test_id),
    title: apiData.title || mockWritingExamDataset.title,
    task1: {
      ...mockWritingExamDataset.task1,
      id: String(q1?.id || "wt1"),
      topic: sec1?.title || "WRITING TASK 1",
      prompt: q1?.prompt || sec1?.passage_text || mockWritingExamDataset.task1.prompt,
      image_url: img1,
      min_words: 150,
      suggested_time: 20,
    },
    task2: {
      ...mockWritingExamDataset.task2,
      id: String(q2?.id || "wt2"),
      topic: sec2?.title || "WRITING TASK 2",
      prompt: q2?.prompt || sec2?.passage_text || mockWritingExamDataset.task2.prompt,
      min_words: 250,
      suggested_time: 40,
    },
  };
}

export function mapToSpeakingExamData(apiData: any) {
  const sections = apiData?.sections || [];
  if (!sections.length) return null;

  const parts: SpeakingPartData[] = sections.map((sec: any, idx: number) => {
    const partNum = Math.min(3, Math.max(1, Number(sec.order_no || idx + 1))) as 1 | 2 | 3;
    const rawQs = (sec.question_groups || []).flatMap((g: any) => g.questions || []);
    const questions = rawQs.map((q: any, qIdx: number) => ({
      id: String(q.id || `p${partNum}_q${qIdx + 1}`),
      question_number: qIdx + 1,
      question: q.prompt || `Question ${qIdx + 1}`,
      audio_prompt_url: q.prompt_audio_key || undefined,
      ideas: Array.isArray(q.options)
        ? q.options.map((stepText: any, sIdx: number) => ({
            step: sIdx + 1,
            title: typeof stepText === "string" ? stepText : stepText?.title || `Step ${sIdx + 1}`,
            example: typeof stepText === "object" && stepText?.example ? stepText.example : "",
          }))
        : [],
    }));

    const fallbackPart = mockSpeakingExamDataset.parts.find((p) => p.part_number === partNum) || mockSpeakingExamDataset.parts[0];
    return {
      ...fallbackPart,
      part_number: partNum,
      title: sec.title || fallbackPart.title,
      instructions: sec.passage_text || fallbackPart.instructions,
      questions: questions.length > 0 ? questions : fallbackPart.questions,
      cue_card: partNum === 2 && questions.length > 0 ? {
        topic: questions[0].question,
        bullet_points: ["What it is", "When and where it happened", "Why it is memorable to you"],
        preparation_time_seconds: 60,
        speaking_time_seconds: 120,
        ideas: fallbackPart.cue_card?.ideas || [],
      } : fallbackPart.cue_card,
    };
  });
  return {
    ...mockSpeakingExamDataset,
    test_id: String(apiData.test_id || mockSpeakingExamDataset.test_id),
    title: apiData.title || mockSpeakingExamDataset.title,
    parts,
  };
}
