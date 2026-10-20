import { InlineFillBlankRenderer } from './InlineFillBlankRenderer';
import { SingleChoiceRenderer } from './SingleChoiceRenderer';
import { DiagramLabellingRenderer } from './DiagramLabellingRenderer';
import { MatchingDropdownRenderer } from './MatchingDropdownRenderer';

export const QUESTION_RENDERER_REGISTRY: Record<string, React.FC<any>> = {
  // Nhóm Điền từ
  sentence_completion: InlineFillBlankRenderer,
  note_completion: InlineFillBlankRenderer,
  form_completion: InlineFillBlankRenderer,
  table_completion: InlineFillBlankRenderer,
  summary_completion: InlineFillBlankRenderer,
  short_answer: InlineFillBlankRenderer,
  flow_chart_completion: InlineFillBlankRenderer,

  // Nhóm Chọn 1
  true_false_not_given: SingleChoiceRenderer,
  yes_no_not_given: SingleChoiceRenderer,
  mcq_single: SingleChoiceRenderer,
  single_choice: SingleChoiceRenderer,
  multiple_choice: SingleChoiceRenderer,

  // Nhóm Ghép nối
  matching_headings: MatchingDropdownRenderer,
  matching_features: MatchingDropdownRenderer,
  matching_information: MatchingDropdownRenderer,
  matching_sentence_endings: MatchingDropdownRenderer,
  summary_with_wordlist: MatchingDropdownRenderer,

  // Nhóm Sơ đồ hình ảnh
  diagram_labelling: DiagramLabellingRenderer,
};
