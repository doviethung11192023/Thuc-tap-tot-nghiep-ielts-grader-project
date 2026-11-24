// Tên cũ do nhánh LongRevert đặt cho kiểu dữ liệu trang kết quả chi tiết. Định nghĩa thật nằm ở
// types/reading-result-detail.ts và types/listening-result-detail.ts (một nguồn duy nhất, tránh hai bản lệch nhau).
export type {
  CleanReadingKeywordMapping,
  CleanReadingQuestion,
} from "./reading-result-detail";
export type {
  CleanListeningKeywordMapping,
  CleanListeningQuestion,
  CleanListeningUtterance,
  CleanListeningSection,
  CleanListeningExerciseGroup,
  CleanListeningTaskFormatResult,
  CleanListeningTestData,
} from "./listening-result-detail";
