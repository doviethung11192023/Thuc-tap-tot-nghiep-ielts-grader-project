import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.input import EssayInput
from utils.preprocessor import test_preprocess

# ── Sample ────────────────────────────────────────────────────────────────────
BAD_TEST_CASE = {
    "title": "Interview form the basic selection criteria for most large companies. However, some people think that interview is not a reliable method of choosing whom to employ and there are better methods. To what extent to you agree or disagree?",
    "essay":"""
To agree or disagree with the statement that interviews are the basic filteration criteria is an important issue. Putting the discussion in a wider context, interviews has always been debatable. Even though some people think that there are better methods for employing a resource rather than interviews , I wholeheartedly believe that interview is a good method for recruiting candidates. First I will discuss some arguments supporting my ideas about this statement, after which some aspects against that will be presented.

On the one hand, many people agree with this statement for many noteworthy reasons. The most remarkable is that the recruiters can get an idea about the personalitty and skills of the potential employees .For instance,when the person is asked about any topic and he answers it in a concise and crisp manner,then the recruiter gets to know he is suitable for the job. Another key reason is that if a candidate is asked about case studies then the recruiters can judge the personality traits of that employee and also the ability to think outside the box.

On the other hand, other people disagree with this statement for many reasons. They believe that other modes of recruiting like written tests and group discussions will help understand the mindset in a better manner.Written tests help in evaluating the technical or theoretical knowlege of a person.

Group discussions help in getting a grasp of the conversational skills that he/she possesses.For example,in sales and marketing jobs conversational skills play a major role.  

All in all, when all the specific reasons and relevant examples are considered and evaluated,  I strongly  agree with the idea supporting this statement because its benefits outweigh its drawbacks.""",
    "target_band": 7.0
}

GOOD_TEST_CASE = {
    "title": "The increase in the production of consumer consumption goods results in damage to the natural environment. What are the causes of this and what can be done to solve this problem?",
    "essay": """
It is true that the rise in consumer production has detrimental impacts on the natural environment. This essay will discuss the causes behind the environmental damage and propose potential solutions to mitigate these consequences.

There are two primary reasons why the increase in consumer goods manufacturing poses a threat to the natural environment. Firstly, the extraction of natural resources leads to devastating ecosystem disruption. Consumer goods production heavily relies on the extraction of minerals, fossil fuels, and timber, resulting in habitat destruction, deforestation, and the depletion of non-renewable resources. For example, the widespread demand for electronic devices has led to increased mining activities, contributing to ecological disruption and soil erosion. Additionally, the logging industry for furniture production has resulted in intensive deforestation, causing a loss of biodiversity. Secondly, the energy-intensive manufacturing processes and transportation used for goods delivery account for a significant portion of greenhouse gas emissions, pushing the Earth towards a climate crisis.

To tackle these consequences, several measures can be implemented. The first solution is to encourage companies to adopt sustainable sourcing practices to ensure responsible extraction of resources and minimize habitat destruction. For instance, enterprises can prioritize the use of recycled materials and promote sustainable forestry practices, such as tree replanting initiatives. Furthermore, investing in research and development of alternative materials with lower environmental impacts, such as biodegradable plastics, and renewable energy technologies can help reduce the reliance on scarce resources. The second solution involves governments offering incentives, such as providing tax deductions and implementing regulations, to encourage industries to transition to renewable energy sources, improve energy efficiency in manufacturing processes, and adopt greener approaches.

In conclusion, various measures can be taken to address the environmental issues caused by the growth of consumer goods manufacturing. To achieve better results in environmental protection in the future, companies need to be fully aware of the negative impacts and adopt appropriate sustainable practices, with oversight and support from governments. By implementing these measures, we can work towards a more sustainable future and mitigate the detrimental effects of consumer production on the natural environment.""",
    "target_band": 9.0
}
# ── Divider helpers ───────────────────────────────────────────────────────────

def _header(title: str):
    print(f"\n{'═' * 60}")
    print(f"  {title}")
    print('═' * 60)

def _section(title: str):
    print(f"\n── {title} {'─' * (55 - len(title))}")

def _stub(name: str):
    print(f"  🔲 {name} — not yet implemented (stub)")


# ── Pre-processing ────────────────────────────────────────────────────────────

_header("Pre-processing")

processed = test_preprocess(**GOOD_TEST_CASE)

