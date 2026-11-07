"""
Layer 4, comparison: what the learner meant (canonical phonemes) against what the audio contains
(phonemes heard by a recognizer with no language model).

Needleman-Wunsch alignment turns the two sequences into per-word matches, substitutions and
deletions. Differences that only reflect accent or transcription convention are merged first,
because IELTS does not penalise accent.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

_MATCH, _SUBSTITUTE, _GAP = 2, -1, -1

# Same sound under different symbols, or an accent difference that does not hurt intelligibility.
_EQUIVALENT = {
    "ɐ": "ʌ", "ɜː": "ɚ", "ɜ": "ɚ", "ᵻ": "ɪ", "ɾ": "t", "r": "ɹ", "ɡ": "g", "iː": "i", "uː": "u",
    "ɑː": "ɑ", "ɔː": "ɔ", "ɛ": "e", "oː": "oʊ",
}
_VOWEL_MARKS = set("aeiouɑɐɒæɔəɘɚɛɜɪɨʊʌᵻ")
THETA_STOPPING = {("θ", "t"), ("θ", "s"), ("ð", "d"), ("ð", "z")}


def merge_equivalents(phone: str) -> str:
    return _EQUIVALENT.get(phone, phone)


def is_consonant(phone: str) -> bool:
    return not any(mark in phone for mark in _VOWEL_MARKS)


@dataclass(frozen=True)
class WordPhones:
    word: str
    phones: tuple[str, ...]
    is_content_word: bool = True


@dataclass
class WordResult:
    word: str
    phones: int
    correct: int
    substitutions: list[tuple[str, str]]
    deletions: list[str]
    final_consonant_deleted: bool
    is_content_word: bool

    @property
    def accuracy(self) -> float:
        return self.correct / self.phones if self.phones else 1.0


@dataclass(frozen=True)
class ComparisonSummary:
    phoneme_accuracy: float         # weighted towards content words
    clear_word_ratio: float         # share of content words mostly matched: intelligibility proxy
    insertion_ratio: float
    final_consonant_deletions: int
    th_substitutions: int
    word_count: int

    def as_metrics(self) -> dict[str, float]:
        return {name: round(float(value), 3) for name, value in asdict(self).items()}


def align(canonical: list[str], heard: list[str]) -> list[tuple[int | None, int | None]]:
    """Global alignment. Pairs are (canonical index, heard index); None marks a gap."""
    rows, cols = len(canonical) + 1, len(heard) + 1
    scores = [[0] * cols for _ in range(rows)]
    for i in range(1, rows):
        scores[i][0] = i * _GAP
    for j in range(1, cols):
        scores[0][j] = j * _GAP
    for i in range(1, rows):
        for j in range(1, cols):
            pair = _MATCH if canonical[i - 1] == heard[j - 1] else _SUBSTITUTE
            scores[i][j] = max(scores[i - 1][j - 1] + pair, scores[i - 1][j] + _GAP, scores[i][j - 1] + _GAP)

    pairs: list[tuple[int | None, int | None]] = []
    i, j = rows - 1, cols - 1
    while i > 0 or j > 0:
        pair = _MATCH if i and j and canonical[i - 1] == heard[j - 1] else _SUBSTITUTE
        if i and j and scores[i][j] == scores[i - 1][j - 1] + pair:
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i and scores[i][j] == scores[i - 1][j] + _GAP:
            pairs.append((i - 1, None))
            i -= 1
        else:
            pairs.append((None, j - 1))
            j -= 1
    pairs.reverse()
    return pairs


def compare_words(words: list[WordPhones], heard_phones: list[str]) -> tuple[list[WordResult], int]:
    """Per-word results, plus the number of heard phonemes that match nothing intended."""
    canonical = [merge_equivalents(p) for word in words for p in word.phones]
    owner = [index for index, word in enumerate(words) for _ in word.phones]
    heard = [merge_equivalents(p) for p in heard_phones]
    results = [WordResult(w.word, len(w.phones), 0, [], [], False, w.is_content_word) for w in words]
    last_of_word = {i: pos for pos, i in enumerate(owner)}
    insertions = 0

    for c_index, h_index in align(canonical, heard):
        if c_index is None:
            insertions += 1
            continue
        result = results[owner[c_index]]
        phone = canonical[c_index]
        if h_index is None:
            result.deletions.append(phone)
            if c_index == last_of_word[owner[c_index]] and is_consonant(phone):
                result.final_consonant_deleted = True
        elif heard[h_index] == phone:
            result.correct += 1
        else:
            result.substitutions.append((phone, heard[h_index]))
    return results, insertions


def summarize(results: list[WordResult], insertions: int, function_word_weight: float = 0.3) -> ComparisonSummary:
    """Function words are naturally reduced in fluent speech, so they count for less."""
    measured = [r for r in results if r.phones]
    if not measured:
        return ComparisonSummary(0.0, 0.0, 0.0, 0, 0, 0)
    weights = [1.0 if r.is_content_word else function_word_weight for r in measured]
    total = sum(w * r.phones for w, r in zip(weights, measured))
    correct = sum(w * r.correct for w, r in zip(weights, measured))
    content = [r for r in measured if r.is_content_word] or measured
    return ComparisonSummary(
        phoneme_accuracy=correct / total,
        clear_word_ratio=sum(1 for r in content if r.accuracy >= 0.6) / len(content),
        insertion_ratio=insertions / sum(r.phones for r in measured),
        final_consonant_deletions=sum(1 for r in content if r.final_consonant_deleted),
        th_substitutions=sum(1 for r in measured for pair in r.substitutions if pair in THETA_STOPPING),
        word_count=len(measured),
    )


def likely_mispronounced(results: list[WordResult], limit: int = 15) -> list[dict]:
    """Candidates for the report. These are possibilities, so the UI must say 'có thể', not assert an error."""
    weak = [r for r in results if r.is_content_word and r.phones >= 3 and r.accuracy < 0.6]
    weak.sort(key=lambda r: r.accuracy)
    return [{"word": r.word, "accuracy": round(r.accuracy, 2),
             "substitutions": [f"{a}→{b}" for a, b in r.substitutions], "missing": r.deletions}
            for r in weak[:limit]]
