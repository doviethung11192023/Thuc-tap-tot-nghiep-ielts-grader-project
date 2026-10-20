import json
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType, ContentStatus, AllowedMode
from app.services.importers.writing_importer import import_writing_tests, import_single_writing_test
from app.services.importers.speaking_importer import import_speaking_tests, import_single_speaking_test

DEFAULT_DATASET_ROOT = r"C:\Users\Admin\Downloads\prep_crawled_dataset\prep_crawled_dataset"

def _clean_html(raw_html: Optional[str]) -> str:
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', raw_html)
    return ' '.join(clean.split()).strip()

class DatasetImporter:
    """Import IELTS test dataset from prep_crawled_dataset into Supabase."""

    def __init__(self, root_path: Optional[str] = None, admin_id: Optional[str] = None, only_pending: bool = True, progress_callback = None):
        self.root = Path(root_path or DEFAULT_DATASET_ROOT)
        self.admin_id = admin_id
        self.only_pending = only_pending
        self.progress_callback = progress_callback
        self.stats = {
            "test_sets_created": 0,
            "tests_created": 0,
            "tests_skipped_existing": 0,
            "sections_created": 0,
            "question_groups_created": 0,
            "questions_created": 0,
            "topics_created": 0,
            "errors": []
        }

    def run(
        self,
        limit: Optional[int] = None,
        rl: bool = True,
        writing: bool = True,
        speaking: bool = True,
        selected_tests: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        try:
            if not self.admin_id:
                adm_res = supabase.table("users").select("id").eq("role", "admin").limit(1).execute()
                if adm_res.data:
                    self.admin_id = adm_res.data[0]["id"]

            test_set_id = self._get_or_create_test_set("IELTS Recent Actual Tests (Full Set)")
            if selected_tests and len(selected_tests) > 0:
                self._import_selected_tests(test_set_id, selected_tests)
            else:
                if rl:
                    self._import_reading_listening(test_set_id, limit)
                if writing:
                    import_writing_tests(self.root, self.admin_id, test_set_id, limit, self.stats, self.only_pending, self.progress_callback)
                    self._import_writing_topics(limit)
                if speaking:
                    import_speaking_tests(self.root, self.admin_id, test_set_id, limit, self.stats, self.only_pending, self.progress_callback)
        except Exception as e:
            self.stats["errors"].append(f"Global import error: {str(e)}")
        return self.stats

    def _import_selected_tests(self, test_set_id: str, selected_tests: List[Dict[str, Any]]):
        rl_ans_dir = self.root / "dap_an_loi_giai" / "listening_reading" / "445_Recent_Actual_Test"
        for item in selected_tests:
            try:
                skill_str = str(item.get("skill", "")).lower()
                p = Path(item["path"])
                if skill_str == "reading":
                    folder_name = p.parent.name
                    ans_path = rl_ans_dir / folder_name / "reading_loi_giai_chi_tiet_4_buoc.json"
                    self._process_single_exam(
                        test_set_id=test_set_id,
                        json_path=p,
                        ans_path=ans_path if ans_path.exists() else None,
                        skill=SkillType.READING,
                        default_duration=60
                    )
                elif skill_str == "listening":
                    folder_name = p.parent.name
                    ans_path = rl_ans_dir / folder_name / "listening_loi_giai_chi_tiet_4_buoc.json"
                    self._process_single_exam(
                        test_set_id=test_set_id,
                        json_path=p,
                        ans_path=ans_path if ans_path.exists() else None,
                        skill=SkillType.LISTENING,
                        default_duration=35
                    )
                elif skill_str == "writing":
                    import_single_writing_test(
                        t_dir=p.parent,
                        root_path=self.root,
                        admin_id=self.admin_id,
                        test_set_id=test_set_id,
                        stats=self.stats,
                        only_pending=self.only_pending,
                        progress_callback=self.progress_callback
                    )
                elif skill_str == "speaking":
                    import_single_speaking_test(
                        t_dir=p.parent,
                        root_path=self.root,
                        admin_id=self.admin_id,
                        test_set_id=test_set_id,
                        stats=self.stats,
                        only_pending=self.only_pending,
                        progress_callback=self.progress_callback
                    )
            except Exception as e:
                self.stats["errors"].append(f"Error importing selected test {item.get('title')}: {str(e)}")

    def _get_or_create_test_set(self, name: str) -> str:
        existing = supabase.table("test_sets").select("id").eq("name", name).execute()
        if existing.data:
            return existing.data[0]["id"]
        res = supabase.table("test_sets").insert({
            "name": name,
            "created_by": self.admin_id
        }).execute()
        self.stats["test_sets_created"] += 1
        return res.data[0]["id"]

    def _import_reading_listening(self, test_set_id: str, limit: Optional[int] = None):
        rl_dir = self.root / "de_bai" / "listening_reading" / "445_Recent_Actual_Test"
        dap_an_dir = self.root / "dap_an_loi_giai" / "listening_reading" / "445_Recent_Actual_Test"
        if not rl_dir.exists():
            self.stats["errors"].append(f"Directory not found: {rl_dir}")
            return

        test_folders = sorted([f for f in rl_dir.iterdir() if f.is_dir()])
        if limit:
            test_folders = test_folders[:limit]

        for folder in test_folders:
            folder_name = folder.name
            ans_folder = dap_an_dir / folder_name

            # 1. Reading
            reading_json = folder / "reading_de_bai.json"
            reading_ans_json = ans_folder / "reading_loi_giai_chi_tiet_4_buoc.json"
            if reading_json.exists():
                self._process_single_exam(
                    test_set_id=test_set_id,
                    json_path=reading_json,
                    ans_path=reading_ans_json if reading_ans_json.exists() else None,
                    skill=SkillType.READING,
                    default_duration=60
                )

            # 2. Listening
            listening_json = folder / "listening_de_bai.json"
            listening_ans_json = ans_folder / "listening_loi_giai_chi_tiet_4_buoc.json"
            if listening_json.exists():
                self._process_single_exam(
                    test_set_id=test_set_id,
                    json_path=listening_json,
                    ans_path=listening_ans_json if listening_ans_json.exists() else None,
                    skill=SkillType.LISTENING,
                    default_duration=35
                )

    def _process_single_exam(self, test_set_id: str, json_path: Path, ans_path: Optional[Path], skill: SkillType, default_duration: int):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            exam = raw_data.get("data", raw_data)
            title = exam.get("title") or f"{skill.value.capitalize()} Actual Test"

            # Parse explanations map
            explanations_map = {}
            if ans_path and ans_path.exists():
                with open(ans_path, "r", encoding="utf-8") as af:
                    ans_data = json.load(af)
                    for ev in ans_data.get("evidences", []):
                        qid = ev.get("question_id")
                        if qid:
                            explanations_map[str(qid)] = ev

            raw_dur = exam.get("duration", default_duration) or default_duration
            duration_min = max(1, round(raw_dur / 60)) if raw_dur > 180 else raw_dur

            # Deduplication Check
            if self.only_pending:
                existing = supabase.table("tests").select("id").eq("title", title[:280]).eq("skill", skill.value).limit(1).execute()
                if existing.data:
                    self.stats["tests_skipped_existing"] += 1
                    if self.progress_callback:
                        self.progress_callback({
                            "skill": skill.value,
                            "title": title[:280],
                            "status": "skipped",
                            "message": f"Bài thi '{title[:280]}' ({skill.value.capitalize()}) đã tồn tại, bỏ qua."
                        })
                    return

            # Insert Test
            t_res = supabase.table("tests").insert({
                "test_set_id": test_set_id,
                "title": title[:280],
                "skill": skill.value,
                "allowed_mode": AllowedMode.BOTH.value,
                "status": ContentStatus.PUBLISHED.value,
                "duration_min": duration_min,
                "origin": "manual",
                "source_name": "Cambridge IELTS Actual Tests",
                "reviewed_by": self.admin_id,
                "reviewed_at": datetime.utcnow().isoformat(),
                "created_by": self.admin_id
            }).execute()
            if not t_res.data:
                return
            test_id = t_res.data[0]["id"]
            self.stats["tests_created"] += 1
            if self.progress_callback:
                self.progress_callback({
                    "skill": skill.value,
                    "title": title[:280],
                    "status": "created",
                    "message": f"Đã nạp bài thi '{title[:280]}' ({skill.value.capitalize()})."
                })

            # Sections
            sections = exam.get("sections", [])
            for sec_idx, sec in enumerate(sections, 1):
                # Find audio URL for listening
                audio_url = None
                if skill == SkillType.LISTENING:
                    sec_text = json.dumps(sec)
                    urls = re.findall(r'https?://[^\s"\'<>]+\.(?:mp3|wav|ogg)', sec_text)
                    audio_url = urls[0] if urls else None

                sec_res = supabase.table("test_sections").insert({
                    "test_id": test_id,
                    "order_no": sec_idx,
                    "title": sec.get("title") or f"Section {sec_idx}",
                    "passage_text": sec.get("content") or sec.get("body"),
                    "audio_key": audio_url
                }).execute()
                if not sec_res.data:
                    continue
                section_id = sec_res.data[0]["id"]
                self.stats["sections_created"] += 1

                # Exercises / Question Groups
                for ex_idx, ex in enumerate(sec.get("exercises", []), 1):
                    raw_type = str(ex.get("type", "")).lower()
                    t_low = (ex.get("title") or "").lower()
                    if "true" in t_low or "false" in t_low or "not given" in t_low:
                        q_type = "true_false_not_given"
                    elif "heading" in t_low or "match" in t_low:
                        q_type = "matching"
                    elif "choice" in raw_type or "choice" in t_low:
                        q_type = "multiple_choice"
                    else:
                        q_type = "completion"

                    grp_res = supabase.table("question_groups").insert({
                        "section_id": section_id,
                        "order_no": ex_idx,
                        "question_type": q_type,
                        "instructions": _clean_html(ex.get("title") or ex.get("content"))
                    }).execute()
                    if not grp_res.data:
                        continue
                    group_id = grp_res.data[0]["id"]
                    self.stats["question_groups_created"] += 1

                    # Questions
                    for q in ex.get("questions", []):
                        raw_prompt = q.get("title") or q.get("prompt") or ""
                        q_res = supabase.table("questions").insert({
                            "group_id": group_id,
                            "number": q.get("index") or 1,
                            "prompt": _clean_html(raw_prompt),
                            "options": q.get("answers")
                        }).execute()
                        if not q_res.data:
                            continue
                        question_id = q_res.data[0]["id"]
                        self.stats["questions_created"] += 1

                        # Answer key & 4-step explanation
                        qid_str = str(q.get("id"))
                        ev_item = explanations_map.get(qid_str)
                        accepted = []
                        expl = None
                        evidence = None
                        if ev_item:
                            expl = ev_item.get("detail_explanation")
                            for ae in ev_item.get("answer_evidences", []):
                                if ae.get("is_correct") or not accepted:
                                    clean_ans = ae.get("answer_text", "").replace("A. ", "").replace("B. ", "").replace("C. ", "").replace("D. ", "").strip()
                                    if clean_ans:
                                        accepted.append(clean_ans)
                                if not evidence and ae.get("evidence_items"):
                                    evidence = ae["evidence_items"][0].get("evidence_text")
                        if not accepted:
                            accepted = ["N/A"]

                        supabase.table("question_answer_keys").insert({
                            "question_id": question_id,
                            "accepted_answers": accepted,
                            "explanation": expl,
                            "evidence": evidence
                        }).execute()

        except Exception as e:
            self.stats["errors"].append(f"Error processing {json_path.name}: {str(e)}")

    def _import_writing_topics(self, limit: Optional[int] = None):
        w_dir = self.root / "de_bai" / "writing"
        if not w_dir.exists():
            return
        w_files = list(w_dir.glob("**/*.json"))
        if limit:
            w_files = w_files[:limit * 2]

        for wf in w_files:
            try:
                with open(wf, "r", encoding="utf-8") as f:
                    d = json.load(f)
                data = d.get("data", d)
                title = data.get("title") or wf.stem.replace("_", " ").title()
                prompt = data.get("content") or data.get("prompt") or data.get("description")
                if not prompt:
                    continue
                task_type = "task1" if "task 1" in title.lower() or "task1" in wf.stem.lower() else "task2"
                supabase.table("topics").insert({
                    "title": title[:200],
                    "description": title,
                    "prompt_content": prompt,
                    "task_type": task_type,
                    "difficulty": "medium",
                    "category": "Academic",
                    "is_active": True,
                    "created_by": self.admin_id
                }).execute()
                self.stats["topics_created"] += 1
            except Exception as e:
                self.stats["errors"].append(f"Writing topic {wf.name} error: {str(e)}")
