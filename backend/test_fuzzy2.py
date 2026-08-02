import re

def align_annotation_coordinates(content: str, original_text: str, hint_start: int):
    if not original_text or not content:
        return hint_start, hint_start + len(original_text) if original_text else hint_start

    original_text = original_text.strip()
    
    escaped_text = re.escape(original_text)
    escaped_text = re.sub(r'\\\s+', r'\\s+', escaped_text)
    try:
        matches = list(re.finditer(escaped_text, content, re.IGNORECASE))
        if matches:
            best_match = min(matches, key=lambda m: abs(m.start() - hint_start))
            return best_match.start(), best_match.end()
    except Exception:
        pass
        
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

import json
with open(r'C:\Users\Admin\Downloads\test_final_output (2).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Mock content (I will just hardcode the known string from the DB)
content = "In contemporary society, whether the organizations should select their employees by interviewing them or there are other ways to judge their capabilities for employment. I believe that interviews has always been debatable. Even though some people think that there are better methods for employing a resource rather than interviews, I wholeheartedly believe that interview is a good method for recruiting candidates."
content = "In contemporary society, whether the organizations should select their employees by interviewing them or there are other ways to judge their capabilities for employment. I believe that interviews has always been debatable. Even though some people think that there are better methods for employing a resource rather than interviews , I wholeheartedly believe that interview is a good method for recruiting candidates. First I will discuss some arguments supporting my ideas about this statement, after which some aspects against that will be presented. On the one hand, a short session with the candidate gives a deep insight about the candidates personalitty. Because the recruiters can judge the personality traits of that employee and also the ability to think outside the box when the person is asked about any topic and he answers it in a concise and crisp manner,then the recruiter gets to know he is suitable for the job. Another key reason is that if the job profile belongs to sales and marketing then a small interaction plays a crucial role to assess the conversational skills of the candidate. On the other hand, there are people who claim that one interaction with the candidate is not enough to select them for a role. This is primarily because some introverts are not able to express themselves clearly when they are meeting someone for the first time. For example, people with autism are generally brilliant brains but due to communication barriers they suffer to pass the basic filteration criteria. Moreover, written tests and group discussions are great options to choose the right employees .For instance,when a written exam is conducted, a candidate will use their logic and mind to find the solution. All in all, when all the specific reasons and relevant examples are considered and evaluated,  I strongly  agree with the idea supporting this statement because its benefits outweigh its drawbacks."

for ann in data.get('inline_annotations', []):
    start, end = align_annotation_coordinates(content, ann['original_text'], ann['position_start'])
    sliced = content[start:end]
    print(f"Original: {repr(ann['original_text'])}")
    print(f"Sliced  : {repr(sliced)}\n")

