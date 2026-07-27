import subprocess
import os
import sys
from dotenv import load_dotenv

load_dotenv(r"E:\Thuc tap tot nghiep\ielts-grader-project\backend\.env")

env = os.environ.copy()
env["PYTHONPATH"] = r"E:\Thuc tap tot nghiep\ielts-grader-project\backend"

try:
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/e2e/", "-v"],
        cwd=r"E:\Thuc tap tot nghiep\ielts-grader-project\backend",
        env=env,
        capture_output=True,
        text=True
    )
    with open("pytest_output.txt", "w", encoding="utf-8") as f:
        f.write("RETURN CODE:\n")
        f.write(str(result.returncode))
        f.write("\n\nSTDOUT:\n")
        f.write(result.stdout)
        f.write("\n\nSTDERR:\n")
        f.write(result.stderr)
except Exception as e:
    with open("pytest_output.txt", "w", encoding="utf-8") as f:
        f.write(str(e))
