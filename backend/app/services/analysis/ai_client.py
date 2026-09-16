import abc
import importlib
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.analysis import (
    ContractAnalysisResult,
    DriftResult,
    RiskResult,
    ChangeAnalysisItem,
    TimelineItem,
)
from app.schemas.evidence import EvidenceItem
from app.schemas.risk import RiskFactor
from app.services.storage.storage_service import STORAGE_LOCAL_DIR


def _run_document_ai(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Run the local AI pipeline without requiring heavyweight imports at startup."""
    backend_dir = str(Path(__file__).resolve().parents[3])
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    pipeline = importlib.import_module("AI-features.pipeline")
    return pipeline.analyze_documents(documents, STORAGE_LOCAL_DIR)


class AIAnalysisClient(abc.ABC):
    @abc.abstractmethod
    async def analyze_contract(
        self,
        contract_id: str,
        documents: List[Dict[str, Any]],
        contract_metadata: Optional[Dict[str, Any]] = None,
    ) -> ContractAnalysisResult:
        """Analyze contract documents and return post-award compliance signals."""
        pass


class MockAIAnalysisClient(AIAnalysisClient):
    """Deterministic synthetic AI client for development, testing, and offline execution."""

    async def analyze_contract(
        self,
        contract_id: str,
        documents: List[Dict[str, Any]],
        contract_metadata: Optional[Dict[str, Any]] = None,
    ) -> ContractAnalysisResult:
        logger.info(f"[MockAIAnalysisClient] Generating synthetic analysis for contract {contract_id}")

        # Check if this is the flagship demo contract PWD-2026-014
        contract_number = (contract_metadata or {}).get("contract_number", "")
        if contract_id == "PWD-2026-014" or contract_number == "PWD-2026-014" or "PWD-2026-014" in str(contract_id):
            return self._generate_pwd_2026_014_result(contract_id)

        # Dynamic synthetic analysis for any uploaded contract
        return self._generate_dynamic_mock_result(contract_id, documents, contract_metadata)

    def _generate_pwd_2026_014_result(self, contract_id: str) -> ContractAnalysisResult:
        evidence_list = [
            EvidenceItem(
                document_id="doc-base-1",
                filename="contract.pdf",
                page=12,
                source_text="Clause 4.1: Total contract price is fixed at INR 10,00,00,000 (Ten Crores only) inclusive of all applicable taxes.",
                original_value="INR 10,00,00,000",
                new_value=None,
                field="contract_value",
                change_type="BASELINE_AWARD",
            ),
            EvidenceItem(
                document_id="doc-amd-4",
                filename="amendment_4.pdf",
                page=4,
                source_text="Addendum B: Revised aggregate contract price approved at INR 14,10,00,000 (Fourteen Crores Ten Lakhs) due to cumulative expansion of civil specifications.",
                original_value="INR 10,00,00,000",
                new_value="INR 14,10,00,000",
                field="contract_value",
                change_type="CUMULATIVE_INCREASE",
            ),
            EvidenceItem(
                document_id="doc-amd-2",
                filename="amendment_2.pdf",
                page=3,
                source_text="Section 2: Extended completion milestone from December 31, 2026 to August 31, 2027 (243 days cumulative delay) due to environmental clearance backlog.",
                original_value="2026-12-31",
                new_value="2027-08-31",
                field="completion_date",
                change_type="SCHEDULE_SLIP",
            ),
            EvidenceItem(
                document_id="doc-amd-3",
                filename="amendment_3.pdf",
                page=2,
                source_text="Article 7: Novation of tier-1 civil engineering execution to DEF Construction Pvt Ltd from original sub-entity XYZ Engineering.",
                original_value="XYZ Engineering",
                new_value="DEF Construction",
                field="subcontractor",
                change_type="ENTITY_NOVATION",
            ),
        ]

        changes = [
            ChangeAnalysisItem(
                field="contract_value",
                old_value=100000000.0,
                new_value=141000000.0,
                absolute_change=41000000.0,
                percentage_change=41.0,
                severity="HIGH",
                evidence=[evidence_list[0], evidence_list[1]],
            ),
            ChangeAnalysisItem(
                field="completion_date",
                old_value="2026-12-31",
                new_value="2027-08-31",
                absolute_change=243.0,
                percentage_change=66.5,
                severity="MEDIUM",
                evidence=[evidence_list[2]],
            ),
            ChangeAnalysisItem(
                field="subcontractor",
                old_value="XYZ Engineering",
                new_value="DEF Construction",
                absolute_change=None,
                percentage_change=None,
                severity="HIGH",
                evidence=[evidence_list[3]],
            ),
            ChangeAnalysisItem(
                field="scope",
                old_value="Grade-separated arterial corridor (Phase 1 tender specs)",
                new_value="Modified alignment with revised flyover ramps & junction restructuring",
                absolute_change=None,
                percentage_change=32.0,  # 1.0 - 0.68
                severity="MEDIUM",
                evidence=[
                    EvidenceItem(
                        document_id="doc-amd-1",
                        filename="amendment_1.pdf",
                        page=8,
                        source_text="Schedule C: Adjusted ramp turning radii and added 3 slip lanes at eastern terminus.",
                        original_value="Phase 1 original specs",
                        new_value="Expanded interchange geometry",
                        field="scope",
                    )
                ],
            ),
        ]

        risk_factors = [
            RiskFactor(
                name="Cost deviation",
                score=28.0,
                weight=0.30,
                reason="Current value is 41% above baseline (₹10.0 Cr → ₹14.1 Cr).",
            ),
            RiskFactor(
                name="Schedule deviation",
                score=22.0,
                weight=0.25,
                reason="Completion extended by ~8 months (243 days: Dec 2026 → Aug 2027).",
            ),
            RiskFactor(
                name="Subcontractor change",
                score=15.0,
                weight=0.15,
                reason="Primary civil engineering novated from XYZ Engineering to DEF Construction.",
            ),
            RiskFactor(
                name="Scope modification",
                score=12.0,
                weight=0.15,
                reason="Scope semantic similarity dropped to 68% against tender baseline.",
            ),
            RiskFactor(
                name="Repeated amendments",
                score=10.0,
                weight=0.15,
                reason="4 cumulative post-award amendments submitted within 14 months.",
            ),
        ]

        timeline = [
            TimelineItem(
                version=0,
                label="Baseline",
                date="2026-01-01",
                contract_value=100000000.0,
                completion_date="2026-12-31",
                major_changes="Initial award baseline tender",
            ),
            TimelineItem(
                version=1,
                label="Amendment 1",
                date="2026-04-15",
                contract_value=108000000.0,
                completion_date="2026-12-31",
                major_changes="+8% structural steel tariff adjustment",
            ),
            TimelineItem(
                version=2,
                label="Amendment 2",
                date="2026-08-10",
                contract_value=119000000.0,
                completion_date="2027-03-31",
                major_changes="Subsurface geotechnical redesign & 3mo extension",
            ),
            TimelineItem(
                version=3,
                label="Amendment 3",
                date="2026-11-20",
                contract_value=128000000.0,
                completion_date="2027-05-31",
                major_changes="Novation of civil tier-1 to DEF Construction",
            ),
            TimelineItem(
                version=4,
                label="Amendment 4",
                date="2027-02-14",
                contract_value=141000000.0,
                completion_date="2027-08-31",
                major_changes="Eastern interchange expansion; total value reached ₹14.1 Cr (+41%)",
            ),
        ]

        return ContractAnalysisResult(
            contract_id=contract_id,
            current_version=4,
            drift=DriftResult(
                cost_percentage=41.0,
                schedule_days=243,
                scope_similarity=0.68,
            ),
            risk=RiskResult(
                score=87.0,
                level="CRITICAL",
            ),
            risk_factors=risk_factors,
            changes=changes,
            timeline=timeline,
            evidence=evidence_list,
        )

    def _generate_dynamic_mock_result(
        self,
        contract_id: str,
        documents: List[Dict[str, Any]],
        contract_metadata: Optional[Dict[str, Any]] = None,
    ) -> ContractAnalysisResult:
        meta = contract_metadata or {}
        local_ai = _run_document_ai(documents)
        base_val = float(meta.get("baseline_value") or 50000000.0)
        curr_val = float(meta.get("current_value") or (base_val * 1.15))
        cost_diff = curr_val - base_val
        cost_pct = round((cost_diff / base_val) * 100, 1) if base_val > 0 else 0.0

        num_docs = len(documents)
        curr_version = max(num_docs, 1)

        # Risk score calculation heuristic for mock
        score = local_ai["risk_score"] if local_ai["documents"] else min(95.0, max(15.0, round(cost_pct * 1.5 + num_docs * 5.0, 1)))
        if score >= 80:
            level = "CRITICAL"
        elif score >= 60:
            level = "HIGH"
        elif score >= 35:
            level = "MEDIUM"
        else:
            level = "LOW"

        evidence_list = [
            EvidenceItem(
                document_id=documents[0].get("id") if documents else "doc-base",
                filename=documents[0].get("filename") if documents else "contract_spec.pdf",
                page=1,
                source_text=f"Initial agreed consideration: ₹{base_val:,.2f}",
                original_value=base_val,
                new_value=None,
                field="contract_value",
                change_type="BASELINE",
            )
        ]

        if curr_val != base_val and documents:
            latest_doc = documents[-1]
            evidence_list.append(
                EvidenceItem(
                    document_id=latest_doc.get("id"),
                    filename=latest_doc.get("filename"),
                    page=2,
                    source_text=f"Revised payable sum adjusted to: ₹{curr_val:,.2f} (+{cost_pct}%)",
                    original_value=base_val,
                    new_value=curr_val,
                    field="contract_value",
                    change_type="AMENDMENT",
                )
            )

        changes = [
            ChangeAnalysisItem(
                field="contract_value",
                old_value=base_val,
                new_value=curr_val,
                absolute_change=cost_diff,
                percentage_change=cost_pct,
                severity="HIGH" if cost_pct > 25 else ("MEDIUM" if cost_pct > 10 else "LOW"),
                evidence=evidence_list,
            )
        ]

        risk_factors = [
            RiskFactor(
                name="Cost deviation",
                score=round(min(30.0, cost_pct * 0.7), 1),
                weight=0.35,
                reason=f"Current valuation shows {cost_pct}% variance against baseline.",
            ),
            RiskFactor(
                name="Documentation cadence",
                score=round(min(25.0, num_docs * 4.0), 1),
                weight=0.25,
                reason=f"{num_docs} project governance documents registered in tracking chain.",
            ),
        ]
        if local_ai["documents"]:
            risk_factors = [RiskFactor(**factor) for factor in local_ai["risk_factors"]]

        timeline = [
            TimelineItem(
                version=0,
                label="Baseline",
                date="2026-01-01",
                contract_value=base_val,
                completion_date=meta.get("baseline_completion_date", "2026-12-31"),
                major_changes="Baseline contract registered",
            )
        ]

        if curr_version > 0 and curr_val != base_val:
            timeline.append(
                TimelineItem(
                    version=curr_version,
                    label=f"Version {curr_version}",
                    date="2026-06-01",
                    contract_value=curr_val,
                    completion_date=meta.get("current_completion_date", "2027-03-31"),
                    major_changes=f"Updated valuation to ₹{curr_val:,.2f}",
                )
            )

        return ContractAnalysisResult(
            contract_id=contract_id,
            current_version=curr_version,
            drift=DriftResult(
                cost_percentage=cost_pct,
                schedule_days=90,
                scope_similarity=local_ai["scope_similarity"] if local_ai["documents"] else 0.82,
            ),
            risk=RiskResult(
                score=score,
                level=level,
            ),
            risk_factors=risk_factors,
            changes=changes,
            timeline=timeline,
            evidence=evidence_list,
        )


class HttpAIAnalysisClient(AIAnalysisClient):
    """Production HTTP client to communicate with Core AI Engineer's external microservice."""

    def __init__(self, service_url: Optional[str] = None):
        self.service_url = (service_url or settings.AI_ANALYSIS_SERVICE_URL).rstrip("/")

    async def analyze_contract(
        self,
        contract_id: str,
        documents: List[Dict[str, Any]],
        contract_metadata: Optional[Dict[str, Any]] = None,
    ) -> ContractAnalysisResult:
        endpoint = f"{self.service_url}/analyze"
        payload = {
            "contract_id": contract_id,
            "documents": documents,
            "metadata": contract_metadata or {},
        }
        logger.info(f"[HttpAIAnalysisClient] Calling external AI service at {endpoint} for contract {contract_id}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
                return ContractAnalysisResult(**data)
            except Exception as e:
                logger.error(f"[HttpAIAnalysisClient] Failed to reach Core AI service: {e}. Falling back to mock client.")
                mock_client = MockAIAnalysisClient()
                return await mock_client.analyze_contract(contract_id, documents, contract_metadata)


def get_ai_client() -> AIAnalysisClient:
    """Factory to provide the appropriate AI analysis client based on configuration."""
    if settings.USE_MOCK_AI:
        return MockAIAnalysisClient()
    return HttpAIAnalysisClient(service_url=settings.AI_ANALYSIS_SERVICE_URL)
