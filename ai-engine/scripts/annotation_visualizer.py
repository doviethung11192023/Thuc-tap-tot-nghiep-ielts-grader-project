import json
import os


def generate_annotation_html(
    essay_raw: str,
    annotations: list[dict],
    output_path: str = "visualizer_output.html",
):
    """
    [Legacy] Generates a simple HTML file to visualize inline annotations.
    For full output including scores, use generate_annotation_html_full().
    """
    return generate_annotation_html_full(
        title="",
        essay_raw=essay_raw,
        final_json={"inline_annotations": annotations},
        output_path=output_path,
    )


def generate_annotation_html_full(
    title: str,
    essay_raw: str,
    final_json: dict,
    output_path: str = "result.html",
) -> str:
    """
    Generates a full-featured HTML report from the grading pipeline output.

    Args:
        title:      The essay prompt/title.
        essay_raw:  The original, unmodified essay text.
        final_json: The complete JSON dict returned by SynthesisService
                    (keys: scores, criteria_analysis, inline_annotations,
                    overall_upgraded_essay, word_count).
        output_path: Path to write the HTML file.

    Returns:
        Absolute path to the generated HTML file.
    """
    annotations: list[dict] = final_json.get("inline_annotations", [])
    scores: dict = final_json.get("scores", {})
    criteria_analysis: dict = final_json.get("criteria_analysis", {})
    upgraded_essay: str = final_json.get("overall_upgraded_essay", "")
    word_count: int = final_json.get("word_count", 0)

    # ── Build annotated essay HTML (back-to-front to preserve indices) ──────────
    color_map = {
        "error":       "#ff6b6b",
        "upgrade":     "#4dabf7",
        "logic_issue": "#ffd43b",
        "strength":    "#69db7c",
    }
    bg_map = {
        "error":       "rgba(255,107,107,0.18)",
        "upgrade":     "rgba(77,171,247,0.18)",
        "logic_issue": "rgba(255,212,59,0.22)",
        "strength":    "rgba(105,219,124,0.18)",
    }

    sorted_annos = sorted(
        annotations,
        key=lambda x: x.get("position_start", 0),
        reverse=True,
    )

    essay_html = essay_raw
    for anno in sorted_annos:
        start = anno.get("position_start")
        end = anno.get("position_end")
        if start is None or end is None:
            continue

        anno_type = anno.get("type", "error")
        underline_color = color_map.get(anno_type, "#aaa")
        bg_color = bg_map.get(anno_type, "rgba(200,200,200,0.2)")

        anno_id = anno.get("id", "")
        title_text = anno.get("title", "No Title")
        explanation = anno.get("explanation", "").replace('"', "&quot;").replace("'", "&#39;")
        category = anno.get("category", "")
        corrected = anno.get("corrected_text", "")
        recommendation = anno.get("recommendation", "").replace('"', "&quot;").replace("'", "&#39;")

        actual_text = essay_html[start:end]

        # Tooltip data stored as data-* attrs, rendered via JS popup
        span_html = (
            f'<span class="anno anno-{anno_type}" '
            f'data-id="{anno_id}" '
            f'data-type="{anno_type.upper()}" '
            f'data-category="{category}" '
            f'data-title="{title_text}" '
            f'data-explanation="{explanation}" '
            f'data-corrected="{corrected}" '
            f'data-recommendation="{recommendation}" '
            f'style="background:{bg_color};border-bottom:2px solid {underline_color};border-radius:3px;padding:0 1px;cursor:pointer;"'
            f'>{actual_text}</span>'
        )
        essay_html = essay_html[:start] + span_html + essay_html[end:]

    essay_html = essay_html.replace("\n", "<br>\n")

    # ── Scores section ──────────────────────────────────────────────────────────
    overall = scores.get("overall_band", "N/A")
    ta_score  = scores.get("task_response", "N/A")
    cc_score  = scores.get("coherence_cohesion", "N/A")
    lr_score  = scores.get("lexical_resource", "N/A")
    gra_score = scores.get("grammatical_range_and_accuracy", "N/A")

    def band_color(band):
        try:
            b = float(band)
            if b >= 7.0:
                return "#69db7c"
            elif b >= 6.0:
                return "#ffd43b"
            else:
                return "#ff6b6b"
        except Exception:
            return "#adb5bd"

    score_cards = ""
    for label, key, val in [
        ("Task Response", "task_response", ta_score),
        ("Coherence & Cohesion", "coherence_cohesion", cc_score),
        ("Lexical Resource", "lexical_resource", lr_score),
        ("Grammatical Range", "grammatical_range_and_accuracy", gra_score),
    ]:
        c = band_color(val)
        score_cards += f"""
        <div class="score-card">
            <div class="score-value" style="color:{c}">{val}</div>
            <div class="score-label">{label}</div>
        </div>"""

    # ── Criteria analysis accordion ──────────────────────────────────────────────
    criterion_map = {
        "task_response":                 ("TR", "Task Response"),
        "coherence_cohesion":            ("CC", "Coherence & Cohesion"),
        "lexical_resource":              ("LR", "Lexical Resource"),
        "grammatical_range_and_accuracy": ("GRA", "Grammatical Range & Accuracy"),
    }
    accordion_html = ""
    for key, (abbr, full_name) in criterion_map.items():
        crit = criteria_analysis.get(key, {})
        if not crit:
            continue
        sub_criteria = crit.get("sub_criteria", {})
        feedback = crit.get("feedback", {})
        strengths = feedback.get("strengths", [])
        areas = feedback.get("areas_to_improve", [])

        sub_rows = "".join(
            f'<tr><td class="sub-key">{k.replace("_", " ").title()}</td>'
            f'<td class="sub-val">{v}</td></tr>'
            for k, v in sub_criteria.items()
        )
        strengths_li = "".join(f"<li>✅ {s}</li>" for s in strengths)
        areas_li = "".join(f"<li>⚠️ {a}</li>" for a in areas)

        accordion_html += f"""
        <details class="criterion-block">
            <summary><span class="abbr-tag">{abbr}</span> {full_name}
                <span class="band-inline" style="color:{band_color(scores.get(key,'N/A'))}">{scores.get(key,'N/A')}</span>
            </summary>
            <div class="criterion-body">
                <table class="sub-table">{sub_rows}</table>
                <div class="feedback-row">
                    <ul class="fb-list strengths">{strengths_li}</ul>
                    <ul class="fb-list areas">{areas_li}</ul>
                </div>
            </div>
        </details>"""

    # ── Annotation count badges ──────────────────────────────────────────────────
    counts = {}
    for a in annotations:
        t = a.get("type", "other")
        counts[t] = counts.get(t, 0) + 1

    badges_html = ""
    badge_labels = {
        "error": ("🔴", "Errors"),
        "upgrade": ("🔵", "Upgrades"),
        "logic_issue": ("🟡", "Logic Issues"),
        "strength": ("🟢", "Strengths"),
    }
    for t, (emoji, label) in badge_labels.items():
        n = counts.get(t, 0)
        badges_html += f'<span class="badge badge-{t}">{emoji} {n} {label}</span>'

    # ── Upgraded essay HTML ──────────────────────────────────────────────────────
    upgraded_html = upgraded_essay.replace("\n", "<br>\n") if upgraded_essay else "<em>Not available</em>"

    # ── Full HTML ────────────────────────────────────────────────────────────────
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IELTS Grader — Result</title>
    <style>
        *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

        :root {{
            --bg:       #0f1117;
            --surface:  #1a1d27;
            --surface2: #22263a;
            --border:   #2e3250;
            --text:     #e2e8f0;
            --muted:    #8892a4;
            --accent:   #6c63ff;
            --radius:   12px;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 32px 16px 80px;
        }}

        /* ── Header ── */
        .header {{
            max-width: 960px;
            margin: 0 auto 32px;
        }}
        .header h1 {{
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #6c63ff, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }}
        .prompt-box {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 16px 20px;
            font-size: 0.95rem;
            color: var(--muted);
            line-height: 1.6;
        }}
        .meta-row {{
            display: flex;
            gap: 12px;
            margin-top: 10px;
            font-size: 0.82rem;
            color: var(--muted);
        }}

        /* ── Score dashboard ── */
        .score-dashboard {{
            max-width: 960px;
            margin: 0 auto 28px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
        }}
        .overall-band {{
            text-align: center;
            margin-bottom: 20px;
        }}
        .overall-band .band-num {{
            font-size: 4rem;
            font-weight: 800;
            background: linear-gradient(135deg, #6c63ff, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }}
        .overall-band .band-label {{
            font-size: 0.9rem;
            color: var(--muted);
            margin-top: 4px;
        }}
        .score-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
        }}
        .score-card {{
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px;
            text-align: center;
        }}
        .score-value {{
            font-size: 2rem;
            font-weight: 700;
        }}
        .score-label {{
            font-size: 0.78rem;
            color: var(--muted);
            margin-top: 4px;
        }}

        /* ── Tabs ── */
        .tabs-wrapper {{
            max-width: 960px;
            margin: 0 auto;
        }}
        .tab-bar {{
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 20px;
        }}
        .tab-btn {{
            padding: 10px 20px;
            border: none;
            background: none;
            color: var(--muted);
            cursor: pointer;
            font-size: 0.9rem;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }}
        .tab-btn:hover {{ color: var(--text); }}
        .tab-btn.active {{
            color: var(--accent);
            border-bottom-color: var(--accent);
            font-weight: 600;
        }}
        .tab-panel {{ display: none; }}
        .tab-panel.active {{ display: block; }}

        /* ── Essay panel ── */
        .badges-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
        }}
        .badge {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 600;
        }}
        .badge-error       {{ background: rgba(255,107,107,0.15); color: #ff8787; border: 1px solid rgba(255,107,107,0.3); }}
        .badge-upgrade     {{ background: rgba(77,171,247,0.15);  color: #74c0fc; border: 1px solid rgba(77,171,247,0.3); }}
        .badge-logic_issue {{ background: rgba(255,212,59,0.15);  color: #ffd43b; border: 1px solid rgba(255,212,59,0.3); }}
        .badge-strength    {{ background: rgba(105,219,124,0.15); color: #69db7c; border: 1px solid rgba(105,219,124,0.3); }}

        .essay-box {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 28px 32px;
            font-size: 1.05rem;
            line-height: 1.9;
        }}

        /* ── Annotation tooltip ── */
        .anno {{ position: relative; }}
        .tooltip-popup {{
            display: none;
            position: fixed;
            z-index: 9999;
            background: #1e2235;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px 16px;
            max-width: 380px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            font-size: 0.85rem;
            line-height: 1.6;
        }}
        .tooltip-popup.visible {{ display: block; }}
        .tip-type {{
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
        }}
        .tip-title {{ font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; }}
        .tip-section {{ margin-top: 8px; }}
        .tip-section-label {{ font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }}
        .tip-corrected {{ color: #69db7c; font-style: italic; margin-top: 2px; }}

        /* ── Criteria accordion ── */
        .criterion-block {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            margin-bottom: 10px;
            overflow: hidden;
        }}
        .criterion-block summary {{
            padding: 16px 20px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            list-style: none;
            user-select: none;
        }}
        .criterion-block summary::-webkit-details-marker {{ display: none; }}
        .criterion-block[open] summary {{ border-bottom: 1px solid var(--border); }}
        .abbr-tag {{
            background: var(--accent);
            color: #fff;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 20px;
        }}
        .band-inline {{
            margin-left: auto;
            font-size: 1.2rem;
            font-weight: 800;
        }}
        .criterion-body {{
            padding: 20px;
        }}
        .sub-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 0.87rem;
        }}
        .sub-table tr {{ border-bottom: 1px solid var(--border); }}
        .sub-table tr:last-child {{ border-bottom: none; }}
        .sub-key {{
            padding: 10px 8px;
            color: var(--muted);
            white-space: nowrap;
            width: 220px;
            vertical-align: top;
            font-weight: 500;
        }}
        .sub-val {{ padding: 10px 8px; line-height: 1.6; }}
        .feedback-row {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }}
        .fb-list {{
            list-style: none;
            font-size: 0.87rem;
            line-height: 1.7;
        }}
        .fb-list.strengths {{ color: #69db7c; }}
        .fb-list.areas {{ color: #ff8787; }}

        /* ── Legend ── */
        .legend {{
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: var(--muted);
        }}
        .legend-dot {{
            width: 12px; height: 12px;
            border-radius: 50%;
        }}

        @media (max-width: 600px) {{
            .feedback-row {{ grid-template-columns: 1fr; }}
            .essay-box {{ padding: 16px; }}
        }}
    </style>
</head>
<body>

<!-- ── Header ── -->
<div class="header">
    <h1>🎓 IELTS Grader — Result</h1>
    <div class="prompt-box">
        <strong>Prompt:</strong> {title if title else "<em>No title provided</em>"}
    </div>
    <div class="meta-row">
        <span>📝 Word count: <strong>{word_count}</strong></span>
        <span>📌 Annotations: <strong>{len(annotations)}</strong></span>
    </div>
</div>

<!-- ── Score Dashboard ── -->
<div class="score-dashboard">
    <div class="overall-band">
        <div class="band-num">{overall}</div>
        <div class="band-label">Overall Band Score</div>
    </div>
    <div class="score-grid">
        {score_cards}
    </div>
</div>

<!-- ── Tabs ── -->
<div class="tabs-wrapper">
    <div class="tab-bar">
        <button class="tab-btn active" onclick="switchTab('essay', this)">📄 Annotated Essay</button>
        <button class="tab-btn" onclick="switchTab('criteria', this)">📊 Criteria Analysis</button>
        <button class="tab-btn" onclick="switchTab('upgraded', this)">✨ Upgraded Essay</button>
    </div>

    <!-- Tab: Annotated Essay -->
    <div id="tab-essay" class="tab-panel active">
        <div class="badges-row">{badges_html}</div>
        <div class="legend">
            <div class="legend-item"><div class="legend-dot" style="background:#ff6b6b"></div>Error</div>
            <div class="legend-item"><div class="legend-dot" style="background:#4dabf7"></div>Upgrade</div>
            <div class="legend-item"><div class="legend-dot" style="background:#ffd43b"></div>Logic Issue</div>
            <div class="legend-item"><div class="legend-dot" style="background:#69db7c"></div>Strength</div>
        </div>
        <div class="essay-box">{essay_html}</div>
    </div>

    <!-- Tab: Criteria Analysis -->
    <div id="tab-criteria" class="tab-panel">
        {accordion_html}
    </div>

    <!-- Tab: Upgraded Essay -->
    <div id="tab-upgraded" class="tab-panel">
        <div class="essay-box">{upgraded_html}</div>
    </div>
</div>

<!-- ── Tooltip Popup ── -->
<div id="tooltip-popup" class="tooltip-popup">
    <div class="tip-type" id="tip-type"></div>
    <div class="tip-title" id="tip-title"></div>
    <div id="tip-explanation"></div>
    <div class="tip-section" id="tip-corrected-wrap" style="display:none">
        <div class="tip-section-label">Suggestion</div>
        <div class="tip-corrected" id="tip-corrected"></div>
    </div>
    <div class="tip-section" id="tip-recommendation-wrap" style="display:none">
        <div class="tip-section-label">Recommendation</div>
        <div id="tip-recommendation"></div>
    </div>
</div>

<script>
    // ── Tab switching ──────────────────────────────────────────────────────────
    function switchTab(name, btn) {{
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
        btn.classList.add('active');
    }}

    // ── Tooltip ───────────────────────────────────────────────────────────────
    const popup = document.getElementById('tooltip-popup');
    const typeColors = {{
        ERROR:       '#ff8787',
        UPGRADE:     '#74c0fc',
        LOGIC_ISSUE: '#ffd43b',
        STRENGTH:    '#69db7c',
    }};

    document.querySelectorAll('.anno').forEach(el => {{
        el.addEventListener('click', (e) => {{
            e.stopPropagation();
            const t = el.dataset;
            document.getElementById('tip-type').textContent = t.type + ' · ' + t.category;
            document.getElementById('tip-type').style.color = typeColors[t.type] || '#aaa';
            document.getElementById('tip-title').textContent = t.title;
            document.getElementById('tip-explanation').textContent = t.explanation;

            const correctedWrap = document.getElementById('tip-corrected-wrap');
            const corrected = document.getElementById('tip-corrected');
            if (t.corrected) {{
                corrected.textContent = '→ ' + t.corrected;
                correctedWrap.style.display = 'block';
            }} else {{
                correctedWrap.style.display = 'none';
            }}

            const recWrap = document.getElementById('tip-recommendation-wrap');
            const rec = document.getElementById('tip-recommendation');
            if (t.recommendation) {{
                rec.textContent = t.recommendation;
                recWrap.style.display = 'block';
            }} else {{
                recWrap.style.display = 'none';
            }}

            // Position near click
            const margin = 12;
            let x = e.clientX + margin;
            let y = e.clientY + margin;
            popup.style.left = x + 'px';
            popup.style.top = y + 'px';
            popup.classList.add('visible');

            // Adjust if overflows viewport
            const rect = popup.getBoundingClientRect();
            if (rect.right > window.innerWidth - 8)  popup.style.left = (e.clientX - rect.width - margin) + 'px';
            if (rect.bottom > window.innerHeight - 8) popup.style.top  = (e.clientY - rect.height - margin) + 'px';
        }});
    }});

    document.addEventListener('click', () => popup.classList.remove('visible'));
</script>
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    return os.path.abspath(output_path)


if __name__ == "__main__":
    # Quick smoke-test with dummy data
    sample_essay = "The goverment should provide free education for everyone. Many peoples believe this is important."
    sample_annos = [
        {
            "position_start": 4,
            "position_end": 13,
            "type": "error",
            "title": "Spelling mistake",
            "explanation": "'goverment' is spelled incorrectly.",
            "original_text": "goverment",
            "corrected_text": "government",
            "recommendation": "Always proofread before submitting.",
            "id": "test-1",
            "category": "GRA",
        },
    ]
    out = generate_annotation_html_full(
        title="Test prompt",
        essay_raw=sample_essay,
        final_json={"inline_annotations": sample_annos, "scores": {}, "word_count": 17},
        output_path="test_visualization.html",
    )
    print(f"Generated: {out}")
