"""
DeepTrace Model Temperature Calibration
Fits post-hoc temperature scaling parameter T > 0 on the validation set to calibrate
output probabilities and eliminate confidence miscalibration.
Updates backend/models/config.json with fitted temperature and reports ECE before and after.
"""

import sys
import json
import argparse
from pathlib import Path
import numpy as np

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from training.dataset import DeepfakeImageDataset
from training.augment import get_val_transforms
from training.train import create_model


def compute_ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """
    Computes Expected Calibration Error (ECE) across n_bins.
    probs: predicted probability for the positive class (Fake/Synthetic)
    labels: ground truth binary targets (0 or 1)
    """
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n_samples = len(probs)

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Samples within bin
        in_bin = (probs > bin_lower) & (probs <= bin_upper) if i > 0 else (probs >= bin_lower) & (probs <= bin_upper)
        bin_count = np.sum(in_bin)

        if bin_count > 0:
            bin_acc = np.mean(labels[in_bin])
            bin_conf = np.mean(probs[in_bin])
            ece += (bin_count / n_samples) * np.abs(bin_acc - bin_conf)

    return float(ece)


class TemperatureScaler(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        return logits / self.temperature


def main():
    parser = argparse.ArgumentParser(description="DeepTrace Temperature Scaling Calibration")
    parser.add_argument("--data_dir", type=str, default="backend/training/data")
    parser.add_argument("--model_path", type=str, default="backend/models/detector.pt")
    parser.add_argument("--config_path", type=str, default="backend/models/config.json")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--max_val_samples", type=int, default=None)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    config_path = Path(args.config_path)
    model_path = Path(args.model_path)

    if not model_path.exists():
        print(f"[!] Checkpoint not found at {model_path}. Please train a model first.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    model_name = config.get("model_name", "efficientnet_b0")
    image_size = config.get("image_size", 224)

    # 1. Load Model
    model = create_model(model_name, pretrained=False, num_classes=2)
    ckpt = torch.load(model_path, map_location="cpu")
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()

    # 2. Extract Validation Logits
    val_ds = DeepfakeImageDataset(
        Path(args.data_dir) / "val",
        transform=get_val_transforms(image_size),
        max_samples_per_class=args.max_val_samples,
    )
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    print(f"[*] Extracting logits from {len(val_ds)} validation samples for temperature scaling...")
    logits_list = []
    labels_list = []

    with torch.no_grad():
        for images, targets, _ in val_loader:
            images = images.to(device)
            out = model(images)
            logits_list.append(out.cpu())
            labels_list.append(targets)

    logits = torch.cat(logits_list, dim=0)
    labels = torch.cat(labels_list, dim=0)

    # Calculate uncalibrated ECE (T=1.0)
    uncalibrated_probs = torch.softmax(logits, dim=1)[:, 1].numpy()
    ece_before = compute_ece(uncalibrated_probs, labels.numpy())

    # 3. Fit Temperature Parameter T via NLL
    scaler = TemperatureScaler()
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.LBFGS([scaler.temperature], lr=0.01, max_iter=100)

    def eval_loss():
        optimizer.zero_grad()
        loss = criterion(scaler(logits), labels)
        loss.backward()
        return loss

    optimizer.step(eval_loss)
    fitted_temp = round(float(scaler.temperature.item()), 4)

    # Calculate calibrated ECE
    with torch.no_grad():
        calibrated_probs = torch.softmax(logits / fitted_temp, dim=1)[:, 1].numpy()
    ece_after = compute_ece(calibrated_probs, labels.numpy())

    print("================================================================================")
    print("DEEPTRACE POST-HOC TEMPERATURE CALIBRATION RESULTS")
    print("================================================================================")
    print(f"[*] Fitted Temperature Parameter (T): {fitted_temp:.4f}")
    print(f"[*] Expected Calibration Error (ECE) Before: {ece_before*100:.2f}%")
    print(f"[*] Expected Calibration Error (ECE) After:  {ece_after*100:.2f}%")
    print(f"[*] ECE Improvement Delta:                    {(ece_before - ece_after)*100:+.2f}%")
    print("================================================================================")

    # Update config.json
    config["temperature"] = fitted_temp
    config["ece_before"] = round(float(ece_before), 4)
    config["ece_after"] = round(float(ece_after), 4)
    config["calibrated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print(f"[OK] Saved fitted temperature to {config_path}")


if __name__ == "__main__":
    main()
