"""Make the AI engine root (backend/app/ai) importable as top-level packages."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
