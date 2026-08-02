import re
import pandas as pd
from pathlib import Path
from pprint import pprint

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT/ "data"/ "Writing Task 2 Dataset"

df = pd.read_csv(DATA_DIR/ "test.csv")
#print(df.columns)

SCORE_PATTERN = r"(?<!\d)(?:[0-9](?:\.\d+)?)(?!\d)"


# for index, evaluation in enumerate(df["evaluation"]):
#     scores = re.findall(SCORE_PATTERN, str(evaluation))

#     if len(scores) < 5:
#         print("=" * 80)
#         print("Row:", index)
#         print("Scores found:", scores)
#         print("Evaluation:")
#         print(evaluation)

#Drop error row (208)
df.drop(index=208, inplace=True)
df.reset_index(drop=True, inplace=True)

def extract_specificity(evaluation: str):
    """
    Extract 4 criterion scores in the fixed order:
    TR, CC, LR, GRA, Overall.
    """
    scores = re.findall(SCORE_PATTERN, evaluation)
    tr, cc, lr, gra, o = map(float, scores[:5])

    return f"""
TR: {tr:.1f}
CC: {cc:.1f}
LR: {lr:.1f}
GRA: {gra:.1f}
Overall: {o:.1f}
"""


df["specificity"] = df["evaluation"].apply(extract_specificity)
df.to_csv(DATA_DIR / "cleaned_test.csv", index=False)

pprint(df["specificity"])


