import json
import re

def align_annotation_coordinates(content: str, original_text: str, hint_start: int):
    if not original_text or not content:
        return hint_start, hint_start + len(original_text) if original_text else hint_start

    escaped_text = re.escape(original_text.strip())
    escaped_text = re.sub(r'\\\s+', r'\\s+', escaped_text)

    try:
        matches = list(re.finditer(escaped_text, content, re.IGNORECASE))
        if not matches:
            idx = content.lower().find(original_text.strip().lower())
            if idx != -1:
                return idx, idx + len(original_text.strip())
            return hint_start, hint_start + len(original_text)
            
        best_match = min(matches, key=lambda m: abs(m.start() - hint_start))
        return best_match.start(), best_match.end()
    except Exception:
        return hint_start, hint_start + len(original_text)

with open(r'C:\Users\Admin\Downloads\test_final_output (2).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Mock essay content
# Since I don't have the exact DB content, I will extract it from the JSON if possible, or just print the matches.
for ann in data.get('inline_annotations', []):
    print(f"Original: {ann['original_text'][:30]}... Start: {ann['position_start']}")

