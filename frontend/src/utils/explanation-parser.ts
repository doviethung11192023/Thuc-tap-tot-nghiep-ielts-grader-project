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

/**
 * Trích xuất câu/mục ngữ cảnh bao quanh ô trống {{qNum}} từ đoạn tóm tắt hoặc ghi chú template
 * (RD-04: Đã loại bỏ mã HTML trước khi trích xuất để tránh rò rỉ </td>, <tr>)
 */
export function extractSentenceForBlank(template?: string, qNum?: number): string {
  if (!template || !qNum) return '';

  // 1. Chuẩn hóa HTML: thay thế các thẻ đóng khối thành ngắt dòng, sau đó loại bỏ toàn bộ tag HTML
  let cleaned = template
    .replace(/<\/(?:td|th|tr|p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r\n/g, '\n');

  // 2. Phân tách theo dấu chấm câu (. ! ?), xuống dòng (\n), hoặc ký tự gạch đầu dòng (•, \u2022, \uFFFD, ;, |)
  const regex = new RegExp(`([^.!?\\n•\\uFFFD;|]*\\{\\{${qNum}\\}\\}[^.!?\\n•\\uFFFD;|]*)`, 'i');
  const match = cleaned.match(regex);
  if (!match) return '';

  let clause = match[1].trim();

  // 3. Tẩy sạch bất kỳ ký tự rác HTML còn sót lại ở hai đầu câu (như '> hoặc '<)
  clause = clause.replace(/^[>'"\s]+|[<'"\s]+$/g, '').trim();

  // 4. Tinh chỉnh nếu clause bị dính phần trước do thiếu dấu chấm
  const startPattern = new RegExp(`(?:^|[\\s])((?:A|An|The|[A-Z][a-z]+)\\s*\\{\\{${qNum}\\}\\}[^.!?•;]*)`);
  const prefixMatch = clause.match(startPattern);
  if (prefixMatch && prefixMatch[1]) {
    clause = prefixMatch[1].trim();
  }

  return clause;
}
