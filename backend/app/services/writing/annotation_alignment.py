"""Căn lại vị trí ký tự của annotation AI trong bài viết (AI hay lệch offset)."""
import re


def align_annotation_coordinates(content: str, original_text: str, hint_start: int):
    """
    Fuzzy anchoring: Tìm tọa độ chính xác của original_text trong content dựa vào hint_start.
    """
    if not original_text or not content:
        return hint_start, hint_start + len(original_text) if original_text else hint_start
    original_text = original_text.strip()
    
    # 1. Try exact/regex match first
    escaped_text = re.escape(original_text)
    escaped_text = re.sub(r'\\\s+', r'\\s+', escaped_text)
    try:
        matches = list(re.finditer(escaped_text, content, re.IGNORECASE))
        if matches:
            best_match = min(matches, key=lambda m: abs(m.start() - hint_start))
            return best_match.start(), best_match.end()
    except Exception:
        pass
        
    # 2. Fallback: Search for the prefix and suffix of original_text around hint_start
    prefix = original_text[:20].strip()
    suffix = original_text[-20:].strip()
    
    window_start = max(0, hint_start - 50)
    window_end = min(len(content), hint_start + 100)
    
    real_start = hint_start
    prefix_idx = content.lower().find(prefix.lower(), window_start, window_end)
    if prefix_idx != -1:
        real_start = prefix_idx
    
    real_end = hint_start + len(original_text)
    expected_end = real_start + len(original_text)
    window_end_start = max(real_start, expected_end - 50)
    window_end_end = min(len(content), expected_end + 50)
    
    suffix_idx = content.lower().find(suffix.lower(), window_end_start, window_end_end)
    if suffix_idx != -1:
        real_end = suffix_idx + len(suffix)
        
    return real_start, real_end
