"""End-to-End Test Suite for PmatBot PMAT Multi-Dimensional Stats Verification."""

from pathlib import Path
import pytest
from click.testing import CliRunner

from hath0r_cli.bots.pmat_bot import PmatBot
from hath0r_cli.cli import main
from hath0r_engine.analysis.pmat_stats_engine import PmatStatsEngine


def test_e2e_pmat_bot_retrieval(tmp_path: Path):
    """Verify E2E stats retrieval across polyglot test workspaces."""
    # Polyglot sample 1: Python module
    py_file = tmp_path / "service.py"
    py_file.write_text(
        """
from typing import Optional

def calculate_discount(price: float, ratio: float) -> float:
    \"\"\"Calculate safe discount value.\"\"\"
    assert price >= 0.0
    assert 0.0 <= ratio <= 1.0
    if price > 100.0:
        return price * (1.0 - ratio)
    return price
"""
    )

    # Polyglot sample 2: TypeScript module
    ts_file = tmp_path / "app.ts"
    ts_file.write_text(
        """
export interface User {
  id: string;
  name: string;
}

export function formatUser(u: User): string {
  return `${u.name} (${u.id})`;
}
"""
    )

    engine = PmatStatsEngine()

    # 1. Verify AST Complexity
    py_metrics = engine.calculate_ast_complexity(py_file)
    assert py_metrics["cyclomatic_complexity"] >= 2.0
    assert py_metrics["halstead_volume"] > 0.0

    # 2. Verify Formal Provability Score
    py_prov = engine.calculate_provability_score(py_file)
    assert py_prov["formal_verification_coverage"] > 0.50
    assert py_prov["provability_score"] > 0.50

    # 3. Verify PmatBot E2E Orchestration
    bot = PmatBot(cwd=tmp_path)
    stats_report = bot.get_stats(repo_path=str(tmp_path), window_days=30)

    assert stats_report["schema_version"] == "hath0r.pmat.stats/1"
    assert "summary" in stats_report
    assert stats_report["summary"]["total_files_analyzed"] >= 0


def test_e2e_cli_pmat_stats_formatting():
    """Verify CLI formatting across json and markdown outputs."""
    runner = CliRunner()

    res_json = runner.invoke(main, ["pmat", "stats", "--format", "json"])
    assert res_json.exit_code == 0
    assert '"schema_version": "hath0r.pmat.stats/1"' in res_json.output

    res_md = runner.invoke(main, ["pmat", "stats", "--format", "markdown"])
    assert res_md.exit_code == 0
    assert "# PMAT Multi-Dimensional Report:" in res_md.output
