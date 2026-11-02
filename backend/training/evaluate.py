"""
DeepTrace Forensic Model Evaluation & Robustness Benchmark
Evaluates held-out test set performance:
  - Accuracy, Precision, Recall, F1, ROC-AUC
  - Empirical False Positive Rate (FPR) and False Negative Rate (FNR)
  - Confusion Matrix plot and ROC Curve
  - Robustness Stress Tests:
      1. JPEG Quality 50
      2. 50% Resolution Downscaling
      3. Screenshot Simulation Framing & Re-encoding
Saves report to backend/models/metrics.json and plots to backend/models/
"""

import sys
import json
import argparse
from pathlib import Path
import numpy as np

import torch
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from training.dataset import DeepfakeImageDataset
from training.augment import (
    get_val_transforms,
    get_jpeg50_transforms,
    get_downscale50_transforms,
    get_screenshot_transforms,
)
from training.train import create_model


@torch.no_grad()
def run_inference(model, loader, device, temperature: float = 1.0):
    model.eval()
    all_probs = []
    all_preds = []
    all_targets = []

    for images, targets, _ in loader:
        images = images.to(device)
        logits = model(images)
        scaled_logits = logits / temperature
        probs = torch.softmax(scaled_logits, dim=1)[:, 1].cpu().numpy()
        preds = (probs >= 0.5).astype(int)

        all_probs.extend(probs)
        all_preds.extend(preds)
        all_targets.extend(targets.numpy())

    return np.array(all_probs), np.array(all_preds), np.array(all_targets)


