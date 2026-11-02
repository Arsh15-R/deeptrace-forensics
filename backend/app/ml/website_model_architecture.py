"""
DeepTrace Forensics - Multimodal AI Website Detection Model Architecture
Dual-Engine:
  - PyTorch engine (when torch and torch._C C++ DLLs are available)
  - Pure NumPy Neural Engine fallback (when torch._C has Windows DLL loader discrepancies)
Both engines share identical weights, layer dimensions, activations, and 3-class outputs:
  [Class 0: Human-made, Class 1: AI-generated, Class 2: AI-assisted]
"""

from __future__ import annotations
import math
import numpy as np
from typing import Dict, Any, Tuple, Optional

# Try PyTorch import safely
TORCH_AVAILABLE = False
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    # Verify torch._C is operational
    _test = torch.zeros(1)
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False
    class _DummyModule:
        def __init__(self, *args, **kwargs): pass
    nn = type("nn", (), {"Module": _DummyModule})()
    F = None


class NumpyMultimodalClassifier:
    """
    Pure NumPy implementation of the 4-part Multimodal Architecture:
      - CodeBranch: 16 -> 32 -> 16
      - VisualBranch: 12 -> 24 -> 16
      - FingerprintBranch: 12 -> 24 -> 16
      - Fusion: 48 -> 64 -> 32 -> 3
    Guarantees deterministic, 100% reliable execution in air-gapped / Windows environments.
    """
    def __init__(self, weights: Optional[Dict[str, np.ndarray]] = None):
        self.weights = weights or {}
        if not self.weights:
            self._init_default_weights()

    def _init_default_weights(self):
        rng = np.random.RandomState(42)
        # Code branch (16 -> 32 -> 16)
        self.weights["code_w1"] = rng.randn(16, 32).astype(np.float32) * np.sqrt(2.0 / 16)
        self.weights["code_b1"] = np.zeros(32, dtype=np.float32)
        self.weights["code_w2"] = rng.randn(32, 16).astype(np.float32) * np.sqrt(2.0 / 32)
        self.weights["code_b2"] = np.zeros(16, dtype=np.float32)
        self.weights["code_head_w"] = rng.randn(16, 1).astype(np.float32) * np.sqrt(2.0 / 16)
        self.weights["code_head_b"] = np.zeros(1, dtype=np.float32)

        # Visual branch (12 -> 24 -> 16)
        self.weights["vis_w1"] = rng.randn(12, 24).astype(np.float32) * np.sqrt(2.0 / 12)
        self.weights["vis_b1"] = np.zeros(24, dtype=np.float32)
        self.weights["vis_w2"] = rng.randn(24, 16).astype(np.float32) * np.sqrt(2.0 / 24)
        self.weights["vis_b2"] = np.zeros(16, dtype=np.float32)
        self.weights["vis_head_w"] = rng.randn(16, 1).astype(np.float32) * np.sqrt(2.0 / 16)
        self.weights["vis_head_b"] = np.zeros(1, dtype=np.float32)

        # Fingerprint branch (12 -> 24 -> 16)
        self.weights["fp_w1"] = rng.randn(12, 24).astype(np.float32) * np.sqrt(2.0 / 12)
        self.weights["fp_b1"] = np.zeros(24, dtype=np.float32)
        self.weights["fp_w2"] = rng.randn(24, 16).astype(np.float32) * np.sqrt(2.0 / 24)
        self.weights["fp_b2"] = np.zeros(16, dtype=np.float32)
        self.weights["fp_head_w"] = rng.randn(16, 1).astype(np.float32) * np.sqrt(2.0 / 16)
        self.weights["fp_head_b"] = np.zeros(1, dtype=np.float32)

        # Fusion (48 -> 64 -> 32 -> 3)
        self.weights["fuse_w1"] = rng.randn(48, 64).astype(np.float32) * np.sqrt(2.0 / 48)
        self.weights["fuse_b1"] = np.zeros(64, dtype=np.float32)
        self.weights["fuse_w2"] = rng.randn(64, 32).astype(np.float32) * np.sqrt(2.0 / 64)
        self.weights["fuse_b2"] = np.zeros(32, dtype=np.float32)
        self.weights["fuse_w3"] = rng.randn(32, 3).astype(np.float32) * np.sqrt(2.0 / 32)
        self.weights["fuse_b3"] = np.zeros(3, dtype=np.float32)
        self.temperature = 1.0

    @staticmethod
    def _relu(x: np.ndarray) -> np.ndarray:
        return np.maximum(0.0, x)

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -15.0, 15.0)))

    @staticmethod
    def _layer_norm(x: np.ndarray, eps: float = 1e-5) -> np.ndarray:
        mean = np.mean(x, axis=-1, keepdims=True)
        var = np.var(x, axis=-1, keepdims=True)
        return (x - mean) / np.sqrt(var + eps)

    def forward(
        self,
        code_feat: np.ndarray,
        visual_feat: np.ndarray,
        fp_feat: np.ndarray
    ) -> Dict[str, Any]:
        """
        Forward pass through all 3 branches + Late Fusion.
        Supports single sample (1D) or batch (2D).
        """
        is_1d = (code_feat.ndim == 1)
        if is_1d:
            code_feat = np.expand_dims(code_feat, 0)
            visual_feat = np.expand_dims(visual_feat, 0)
            fp_feat = np.expand_dims(fp_feat, 0)

        # 1. Code Branch
        h_code1 = self._relu(self._layer_norm(code_feat @ self.weights["code_w1"] + self.weights["code_b1"]))
        emb_code = self._relu(self._layer_norm(h_code1 @ self.weights["code_w2"] + self.weights["code_b2"]))
        code_score = self._sigmoid(emb_code @ self.weights["code_head_w"] + self.weights["code_head_b"])

        # 2. Visual Branch
        h_vis1 = self._relu(self._layer_norm(visual_feat @ self.weights["vis_w1"] + self.weights["vis_b1"]))
        emb_vis = self._relu(self._layer_norm(h_vis1 @ self.weights["vis_w2"] + self.weights["vis_b2"]))
        visual_score = self._sigmoid(emb_vis @ self.weights["vis_head_w"] + self.weights["vis_head_b"])

        # 3. Fingerprint Branch
        h_fp1 = self._relu(self._layer_norm(fp_feat @ self.weights["fp_w1"] + self.weights["fp_b1"]))
        emb_fp = self._relu(self._layer_norm(h_fp1 @ self.weights["fp_w2"] + self.weights["fp_b2"]))
        fp_score = self._sigmoid(emb_fp @ self.weights["fp_head_w"] + self.weights["fp_head_b"])

        # 4. Fusion Layer
        fused = np.concatenate([emb_code, emb_vis, emb_fp], axis=-1)
        h_fuse1 = self._relu(self._layer_norm(fused @ self.weights["fuse_w1"] + self.weights["fuse_b1"]))
        h_fuse2 = self._relu(self._layer_norm(h_fuse1 @ self.weights["fuse_w2"] + self.weights["fuse_b2"]))
        logits = h_fuse2 @ self.weights["fuse_w3"] + self.weights["fuse_b3"]

        # Temperature scaling & Softmax
        scaled_logits = logits / max(0.1, getattr(self, "temperature", 1.0))
        exp_logits = np.exp(scaled_logits - np.max(scaled_logits, axis=-1, keepdims=True))
        probabilities = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

        if is_1d:
            probabilities = probabilities[0]
            logits = logits[0]
            code_score = float(code_score[0, 0])
            visual_score = float(visual_score[0, 0])
            fp_score = float(fp_score[0, 0])

        return {
            "logits": logits,
            "probabilities": probabilities,
            "code_score": code_score,
            "visual_score": visual_score,
            "fingerprint_score": fp_score,
        }

    def save(self, filepath: str):
        """Saves weights dictionary to .npz file."""
        np.savez(filepath, **self.weights, temperature=np.array([self.temperature]))

    @classmethod
    def load(cls, filepath: str) -> "NumpyMultimodalClassifier":
        """Loads weights from .npz file."""
        data = np.load(filepath)
        weights = {k: data[k] for k in data.files if k != "temperature"}
        inst = cls(weights=weights)
        if "temperature" in data:
            inst.temperature = float(data["temperature"][0])
        return inst
