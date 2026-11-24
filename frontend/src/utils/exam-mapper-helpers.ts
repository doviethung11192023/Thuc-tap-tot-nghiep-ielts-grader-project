import type { QuestionGroupData, BaseQuestion } from "@/types/exam";

export interface ParsedReadingParagraph {
  id: string;
  label?: string;
  text: string;
}

const PARA_PREFIX_RE = /^(?:\[([A-H])\]|([A-H]))\s+([A-Z0-9“"'(\[][\s\S]+)$/;
const INLINE_A_HEADER_RE = /^(.{0,180}?)(?:(?<=[\s–—\-:]|[a-zA-Z0-9]))A\s+([A-Z0-9“"'(\[][\s\S]+)$/;

export function parseReadingParagraphs(
  passageText: string,
  metaParagraphs?: any[]
): ParsedReadingParagraph[] {
  if (Array.isArray(metaParagraphs) && metaParagraphs.length > 0) {
    return metaParagraphs.map((p, idx) => {
      const rawId = String(p.id || p.label || `p${idx + 1}`);
      const explicitLabel = p.label
        ? String(p.label)
        : /^[A-H]$/.test(rawId)
          ? rawId
          : undefined;
      return {
        id: explicitLabel || rawId,
        label: explicitLabel,
        text: String(p.text || p.content || ""),
      };
    });
  }
  const raw = (passageText || "").trim();
  if (!raw) return [];

  let chunks = raw.split(/\r?\n\s*\r?\n/).map((c) => c.trim()).filter(Boolean);
  if (chunks.length <= 1 && raw.includes("\n")) {
    chunks = raw.split(/\r?\n/).map((c) => c.trim()).filter(Boolean);
  }

  // Only assign a paragraph letter badge when real IELTS markers exist; never synthesize [A]/[B].
  if (chunks.length > 1) {
    return chunks.map((chunk, idx) => {
      const m = chunk.match(PARA_PREFIX_RE);
      if (m) {
        const label = m[1] || m[2];
        return { id: label, label, text: m[3].trim() };
      }
      return { id: `p${idx + 1}`, text: chunk };
    });
  }

  // Handle single-line DB passages that contain genuine inline B..H IELTS section markers.
  const inlineParts = raw
    .split(/(?<=[.!?]["'”’)]?\s)(?=[B-H]\s+[A-Z0-9“"'(\[])/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (inlineParts.length >= 2 && /^B\s+/.test(inlineParts[1])) {
    const result: ParsedReadingParagraph[] = [];
    const first = inlineParts[0];
    const mA = first.match(INLINE_A_HEADER_RE);
    if (mA) {
      const leadTitle = mA[1].trim();
      if (leadTitle.length > 2 && !leadTitle.includes(". ")) {
        result.push({ id: "intro", text: leadTitle });
      }
      result.push({ id: "A", label: "A", text: mA[2].trim() });
    } else {
      result.push({ id: "A", label: "A", text: first });
    }

    for (let i = 1; i < inlineParts.length; i++) {
      const part = inlineParts[i];
      const m = part.match(/^([B-H])\s+([\s\S]+)$/);
      if (m) {
        result.push({ id: m[1], label: m[1], text: m[2].trim() });
      } else {
        result.push({ id: `p${i + 1}`, text: part });
      }
    }
    return result;
  }

  return [{ id: "p1", text: raw }];
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
    select_count: content.select_count ?? undefined,
    max_words: content.max_words ?? undefined,
    questions,
  };
}
