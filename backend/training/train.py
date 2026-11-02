"""
DeepTrace Forensic Model Fine-Tuning Pipeline
Trained to distinguish Authentic Photographs from AI-Generated / Synthetic Media.
Engineered for 6 GB VRAM GPUs (NVIDIA RTX 3050):
  - Mixed precision (torch.cuda.amp)
  - Cosine annealing learning rate schedule
  - Early stopping on Validation ROC-AUC
  - Exports checkpoint and config.json to backend/models/
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

import torch
import torch.nn as nn
from torch.cuda.amp import autocast, GradScaler
from sklearn.metrics import roc_auc_score, accuracy_score

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from training.dataset import build_dataloaders
from training.augment import get_train_transforms, get_val_transforms


def create_model(model_name: str = "efficientnet_b0", pretrained: bool = True, num_classes: int = 2) -> nn.Module:
    """Creates classifier backbone using timm or torchvision fallback."""
    try:
        import timm
        model = timm.create_model(model_name, pretrained=pretrained, num_classes=num_classes)
        return model
    except ImportError:
        import torchvision.models as tvm
        if model_name.startswith("efficientnet"):
            weights = tvm.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            model = tvm.efficientnet_b0(weights=weights)
            in_features = model.classifier[1].in_features
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.2, inplace=True),
                nn.Linear(in_features, num_classes)
            )
            return model
        elif model_name.startswith("convnext"):
            weights = tvm.ConvNeXt_Tiny_Weights.DEFAULT if pretrained else None
            model = tvm.convnext_tiny(weights=weights)
            in_features = model.classifier[2].in_features
            model.classifier[2] = nn.Linear(in_features, num_classes)
            return model
        else:
            raise ValueError(f"Unsupported model architecture: {model_name}")


def train_one_epoch(model, loader, criterion, optimizer, scaler, device, grad_accum_steps=1):
    model.train()
    total_loss = 0.0
    all_preds = []
    all_targets = []

    optimizer.zero_grad()
    for step, (images, targets, _) in enumerate(loader):
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        with autocast(enabled=scaler is not None):
            logits = model(images)
            loss = criterion(logits, targets) / grad_accum_steps

        if scaler:
            scaler.scale(loss).backward()
            if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(loader):
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad()
        else:
            loss.backward()
            if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(loader):
                optimizer.step()
                optimizer.zero_grad()

        total_loss += loss.item() * grad_accum_steps
        probs = torch.softmax(logits, dim=1)[:, 1].detach().cpu().numpy()
        all_preds.extend(probs)
        all_targets.extend(targets.cpu().numpy())

    avg_loss = total_loss / max(1, len(loader))
    acc = accuracy_score(all_targets, np.array(all_preds) >= 0.5)
    auc = roc_auc_score(all_targets, all_preds) if len(set(all_targets)) > 1 else 0.5
    return avg_loss, acc, auc


@torch.no_grad()
def evaluate_epoch(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_targets = []

    for images, targets, _ in loader:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        logits = model(images)
        loss = criterion(logits, targets)
        total_loss += loss.item()

        probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
        all_preds.extend(probs)
        all_targets.extend(targets.cpu().numpy())

    avg_loss = total_loss / max(1, len(loader))
    acc = accuracy_score(all_targets, np.array(all_preds) >= 0.5)
    auc = roc_auc_score(all_targets, all_preds) if len(set(all_targets)) > 1 else 0.5
    return avg_loss, acc, auc


def main():
    parser = argparse.ArgumentParser(description="DeepTrace Image Classifier Training")
    parser.add_argument("--data_dir", type=str, default="backend/training/data", help="Path to data directory")
    parser.add_argument("--model_name", type=str, default="efficientnet_b0", choices=["efficientnet_b0", "convnext_tiny"])
    parser.add_argument("--image_size", type=int, default=224, help="Input image resolution")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size for training")
    parser.add_argument("--epochs", type=int, default=10, help="Maximum epochs")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--weight_decay", type=float, default=1e-2, help="AdamW weight decay")
    parser.add_argument("--grad_accum", type=int, default=1, help="Gradient accumulation steps")
    parser.add_argument("--patience", type=int, default=3, help="Early stopping patience")
    parser.add_argument("--amp", action="store_true", default=True, help="Enable mixed precision")
    parser.add_argument("--max_samples_per_class", type=int, default=None, help="Cap samples per class for quick testing")
    parser.add_argument("--output_dir", type=str, default="backend/models", help="Directory to save checkpoints")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] DeepTrace Training Engine | Device: {device} | Architecture: {args.model_name}")
    if torch.cuda.is_available():
        print(f"[*] GPU: {torch.cuda.get_device_name(0)} | VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Build DataLoaders
    train_transform = get_train_transforms(args.image_size)
    eval_transform = get_val_transforms(args.image_size)

    train_loader, val_loader, _ = build_dataloaders(
        args.data_dir,
        image_size=args.image_size,
        batch_size=args.batch_size,
        max_samples_per_class=args.max_samples_per_class,
        train_transform_fn=train_transform,
        eval_transform_fn=eval_transform,
    )

    print(f"[*] Dataset loaded: {len(train_loader.dataset)} training samples, {len(val_loader.dataset)} validation samples.")

    # 2. Instantiate Model & Optimizer
    model = create_model(args.model_name, pretrained=True, num_classes=2).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    scaler = GradScaler() if (args.amp and device.type == "cuda") else None

    best_val_auc = 0.0
    best_epoch = 0
    epochs_no_improve = 0
    best_checkpoint_path = output_dir / "detector.pt"
    config_path = output_dir / "config.json"

    # 3. Training Loop
    t_start = time.time()
    for epoch in range(1, args.epochs + 1):
        tr_loss, tr_acc, tr_auc = train_one_epoch(
            model, train_loader, criterion, optimizer, scaler, device, args.grad_accum
        )
        val_loss, val_acc, val_auc = evaluate_epoch(model, val_loader, criterion, device)
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{args.epochs:02d} | "
            f"Train Loss: {tr_loss:.4f} Acc: {tr_acc*100:.2f}% AUC: {tr_auc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}% AUC: {val_auc:.4f}"
        )

        if val_auc > best_val_auc:
            best_val_auc = val_auc
            best_epoch = epoch
            epochs_no_improve = 0

            # Save PyTorch Checkpoint
            torch.save({
                "model_name": args.model_name,
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_auc": float(val_auc),
                "val_acc": float(val_acc),
                "image_size": args.image_size,
            }, best_checkpoint_path)

            # Save Config JSON
            config_data = {
                "model_name": args.model_name,
                "image_size": args.image_size,
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
                "class_to_idx": {"real": 0, "fake": 1},
                "temperature": 1.0,
                "training_date": datetime.now(timezone.utc).isoformat(),
                "best_epoch": best_epoch,
                "best_val_auc": round(float(best_val_auc), 4),
                "best_val_acc": round(float(val_acc), 4)
            }
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2)

            print(f"  --> Saved new best checkpoint to {best_checkpoint_path} (AUC: {best_val_auc:.4f})")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= args.patience:
                print(f"[*] Early stopping triggered after {epoch} epochs (Best Epoch: {best_epoch}, AUC: {best_val_auc:.4f})")
                break

    total_time = time.time() - t_start
    print(f"[*] Training completed in {total_time/60:.2f} mins. Best Val AUC: {best_val_auc:.4f} at epoch {best_epoch}.")


if __name__ == "__main__":
    main()