_section("Stats")
print(f"  word_count  : {processed.word_count}")
print(f"  sentences   : {len(processed.sentences)}")
print(f"  paragraphs  : {len(processed.paragraphs)}")

_section("Sentences")
for s in processed.sentences:
    print(f"  [{s.index:02d}] ({s.char_start:4d}–{s.char_end:4d})  {s.text[:75]}")

_section("Paragraphs → sentence indices")
for p in processed.paragraphs:
    print(f"  [P{p.index}] sents={p.sentence_indices}  {p.text[:60]}...")


# ── D1 — Grammar / Spell Checker ─────────────────────────────────────────────

_header("D1 — Grammar / Spell Checker")

from handler.grammar_checker import check as grammar_check

findings = grammar_check(processed)

grammar  = [f for f in findings if f.error_type == "GRAMMAR"]
spelling = [f for f in findings if f.error_type == "SPELLING"]
style    = [f for f in findings if f.error_type == "STYLE"]

_section("Summary")
print(f"  Total findings : {len(findings)-len(style)}")
print(f"  GRAMMAR        : {len(grammar)}")
print(f"  SPELLING       : {len(spelling)}")

_section("GRAMMAR findings  →  GRA criterion")
if grammar:
    for f in grammar:
        word = processed.essay_raw[f.span[0]:f.span[1]]
        print(f"  [{f.span[0]:4d}:{f.span[1]:4d}]  {word!r:20s}  rule={f.rule_id}")
        print(f"            msg={f.message[:65]}")
        print(f"            fix={f.suggestions}")
else:
    print("  (none)")

_section("SPELLING findings  →  LR criterion")
if spelling:
    for f in spelling:
        word = processed.essay_raw[f.span[0]:f.span[1]]
        print(f"  [{f.span[0]:4d}:{f.span[1]:4d}]  {word!r:20s}  rule={f.rule_id}")
        print(f"            fix={f.suggestions}")
else:
    print("  (none)")


# ── D2 — Dependency Parser ────────────────────────────────────────────────────

_header("D2 — Dependency Parser")
from handler.dependency_parser import check as dep_check
dep_result = dep_check(processed)

_section("Sentence types")
for sp in dep_result.sentences:
    print(f"  [{sp.index:02d}] {sp.sentence_type:20s}  {sp.text[:60]}")

_section("Linking devices")
if dep_result.linking_devices:
    for ld in dep_result.linking_devices:
        print(f"  {ld.text!r:20s}  category={ld.category:15s}  span={ld.span}")
else:
    print("  (none)")


# ── D3 — Lexical Stats Engine ─────────────────────────────────────────────────

_header("D3 — Lexical Stats Engine")
from handler.lexical_stats import compute as lexical_compute
stats = lexical_compute(processed)
print(f"  type_token_ratio  : {stats.type_token_ratio:.3f}")
print(f"  lexical_density   : {stats.lexical_density:.3f}")
print(f"  avg_sent_length   : {stats.avg_sentence_length:.1f} words")
_section("Repeated words (≥3 occurrences)")
for r in stats.repeated_words:
    print(f"  {r.word!r:20s}  count={r.count}  spans={r.spans[:2]}")


# ── D4 — Collocation & Vocabulary Profiler ────────────────────────────────────

_header("D4 — Collocation & Vocabulary Profiler")
from handler.collocation_lookup import check as vocab_check
vocab_profile = vocab_check(processed)

_section("CEFR Advanced Words (B1-C2)")
# Group by level for cleaner output
from collections import defaultdict
cefr_grouped = defaultdict(list)
for w in vocab_profile.cefr_words:
    cefr_grouped[w.level].append(w.word)

for lvl in sorted(cefr_grouped.keys()):
    words = ", ".join(cefr_grouped[lvl])
    print(f"  [{lvl}] {words}")
if not cefr_grouped:
    print("  (none)")

_section("Academic Collocations (ACL)")
if vocab_profile.collocations:
    for c in vocab_profile.collocations:
        print(f"  {c.phrase!r:30s}  span={c.span}")
else:
    print("  (none)")

_section("Potential Polysemous Academic Words")
if vocab_profile.polysemous_words:
    for p in vocab_profile.polysemous_words:
        print(f"  {p.word!r:20s}  synsets={p.synset_count}  span={p.span}")
else:
    print("  (none)")


# ── Done ──────────────────────────────────────────────────────────────────────

print(f"\n{'═' * 60}")
print("  Run complete.")
print('═' * 60)
