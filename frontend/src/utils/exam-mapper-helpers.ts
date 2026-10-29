import type { QuestionGroupData, BaseQuestion } from "@/types/exam";

export function parseReadingParagraphs(
  passageText: string,
  metaParagraphs?: any[]
): { id: string; text: string }[] {
  if (Array.isArray(metaParagraphs) && metaParagraphs.length > 0) {
    return metaParagraphs.map((p, idx) => ({
      id: String(p.id || p.label || String.fromCharCode(65 + idx)),
      text: String(p.text || p.content || ""),
    }));
  }
  if (!passageText) return [];
  const chunks = passageText.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);
  if (chunks.length > 1) {
    return chunks.map((chunk, idx) => {
      const m = chunk.match(/^\[([A-Z0-9]+)\]\s*([\s\S]+)$/);
      if (m) return { id: m[1], text: m[2].trim() };
      return { id: String.fromCharCode(65 + idx), text: chunk };
    });
  }
  const sentences = passageText.split(/(?<=\.)\s+(?=[A-Z])/);
  const perPara = Math.max(3, Math.ceil(sentences.length / 5));
  const paragraphs: { id: string; text: string }[] = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    const slice = sentences.slice(i, i + perPara).join(" ").trim();
    if (slice) {
      paragraphs.push({ id: String.fromCharCode(65 + paragraphs.length), text: slice });
    }
  }
  return paragraphs;
}

export function mapQuestionGroup(grp: any): QuestionGroupData {
  const content = grp.content || {};
  const uiType = content.ui_question_type || grp.question_type || "sentence_completion";
  const questions: BaseQuestion[] = (grp.questions || []).map((q: any, idx: number) => {
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const hasKeyOpts = rawOpts.length > 0 && rawOpts[0]?.key !== undefined;
    const diagCoord =
      q.diagram_coordinate ||
      (rawOpts.length > 0 && rawOpts[0]?.diagram_coordinate
        ? rawOpts[0].diagram_coordinate
        : undefined);

    const ansKeys = q.question_answer_keys || [];
    const correctAnswers =
      q.correct_answers ||
      (ansKeys.length > 0
        ? ansKeys.flatMap((k: any) => k.accepted_answers || [])
        : undefined);

    return {
      question_number: Number(q.number || idx + 1),
      prompt: q.prompt || "",
      options_pool: hasKeyOpts ? rawOpts : null,
      diagram_coordinate: diagCoord,
      correct_answers: correctAnswers,
      explanation: q.explanation || ansKeys[0]?.explanation,
      evidence_paragraph: q.evidence_paragraph,
      evidence_quote: q.evidence_quote || ansKeys[0]?.evidence,
    };
  });

  return {
    group_id: String(grp.id || `grp_${grp.order_no}`),
    question_type: uiType,
    instruction: grp.instructions || "",
    options_pool: content.options_pool || null,
    template: content.template || undefined,
    table_data: content.table_data || undefined,
    diagram_image_url: grp.image_key || content.diagram_image_url || undefined,
    questions,
  };
}