def main():
    parser = argparse.ArgumentParser(description="DeepTrace Model Evaluation & Robustness Benchmark")
    parser.add_argument("--data_dir", type=str, default="backend/training/data")
    parser.add_argument("--model_path", type=str, default="backend/models/detector.pt")
    parser.add_argument("--config_path", type=str, default="backend/models/config.json")
    parser.add_argument("--output_dir", type=str, default="backend/models")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--max_test_samples", type=int, default=None)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    config_path = Path(args.config_path)
    model_path = Path(args.model_path)

    if not model_path.exists():
        print(f"[!] Checkpoint not found at {model_path}. Train a model first.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    model_name = config.get("model_name", "efficientnet_b0")
    image_size = config.get("image_size", 224)
    temperature = config.get("temperature", 1.0)

    # 1. Load Model
    model = create_model(model_name, pretrained=False, num_classes=2)
    ckpt = torch.load(model_path, map_location="cpu")
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()

    test_dir = Path(args.data_dir) / "test"
    print(f"[*] Running evaluation on held-out test set: {test_dir}")

    # 2. Clean Test Evaluation
    clean_ds = DeepfakeImageDataset(test_dir, transform=get_val_transforms(image_size), max_samples_per_class=args.max_test_samples)
    clean_loader = DataLoader(clean_ds, batch_size=args.batch_size, shuffle=False)
    probs, preds, targets = run_inference(model, clean_loader, device, temperature=temperature)

    acc = float(accuracy_score(targets, preds))
    prec = float(precision_score(targets, preds, zero_division=0))
    rec = float(recall_score(targets, preds, zero_division=0))
    f1 = float(f1_score(targets, preds, zero_division=0))
    auc = float(roc_auc_score(targets, probs)) if len(set(targets)) > 1 else 0.5

    tn, fp, fn, tp = confusion_matrix(targets, preds, labels=[0, 1]).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    print("================================================================================")
    print("DEEPTRACE EMPIRICAL BENCHMARK METRICS (HELD-OUT TEST SET)")
    print("================================================================================")
    print(f"[*] Total Test Samples:       {len(targets)} (Real: {tn+fp}, Fake: {tp+fn})")
    print(f"[*] Accuracy:                  {acc*100:.2f}%")
    print(f"[*] Precision:                 {prec*100:.2f}%")
    print(f"[*] Recall:                    {rec*100:.2f}%")
    print(f"[*] F1-Score:                  {f1:.4f}")
    print(f"[*] ROC-AUC:                   {auc:.4f}")
    print(f"[*] False Positive Rate (FPR): {fpr*100:.2f}% (Real misclassified as Fake)")
    print(f"[*] False Negative Rate (FNR): {fnr*100:.2f}% (Fake misclassified as Real)")
    print(f"[*] Confusion Matrix:          TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print("================================================================================")

    # 3. Robustness Evaluations
    print("[*] Running Robustness Stress Tests...")
    # A. JPEG 50
    jpeg50_ds = DeepfakeImageDataset(test_dir, transform=get_jpeg50_transforms(image_size), max_samples_per_class=args.max_test_samples)
    _, jpeg50_preds, _ = run_inference(model, DataLoader(jpeg50_ds, batch_size=args.batch_size, shuffle=False), device, temperature)
    jpeg50_acc = float(accuracy_score(targets, jpeg50_preds))

    # B. Downscale 50%
    down50_ds = DeepfakeImageDataset(test_dir, transform=get_downscale50_transforms(image_size), max_samples_per_class=args.max_test_samples)
    _, down50_preds, _ = run_inference(model, DataLoader(down50_ds, batch_size=args.batch_size, shuffle=False), device, temperature)
    down50_acc = float(accuracy_score(targets, down50_preds))

    # C. Screenshot Simulation
    screen_ds = DeepfakeImageDataset(test_dir, transform=get_screenshot_transforms(image_size), max_samples_per_class=args.max_test_samples)
    _, screen_preds, _ = run_inference(model, DataLoader(screen_ds, batch_size=args.batch_size, shuffle=False), device, temperature)
    screen_acc = float(accuracy_score(targets, screen_preds))

    print(f"[*] Robustness | JPEG-50 Quality:     {jpeg50_acc*100:.2f}% (Delta: {(jpeg50_acc - acc)*100:+.2f}%)")
    print(f"[*] Robustness | 50% Downscale:       {down50_acc*100:.2f}% (Delta: {(down50_acc - acc)*100:+.2f}%)")
    print(f"[*] Robustness | Screenshot Simulated: {screen_acc*100:.2f}% (Delta: {(screen_acc - acc)*100:+.2f}%)")
    print("================================================================================")

    # 4. Generate Visual Plots
    # A. Confusion Matrix Plot
    fig, ax = plt.subplots(figsize=(5, 4), dpi=150)
    cax = ax.matshow([[tn, fp], [fn, tp]], cmap=plt.cm.Blues, alpha=0.8)
    for i in range(2):
        for j in range(2):
            val = [[tn, fp], [fn, tp]][i][j]
            ax.text(j, i, f"{val}", ha="center", va="center", color="black", fontsize=12, fontweight="bold")
    plt.title("DeepTrace Confusion Matrix", pad=20, fontsize=12, fontweight="bold")
    fig.colorbar(cax)
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(["Real", "Fake"])
    ax.set_yticklabels(["Real", "Fake"])
    plt.xlabel("Predicted Label", labelpad=10)
    plt.ylabel("Ground Truth", labelpad=10)
    plt.tight_layout()
    cm_path = output_dir / "confusion_matrix.png"
    plt.savefig(cm_path)
    plt.close()

    # B. ROC Curve Plot
    fpr_curve, tpr_curve, _ = roc_curve(targets, probs)
    plt.figure(figsize=(5, 4), dpi=150)
    plt.plot(fpr_curve, tpr_curve, color="darkorange", lw=2, label=f"ROC (AUC = {auc:.4f})")
    plt.plot([0, 1], [0, 1], color="navy", lw=1, linestyle="--")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC)", fontweight="bold")
    plt.legend(loc="lower right")
    plt.tight_layout()
    roc_path = output_dir / "roc_curve.png"
    plt.savefig(roc_path)
    plt.close()

    # 5. Save metrics.json
    metrics_payload = {
        "model_name": model_name,
        "model_version": "v1.0-trained",
        "training_dataset": "CIFAKE + 140k Faces Benchmark",
        "evaluation_date": config.get("training_date"),
        "test_set_size": int(len(targets)),
        "temperature": float(temperature),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4),
            "fpr_percent": round(fpr * 100.0, 2),
            "fnr_percent": round(fnr * 100.0, 2)
        },
        "confusion_matrix": {
            "true_positive": int(tp),
            "false_positive": int(fp),
            "true_negative": int(tn),
            "false_negative": int(fn)
        },
        "robustness": {
            "clean_accuracy": round(acc, 4),
            "jpeg_quality_50_accuracy": round(jpeg50_acc, 4),
            "jpeg_quality_50_drop": round(acc - jpeg50_acc, 4),
            "downscale_50_accuracy": round(down50_acc, 4),
            "downscale_50_drop": round(acc - down50_acc, 4),
            "screenshot_accuracy": round(screen_acc, 4),
            "screenshot_drop": round(acc - screen_acc, 4)
        }
    }

    metrics_file = output_dir / "metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"[OK] Metrics saved to {metrics_file}")
    print(f"[OK] Plots saved to {cm_path} and {roc_path}")


if __name__ == "__main__":
    main()
