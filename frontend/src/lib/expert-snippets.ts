/**
 * Tiện ích quản lý Kho nhận xét mẫu của Expert (Expert Comment Snippets).
 * Lưu trữ tại client (localStorage) cho tốc độ 0ms, không phụ thuộc mạng,
 * không cần tạo bảng thứ 34 trong DB.
 */

export interface SnippetItem {
  id: string;
  category: "TA" | "TR" | "CC" | "LR" | "GRA" | "FC" | "P" | "GENERAL";
  title: string;
  content: string;
}

const STORAGE_KEY = "ielts_expert_snippets_v1";

export const DEFAULT_SNIPPETS: SnippetItem[] = [
  // Writing - TR / TA
  {
    id: "sn-tr-1",
    category: "TR",
    title: "Band 6.0: Đầy đủ ý nhưng thiếu chiều sâu",
    content: "Thí sinh đã giải quyết được các yêu cầu chính của đề bài, tuy nhiên một số luận điểm ở thân bài còn phát triển sơ sài và thiếu ví dụ thực tế minh họa."
  },
  {
    id: "sn-tr-2",
    category: "TR",
    title: "Band 7.0: Luận điểm thuyết phục, mở rộng tốt",
    content: "Mở bài và kết bài rõ ràng. Các luận điểm chính được trình bày logic, có dẫn chứng phù hợp và nhất quán trong việc thể hiện quan điểm cá nhân xuyên suốt bài viết."
  },
  {
    id: "sn-ta-1",
    category: "TA",
    title: "Task 1: Thiếu Overview tổng quan",
    content: "Bài viết liệt kê số liệu chi tiết nhưng thiếu đoạn Overview khái quát xu hướng chính (hoặc các đặc điểm nổi bật nhất của biểu đồ), khiến tiêu chí TA bị khống chế ở Band 5.0."
  },

  // Writing - CC
  {
    id: "sn-cc-1",
    category: "CC",
    title: "Band 6.0: Lạm dụng liên từ nối",
    content: "Các phương tiện liên kết câu được sử dụng nhiều nhưng đôi chỗ còn gượng ép và lặp từ nối (Furthermore, In addition, However). Cần cải thiện tính liên kết tự nhiên giữa các ý."
  },
  {
    id: "sn-cc-2",
    category: "CC",
    title: "Band 7.0: Ngắt đoạn mạch lạc, chuyển ý mượt",
    content: "Bố cục các đoạn văn được tổ chức logic, mỗi đoạn tập trung vào một chủ đề rõ ràng với câu chủ đề (topic sentence) tốt."
  },

  // Writing / Speaking - LR
  {
    id: "sn-lr-1",
    category: "LR",
    title: "Band 6.0: Vốn từ đủ dùng nhưng sai collocation",
    content: "Thí sinh cố gắng sử dụng một số từ vựng nâng cao nhưng mắc lỗi kết hợp từ (inappropriate collocations) và dùng sai ngữ cảnh học thuật."
  },
  {
    id: "sn-lr-2",
    category: "LR",
    title: "Band 7.0: Từ vựng linh hoạt, ít lỗi chính tả",
    content: "Sử dụng linh hoạt các cụm từ chủ đề (topic-specific vocabulary) và paraphrase hiệu quả các từ khóa trong câu hỏi."
  },

  // Writing / Speaking - GRA
  {
    id: "sn-gra-1",
    category: "GRA",
    title: "Band 6.0: Câu ghép tốt nhưng lỗi mạo từ/chia thì",
    content: "Có sự kết hợp giữa câu đơn và câu phức, tuy nhiên vẫn còn mắc các lỗi cơ bản về mạo từ (a/an/the), danh từ số nhiều và sự hòa hợp giữa chủ ngữ - vị ngữ."
  },
  {
    id: "sn-gra-2",
    category: "GRA",
    title: "Band 7.0: Đa dạng cấu trúc phức (mệnh đề quan hệ, đảo ngữ)",
    content: "Kiểm soát tốt các cấu trúc câu phức tạp, phần lớn các câu không mắc lỗi ngữ pháp nghiêm trọng."
  },

  // Speaking - FC & P
  {
    id: "sn-fc-1",
    category: "FC",
    title: "Band 6.0: Ngập ngừng tìm từ ngữ",
    content: "Thí sinh có khả năng duy trì câu trả lời dài nhưng thường xuyên ngập ngừng để tìm từ vựng hoặc cấu trúc câu, làm giảm tính tự nhiên của cuộc hội thoại."
  },
  {
    id: "sn-p-1",
    category: "P",
    title: "Phát âm: Nuốt âm đuôi và nối âm",
    content: "Chú ý phát âm rõ các âm cuối (/s/, /ed/, /t/) và ngữ điệu lên xuống tự nhiên khi kết thúc câu hỏi và câu trần thuật."
  }
];

export function loadExpertSnippets(): SnippetItem[] {
  if (typeof window === "undefined") return DEFAULT_SNIPPETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SNIPPETS));
      return DEFAULT_SNIPPETS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Lỗi đọc snippets từ localStorage:", e);
    return DEFAULT_SNIPPETS;
  }
}

export function saveExpertSnippet(item: Omit<SnippetItem, "id">): SnippetItem[] {
  const current = loadExpertSnippets();
  const newItem: SnippetItem = {
    ...item,
    id: `custom-${Date.now()}`
  };
  const updated = [newItem, ...current];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function deleteExpertSnippet(id: string): SnippetItem[] {
  const current = loadExpertSnippets();
  const updated = current.filter(s => s.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}
