"""
Re-export module for learning profile aggregation services.
Maintains backward compatibility while preserving modularity (< 200 LOC per file).
"""
from app.services.learning_profile import (
    compute_learning_profile_overview,
    compute_learning_profile_test_practice
)

__all__ = [
    "compute_learning_profile_overview",
    "compute_learning_profile_test_practice"
]
