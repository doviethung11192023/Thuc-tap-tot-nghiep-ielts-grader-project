export interface ExtractedKeywordPair {
  original_text: string;
  paraphrased_text: string;
}

/**
 * Trích xuất bảng đối chiếu từ khóa (Step 1 Keywords list & Step 3/Step 4 Comparison table)
 */
export function extractKeywordsFromExplanation(explanation?: string): ExtractedKeywordPair[] {
  if (!explanation) return [];

  const results: ExtractedKeywordPair[] = [];
  const lines = explanation.split('\n');
  let inTable = false;

  // 1. Trích xuất bảng so sánh Step 3 / Step 4 (Table Mapping)
  for (const line of lines) {
    if (
      line.includes('| Clue') ||
      line.includes('| Element in statement') ||
      line.includes('| Statement phrase') ||
      line.includes('| Keyword in') ||
      line.includes('| Clue in') ||
      line.includes('| Phrase in passage') ||
      (line.includes('|') && line.toLowerCase().includes('statement') && line.toLowerCase().includes('passage'))
    ) {
      inTable = true;
      continue;
    }

    if (inTable) {
      if (line.includes('---|---')) continue;
      if (!line.trim().startsWith('|')) {
        inTable = false;
        continue;
      }

      const cols = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);

      if (cols.length >= 2) {
        const clue = cols[0].replace(/[*_"]/g, '').trim();
        const passage = cols[1].replace(/[*_"]/g, '').trim();

        if (
          clue &&
          passage &&
          !passage.toLowerCase().includes('not in passage') &&
          !passage.toLowerCase().includes('không có')
        ) {
          results.push({ original_text: passage, paraphrased_text: clue });
        }
      } else {
        inTable = false;
      }
    }
  }

  // 2. Bổ sung từ khóa dạng bullet point từ Step 1 (nếu bảng thiếu hoặc câu hỏi có bullet)
  const step1Match = explanation.match(/Keywords:\s*([\s\S]*?)(?=###|Step 2|$)/i);
  if (step1Match) {
    const bulletLines = step1Match[1].split('\n');
    for (const bl of bulletLines) {
      const cleaned = bl.replace(/^[\s•\-\*]+/, '').replace(/[*_"]/g, '').trim();
      if (cleaned && cleaned.length > 2 && !cleaned.startsWith('#')) {
        const alreadyExists = results.some(
          (r) => r.paraphrased_text.toLowerCase() === cleaned.toLowerCase()
        );
        if (!alreadyExists) {
          results.push({ original_text: cleaned, paraphrased_text: cleaned });
        }
      }
    }
  }

  return results;
}

/**
 * Trích xuất câu kết luận trọng tâm từ Step 4 (Decide the answer)
 */
export function extractCoreReasoning(explanation?: string): string {
  if (!explanation) return '';

  const answerMatch = explanation.match(/(?:✅\s*)?\*\*Answer:[^*]+\*\*\s*—\s*([^\n]+)/i);
  if (answerMatch && answerMatch[1]) {
    return answerMatch[1].trim();
  }

  const step4Match = explanation.match(/Step 4[^\n]*\n([\s\S]*?)(?=\n###|\n\n\n|$)/i);
  if (step4Match) {
    const paragraphs = step4Match[1]
      .split('\n')
      .map((p) => p.replace(/^[_*#>`\s]+|[_*>`\s]+$/g, '').trim())
      .filter((p) => p.length > 20 && !p.startsWith('✅ Decision rule'));
    if (paragraphs.length > 0) {
      return paragraphs[0];
    }
  }

  return '';
}

const stripHtmlCell = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

function extractBlankFromHtmlTable(template: string, qNum: number): string {
  const token = `{{${qNum}}}`;
  const rowMatches = template.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const rows = rowMatches.map((r) =>
    (r.match(/<(?:th|td)[^>]*>[\s\S]*?<\/(?:th|td)>/gi) || []).map((c) =>
      stripHtmlCell(c.replace(/^<(?:th|td)[^>]*>/i, '').replace(/<\/(?:th|td)>$/i, ''))
    )
  );
  if (rows.length === 0) return '';

  const headers = rows[0] || [];
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      if (!row[cIdx].includes(token)) continue;
      const lines = row[cIdx]
        .replace(/\s+-\s+/g, '\n')
        .split(/[\n•\uFFFD]+/)
        .map((s) => s.replace(/^[-*\s]+/, '').trim())
        .filter(Boolean);
      const cellLine = lines.find((l) => l.includes(token)) || row[cIdx].trim();
      const rowLabel = cIdx > 0 ? row[0]?.replace(/\s+/g, ' ').trim() : '';
      const colLabel = rIdx > 0 ? headers[cIdx]?.replace(/\s+/g, ' ').trim() : '';
      const ctx = [rowLabel, colLabel].filter(Boolean).join(' • ');
      if (!ctx) return cellLine;
      if (cellLine === token) return `${ctx}: ${cellLine}`;
      return `${ctx} — ${cellLine}`;
    }
  }
  return '';
}

/**
 * Trích xuất câu/mục ngữ cảnh bao quanh ô trống {{qNum}} từ bảng HTML hoặc template ghi chú (SYS-10).
 */
export function extractSentenceForBlank(template?: string, qNum?: number): string {
  if (!template || !qNum) return '';

  if (/<table[\s\S]*?>/i.test(template)) {
    const fromTable = extractBlankFromHtmlTable(template, qNum);
    if (fromTable) return fromTable;
  }

  const cleaned = template
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:td|th|tr|p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\s+-\s+/g, '\n');

  const regex = new RegExp(`([^.!?\\n•\\uFFFD;|]*\\{\\{${qNum}\\}\\}[^.!?\\n•\\uFFFD;|]*)`, 'i');
  const match = cleaned.match(regex);
  if (!match) return '';

  let clause = match[1].trim().replace(/^[>'"\-\s]+|[<'"\s]+$/g, '').trim();
  const startPattern = new RegExp(`(?:^|[\\s])((?:A|An|The|[A-Z][a-z]+)\\s*\\{\\{${qNum}\\}\\}[^.!?•;]*)`);
  const prefixMatch = clause.match(startPattern);
  if (prefixMatch?.[1]) {
    clause = prefixMatch[1].trim();
  }
  return clause;
}

/**
 * Fallback trích câu/mục ngữ cảnh từ Step 1 của lời giải nếu template rỗng hoặc chỉ có {{n}}.
 */
export function extractQuestionContextFromExplanation(explanation?: string): string {
  if (!explanation) return '';
  const step1 = explanation.split(/###\s*Step\s*2/i)[0] || explanation;
  const labeled = step1.match(/(?:Statement|Question|Prompt|Note|Text|Câu|Ghi chú)\s*:\s*["“]?([^\n"”]{5,})["”]?/i);
  if (labeled?.[1]) return labeled[1].trim();
  const quoted = step1.match(/>?\s*["“]([^"\n”]{6,})["”]/);
  return quoted?.[1]?.trim() || '';
}
