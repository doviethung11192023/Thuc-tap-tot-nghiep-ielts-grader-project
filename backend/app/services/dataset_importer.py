import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType
from app.services.dataset_path_resolver import DEFAULT_DATASET_ROOT, resolve_dataset_paths
from app.services.importers.rl_importer import process_single_rl_exam
from app.services.importers.writing_importer import import_writing_tests, import_single_writing_test
from app.services.importers.speaking_importer import import_speaking_tests, import_single_speaking_test

class DatasetImporter:
    """Import IELTS test dataset from clean dataset into Supabase."""

    def __init__(self, root_path: Optional[str] = None, admin_id: Optional[str] = None, only_pending: bool = True, progress_callback = None, default_difficulty: str = "medium"):
        self.root, self.de_bai_dir, self.dap_an_dir = resolve_dataset_paths(root_path)
        self.admin_id = admin_id
        self.only_pending = only_pending
        self.progress_callback = progress_callback
        self.default_difficulty = default_difficulty if default_difficulty in ("easy", "medium", "hard") else "medium"
        self.stats = {
            "test_sets_created": 0, "tests_created": 0, "tests_skipped_existing": 0,
            "sections_created": 0, "question_groups_created": 0, "questions_created": 0,
            "topics_created": 0, "errors": []
        }

    def _get_or_create_test_set(self, name: str) -> str:
        existing = supabase.table("test_sets").select("id").eq("name", name).limit(1).execute()
        if existing.data:
            return existing.data[0]["id"]
        res = supabase.table("test_sets").insert({"name": name, "created_by": self.admin_id}).execute()
        self.stats["test_sets_created"] += 1
        return res.data[0]["id"]

    def run(self, limit: Optional[int] = None, rl: bool = True, writing: bool = True, speaking: bool = True, selected_tests: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        try:
            if not self.admin_id:
                adm = supabase.table("users").select("id").eq("role", "admin").limit(1).execute()
                if adm.data:
                    self.admin_id = adm.data[0]["id"]

            test_set_id = self._get_or_create_test_set("IELTS Recent Actual Tests (Full Set)")
            if selected_tests:
                self._import_selected(test_set_id, selected_tests)
            else:
                if rl:
                    self._import_rl(test_set_id, limit)
                if writing:
                    import_writing_tests(self.root, self.admin_id, test_set_id, limit, self.stats, self.only_pending, self.progress_callback, self.default_difficulty)
                    self._import_topics(limit)
                if speaking:
                    import_speaking_tests(self.root, self.admin_id, test_set_id, limit, self.stats, self.only_pending, self.progress_callback, self.default_difficulty)
        except Exception as e:
            self.stats["errors"].append(f"Global import error: {str(e)}")
        return self.stats

    def _import_rl(self, test_set_id: str, limit: Optional[int] = None):
        rl_dir = self.de_bai_dir / "listening_reading" / "445_Recent_Actual_Test"
        dap_an_dir = self.dap_an_dir / "listening_reading" / "445_Recent_Actual_Test"
        if not rl_dir.exists():
            return
        folders = sorted([f for f in rl_dir.iterdir() if f.is_dir()])
        if limit:
            folders = folders[:limit]
        for folder in folders:
            r_json, l_json = folder / "reading_de_bai.json", folder / "listening_de_bai.json"
            r_ans, l_ans = dap_an_dir / folder.name / "reading_loi_giai_chi_tiet_4_buoc.json", dap_an_dir / folder.name / "listening_loi_giai_chi_tiet_4_buoc.json"
            if r_json.exists():
                process_single_rl_exam(test_set_id, r_json, r_ans if r_ans.exists() else None, SkillType.READING, 60, self.admin_id, self.stats, self.only_pending, self.progress_callback, self.default_difficulty)
            if l_json.exists():
                process_single_rl_exam(test_set_id, l_json, l_ans if l_ans.exists() else None, SkillType.LISTENING, 35, self.admin_id, self.stats, self.only_pending, self.progress_callback, self.default_difficulty)

    def _import_selected(self, test_set_id: str, selected_tests: List[Dict[str, Any]]):
        rl_ans_dir = self.dap_an_dir / "listening_reading" / "445_Recent_Actual_Test"
        for item in selected_tests:
            try:
                skill, p = str(item.get("skill", "")).lower(), Path(item["path"])
                diff = item.get("difficulty") or self.default_difficulty
                if skill in ("reading", "listening"):
                    ans_file = "reading_loi_giai_chi_tiet_4_buoc.json" if skill == "reading" else "listening_loi_giai_chi_tiet_4_buoc.json"
                    ans_path = rl_ans_dir / p.parent.name / ans_file
                    stype = SkillType.READING if skill == "reading" else SkillType.LISTENING
                    dur = 60 if skill == "reading" else 35
                    process_single_rl_exam(test_set_id, p, ans_path if ans_path.exists() else None, stype, dur, self.admin_id, self.stats, self.only_pending, self.progress_callback, diff)
                elif skill == "writing":
                    import_single_writing_test(p.parent, self.root, self.admin_id, test_set_id, self.stats, self.only_pending, self.progress_callback, diff)
                elif skill == "speaking":
                    import_single_speaking_test(p.parent, self.root, self.admin_id, test_set_id, self.stats, self.only_pending, self.progress_callback, diff)
            except Exception as e:
                self.stats["errors"].append(f"Error importing selected {item.get('title')}: {str(e)}")

    def _import_topics(self, limit: Optional[int] = None):
        w_dir = self.de_bai_dir / "writing"
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
                    "title": title[:200], "description": title, "prompt_content": prompt,
                    "task_type": task_type, "difficulty": self.default_difficulty, "category": "Academic",
                    "is_active": True, "created_by": self.admin_id
                }).execute()
                self.stats["topics_created"] += 1
            except Exception as e:
                self.stats["errors"].append(f"Topic {wf.name} error: {str(e)}")
