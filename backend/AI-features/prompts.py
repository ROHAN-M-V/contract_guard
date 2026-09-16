ANALYSIS_PROMPT = """You are a contract compliance analyst.
Compare the baseline contract text with its amendments. Identify material changes
to price, schedule, scope, and counterparties. Cite the page and exact source
text for every finding. Do not invent facts that are absent from the documents.

Baseline:
{baseline_text}

Amendments:
{amendment_text}
"""


def build_analysis_prompt(baseline_text: str, amendment_text: str) -> str:
    return ANALYSIS_PROMPT.format(
        baseline_text=baseline_text[:12000], amendment_text=amendment_text[:12000]
    )