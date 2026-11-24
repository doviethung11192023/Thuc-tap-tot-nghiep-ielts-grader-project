"""Kho chiến thuật luyện đề thực chiến 3 bước cho từng dạng câu hỏi & tiêu chí IELTS."""
from typing import Any, Dict

STRATEGY_PLAYBOOKS: Dict[str, Dict[str, Any]] = {
    "true_false_not_given": {
        "title": "Chiến thuật bóc tách True / False / Not Given",
        "focus_label": "True / False / Not Given",
        "steps": [
            "Gạch chân từ khóa chỉ mức độ tuyệt đối (only, always, never, majority) để tránh bẫy suy diễn.",
            "Phân biệt rạch ròi: False là bài đọc nói NGƯỢC lại; Not Given là KHÔNG ĐỦ căn cứ khẳng định.",
            "Luyện 1 bài ngắn (Micro-Drill) không giới hạn giờ và kiểm tra dẫn chứng từng câu trước khi chọn.",
        ],
    },
    "matching": {
        "title": "Chiến thuật Matching Headings / Features",
        "focus_label": "Matching Features / Headings",
        "steps": [
            "Đọc câu chủ đề (câu đầu & câu cuối) của từng đoạn để nắm ý chính trước khi nhìn danh sách Heading.",
            "Loại trừ các câu chứa chi tiết nhỏ mang tính bẫy lặp từ khóa (Keyword Trap).",
            "Làm các đoạn ngắn rõ ý trước rồi mới dùng phương pháp loại trừ cho đoạn dài.",
        ],
    },
    "completion": {
        "title": "Chiến thuật Sentence / Summary / Note Completion",
        "focus_label": "Sentence & Summary Completion",
        "steps": [
            "Xác định trước loại từ cần điền (Danh từ số ít/nhiều, Động từ, Tính từ) dựa vào ngữ pháp quanh chỗ trống.",
            "Kiểm tra giới hạn số từ tối đa (NO MORE THAN TWO WORDS) trước khi chuyển sang câu tiếp theo.",
            "Chú ý các từ báo hiệu chuyển hướng trong Listening (however, actually, sorry I meant).",
        ],
    },
    "multiple_choice": {
        "title": "Chiến thuật Multiple Choice (MCQ) chống bẫy nhiễu",
        "focus_label": "Multiple Choice (MCQ)",
        "steps": [
            "Đọc câu dẫn trước để định vị ngữ cảnh, tránh đọc đồng thời cả 4 đáp án A/B/C/D gây nhiễu trí nhớ.",
            "Nghe/đọc hết ý vì phương án đúng thường được paraphrase (diễn đạt lại) chứ không lặp y nguyên từ.",
            "Gạch bỏ ngay các lựa chọn chứa thông tin đúng một nửa nhưng sai điều kiện thời gian/đối tượng.",
        ],
    },
    "short_answer": {
        "title": "Chiến thuật Short Answer Questions",
        "focus_label": "Short Answer",
        "steps": [
            "Xác định từ để hỏi (Who, When, How many, Why) để chốt chính xác kiểu thông tin cần trích xuất.",
            "Sao chép đúng chính tả và dạng số ít/nhiều trực tiếp từ bài đọc hoặc audio.",
            "Rà lại danh sách câu trả lời đảm bảo không vượt quá số từ quy định.",
        ],
    },
    "TA": {
        "title": "Nâng điểm Task Achievement (Writing Task 1)",
        "focus_label": "Task Achievement (TA)",
        "steps": [
            "Viết Overview 2 câu tóm tắt xu hướng lớn nhất & điểm nổi bật trước khi đi vào số liệu chi tiết.",
            "Nhóm số liệu so sánh (cao nhất, thấp nhất, cắt nhau) thay vì liệt kê cơ học theo từng năm.",
            "Gửi bài để Giảng viên (Expert Review) kiểm tra độ chính xác luận điểm và số liệu.",
        ],
    },
    "TR": {
        "title": "Nâng điểm Task Response (Writing Task 2)",
        "focus_label": "Task Response (TR)",
        "steps": [
            "Trả lời thẳng toàn bộ các vế của câu hỏi ngay tại Mở bài và duy trì lập trường nhất quán.",
            "Mỗi đoạn thân bài triển khai 1 luận điểm sâu kèm giải thích nguyên nhân + ví dụ thực tế cụ thể.",
            "Đảm bảo tối thiểu 260–280 từ để có đủ dung lượng phát triển ý trọn vẹn.",
        ],
    },
    "CC": {
        "title": "Nâng điểm Coherence & Cohesion (Writing)",
        "focus_label": "Coherence & Cohesion (CC)",
        "steps": [
            "Mở đầu mỗi đoạn thân bài bằng 1 Topic Sentence súc tích nêu rõ ý chính của cả đoạn.",
            "Thay thế liên từ máy móc (Firstly, Moreover) bằng phép quy chiếu tự nhiên (This trend, Such measures).",
            "Kiểm tra sự liên kết nhân quả giữa câu trước và câu sau bằng phản hồi chi tiết của AI/Giảng viên.",
        ],
    },
    "LR": {
        "title": "Nâng điểm Lexical Resource (Vốn từ học thuật)",
        "focus_label": "Lexical Resource (LR)",
        "steps": [
            "Tránh lặp từ khóa đề bài quá 3 lần; lập bảng từ đồng nghĩa và collocation theo chủ đề.",
            "Ưu tiên dùng từ vựng chính xác theo ngữ cảnh (collocation tự nhiên) hơn từ hiếm dễ sai nghĩa.",
            "Đọc lại phần 'Bài nâng cấp' sau khi AI chấm để ghi nhớ 5–8 cụm từ thay thế band 7.5+.",
        ],
    },
    "GRA": {
        "title": "Nâng điểm Grammatical Range & Accuracy",
        "focus_label": "Grammatical Range & Accuracy (GRA)",
        "steps": [
            "Kết hợp đa dạng câu đơn, câu ghép, mệnh đề quan hệ không xác định và câu điều kiện/bị động.",
            "Dành 3 phút cuối bài kiểm tra lỗi mạo từ (a/an/the), chia thì và hòa hợp chủ-vị.",
            "Sửa dứt điểm các lỗi ngữ pháp lặp lại nhiều lần trong phần Annotations.",
        ],
    },
    "FC": {
        "title": "Nâng điểm Fluency & Coherence (Speaking)",
        "focus_label": "Fluency & Coherence (FC)",
        "steps": [
            "Kéo dài câu trả lời theo cấu trúc PREP (Point → Reason → Example → Point) thay vì trả lời cụt.",
            "Giữ nhịp nói ổn định, dùng cụm nối tự nhiên (Well, to be honest, That's an interesting point).",
            "Hạn chế lặp từ đệm 'uhm/ah'; luyện nói 1 lượt liên tục trong Phòng thi Speaking.",
        ],
    },
    "P": {
        "title": "Nâng điểm Pronunciation (Phát âm Speaking)",
        "focus_label": "Pronunciation (P)",
        "steps": [
            "Chú ý phát âm rõ âm cuối (-s, -ed, -t, -d) và trọng âm các từ 3+ âm tiết.",
            "Ngắt nghỉ theo cụm nghĩa (chunking) và lên xuống ngữ điệu ở cuối câu kể/liệt kê.",
            "Nghe lại file ghi âm của chính mình đối chiếu với danh sách từ cần sửa phát âm.",
        ],
    },
}


def get_strategy_for_weakness(skill: str, key: str, is_diagnostic: bool = False) -> Dict[str, Any]:
    if not is_diagnostic and key in STRATEGY_PLAYBOOKS:
        return STRATEGY_PLAYBOOKS[key]
    sk_label = skill.capitalize()
    return {
        "title": f"Khởi động & Chẩn đoán năng lực {sk_label}",
        "focus_label": f"Chẩn đoán {sk_label}",
        "steps": [
            f"Hoàn thành tối thiểu 2 bài {sk_label} để hệ thống chốt band hiện tại chuẩn BR-12.",
            "Ưu tiên làm trọn vẹn không bỏ trống câu hỏi để AI/hệ thống phát hiện đúng dạng bài yếu.",
            "Xem lại phần giải thích chi tiết & dẫn chứng ngay sau khi nộp bài.",
        ],
    }
