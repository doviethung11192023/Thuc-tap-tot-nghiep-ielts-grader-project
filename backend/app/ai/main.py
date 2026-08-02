import asyncio
import json
import webbrowser

from schemas.input import EssayInput
from utils.preprocessor import preprocess

# Real Handlers & Services
from services.task_type_classifier import classify_task_type
from handlers.grammar_checker import check as check_grammar
from handlers.lexical_stats import compute as compute_lexical

from services.prompt_builder import build_criterion_prompts
from services.llm_evaluator import evaluate_all_criteria
from services.synthesis_service import SynthesisService
from utils.annotation_visualizer import generate_annotation_html_full

async def main():
    BAD_TEST_CASE = {
        "title": "Interview form the basic selection criteria for most large companies. However, some people think that interview is not a reliable method of choosing whom to employ and there are better methods. To what extent to you agree or disagree?",
        "essay":"""
    To agree or disagree with the statement that interviews are the basic filteration criteria is an important issue. Putting the discussion in a wider context, interviews has always been debatable. Even though some people think that there are better methods for employing a resource rather than interviews , I wholeheartedly believe that interview is a good method for recruiting candidates. First I will discuss some arguments supporting my ideas about this statement, after which some aspects against that will be presented.

    On the one hand, many people agree with this statement for many noteworthy reasons. The most remarkable is that the recruiters can get an idea about the personalitty and skills of the potential employees .For instance,when the person is asked about any topic and he answers it in a concise and crisp manner,then the recruiter gets to know he is suitable for the job. Another key reason is that if a candidate is asked about case studies then the recruiters can judge the personality traits of that employee and also the ability to think outside the box.

    On the other hand, other people disagree with this statement for many reasons. They believe that other modes of recruiting like written tests and group discussions will help understand the mindset in a better manner.Written tests help in evaluating the technical or theoretical knowlege of a person.

    Group discussions help in getting a grasp of the conversational skills that he/she possesses.For example,in sales and marketing jobs conversational skills play a major role.  

    All in all, when all the specific reasons and relevant examples are considered and evaluated,  I strongly  agree with the idea supporting this statement because its benefits outweigh its drawbacks.""",
    }

    GOOD_TEST_CASE = {
    "title": "The increase in the production of consumer consumption goods results in damage to the natural environment. What are the causes of this and what can be done to solve this problem?",
    "essay": """
    It is true that the rise in consumer production has detrimental impacts on the natural environment. This essay will discuss the causes behind the environmental damage and propose potential solutions to mitigate these consequences.

    There are two primary reasons why the increase in consumer goods manufacturing poses a threat to the natural environment. Firstly, the extraction of natural resources leads to devastating ecosystem disruption. Consumer goods production heavily relies on the extraction of minerals, fossil fuels, and timber, resulting in habitat destruction, deforestation, and the depletion of non-renewable resources. For example, the widespread demand for electronic devices has led to increased mining activities, contributing to ecological disruption and soil erosion. Additionally, the logging industry for furniture production has resulted in intensive deforestation, causing a loss of biodiversity. Secondly, the energy-intensive manufacturing processes and transportation used for goods delivery account for a significant portion of greenhouse gas emissions, pushing the Earth towards a climate crisis.

    To tackle these consequences, several measures can be implemented. The first solution is to encourage companies to adopt sustainable sourcing practices to ensure responsible extraction of resources and minimize habitat destruction. For instance, enterprises can prioritize the use of recycled materials and promote sustainable forestry practices, such as tree replanting initiatives. Furthermore, investing in research and development of alternative materials with lower environmental impacts, such as biodegradable plastics, and renewable energy technologies can help reduce the reliance on scarce resources. The second solution involves governments offering incentives, such as providing tax deductions and implementing regulations, to encourage industries to transition to renewable energy sources, improve energy efficiency in manufacturing processes, and adopt greener approaches.

    In conclusion, various measures can be taken to address the environmental issues caused by the growth of consumer goods manufacturing. To achieve better results in environmental protection in the future, companies need to be fully aware of the negative impacts and adopt appropriate sustainable practices, with oversight and support from governments. By implementing these measures, we can work towards a more sustainable future and mitigate the detrimental effects of consumer production on the natural environment.""",
    }

    testcase = BAD_TEST_CASE

    print("Phase A: Preprocessing...")
    inp = EssayInput(title=testcase["title"], essay=testcase["essay"])
    processed = preprocess(inp)

    print("Phase B: Running NLP Tools & Task Classifier...")
    print("  -> Running Task Classifier...")
    task_type_result = classify_task_type(processed.title)
    print(f"     Task Type: {task_type_result.task_type}")

    print("  -> Running D1 (Grammar/Spell Checker)...")
    grammar_findings = check_grammar(processed)
    print(f"     Found {len(grammar_findings)} grammar/spelling issues.")

    print("  -> Running D3 (Lexical Stats Engine)...")
    lex_result = compute_lexical(processed)
    print(f"     Lexical density: {lex_result.lexical_density:.3f}, TTR: {lex_result.type_token_ratio:.3f}")

    print("\nPhase C: Building Prompts (via PromptManager & Langfuse)...")
    try:
        prompts = build_criterion_prompts(
            processed=processed,
            task_type=task_type_result,
            grammar_findings=grammar_findings,
            lex_result=lex_result,
        )
    except Exception as e:
        print(f"\n[!] Langfuse Error: Could not fetch prompts. Make sure all 4 prompts (TA, CC, LR, GRA) are created and published with label 'production' on Langfuse.\nDetails: {e}")
        return

    print("\nPhase D: Running parallel evaluation for all 4 agents (TA, CC, LR, GRA)...")
    try:
        results = await evaluate_all_criteria(prompts)
        print("\n" + "="*60)
        print("🎉 ALL 4 AGENTS FINISHED SUCCESSFULLY 🎉")
        print("="*60)
        
        print(f"\n[OVERALL BAND SCORE]: {results.overall_band}")

        # Convert results to a dictionary and save as JSON
        output_data = results.model_dump()

        with open("4_llms_feedback.json", "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)

        print("\nResults saved to 4_llms_feedback.json")

        
        for criterion in ["ta", "cc", "lr", "gra"]:
            print(f"\n--- {criterion.upper()} AGENT ---")
            res = getattr(results, criterion)
            print(f"Band: {res.band}")
            print(f"Summary: {res.summary}")
            print(f"Strengths found: {len(res.strengths)}")
            print(f"Issues found: {len(res.issues)}")
            print(f"Improvements found: {len(res.improvements)}")
            
            if len(res.issues) > 0:
                print("Example Issue:")
                print(json.dumps(res.issues[0], indent=2, ensure_ascii=False))
                
    except Exception as e:
        print(f"\nError occurred during LLM evaluation: {e}")
        return

    print("\nPhase E & F: Synthesis & Rewriting...")
    try:
        synthesis_service = SynthesisService()
        final_frontend_json = await synthesis_service.synthesize_and_rewrite(
            title=testcase["title"],
            essay_raw=testcase["essay"],
            all_agent_outputs=results,
        )
        
        print("\n" + "="*60)
        print("🚀 PIPELINE END-TO-END FINISHED SUCCESSFULLY 🚀")
        print("="*60)
        
        print(f"\n[SYNTHESIZED OVERALL BAND]: {final_frontend_json['scores']['overall_band']}")
        print(f"[TOTAL INLINE ANNOTATIONS]: {len(final_frontend_json.get('inline_annotations', []))}")
        
        # Save to file for easy viewing
        with open("test_final_output.json", "w", encoding="utf-8") as f:
            json.dump(final_frontend_json, f, ensure_ascii=False, indent=2)
            
        print("\n=> Final Frontend JSON has been saved to: test_final_output.json")

        # ── Phase G: Generate HTML Visualization ──────────────────────────────
        print("\nPhase G: Generating HTML visualization...")
        html_path = generate_annotation_html_full(
            title=testcase["title"],
            essay_raw=testcase["essay"],
            final_json=final_frontend_json,
            output_path="result.html",
        )
        print(f"=> HTML report saved to: {html_path}")

        # Auto-open in default browser
        webbrowser.open(f"file://{html_path}")
        print("=> Opened result.html in browser.")
        
    except Exception as e:
        print(f"\nError occurred during Synthesis/Rewriting: {e}")

if __name__ == "__main__":
    asyncio.run(main())
