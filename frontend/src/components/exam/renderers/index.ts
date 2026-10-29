import { InlineFillBlankRenderer } from './InlineFillBlankRenderer';
import { SingleChoiceRenderer } from './SingleChoiceRenderer';
import { MultiSelectChoiceRenderer } from './MultiSelectChoiceRenderer';
import { TrueFalseButtonGroupRenderer } from './TrueFalseButtonGroupRenderer';
import { TableCompletionRenderer } from './TableCompletionRenderer';
import { DiagramLabellingRenderer } from './DiagramLabellingRenderer';
import { MatchingDropdownRenderer } from './MatchingDropdownRenderer';

export const QUESTION_RENDERER_REGISTRY: Record<string, React.FC<any>> = {
  // Nhóm Điền từ (Completion)
  sentence_completion: InlineFillBlankRenderer,
  note_completion: InlineFillBlankRenderer,
  form_completion: InlineFillBlankRenderer,
  summary_completion: InlineFillBlankRenderer,
  short_answer: InlineFillBlankRenderer,
  flow_chart_completion: InlineFillBlankRenderer,

  // Nhóm Bảng biểu (Table Completion - Type 34)
  table_completion: TableCompletionRenderer,
  form_table_completion: TableCompletionRenderer,

  // Nhóm Đúng / Sai / Không có thông tin (Type 21 & 22)
  true_false_not_given: TrueFalseButtonGroupRenderer,
  yes_no_not_given: TrueFalseButtonGroupRenderer,

  // Nhóm Trắc nghiệm 1 đáp án (Single Choice - Type 2)
  mcq_single: SingleChoiceRenderer,
  single_choice: SingleChoiceRenderer,

  // Nhóm Trắc nghiệm nhiều đáp án (Multi-Select - Type 4 & 8)
  multiple_choice: MultiSelectChoiceRenderer,
  multiple_choice_multi: MultiSelectChoiceRenderer,

  // Nhóm Ghép nối (Matching - Type 7)
  matching_headings: MatchingDropdownRenderer,
  matching_features: MatchingDropdownRenderer,
  matching_information: MatchingDropdownRenderer,
  matching_sentence_endings: MatchingDropdownRenderer,
  summary_with_wordlist: MatchingDropdownRenderer,

  // Nhóm Sơ đồ hình ảnh / Bản đồ (Diagram / Map Labelling - Type 35)
  diagram_labelling: DiagramLabellingRenderer,
  map_labelling: DiagramLabellingRenderer,
};

export {
  InlineFillBlankRenderer,
  SingleChoiceRenderer,
  MultiSelectChoiceRenderer,
  TrueFalseButtonGroupRenderer,
  TableCompletionRenderer,
  DiagramLabellingRenderer,
  MatchingDropdownRenderer,
};
