"""
DeepTrace Forensic Dataset Loader
Loads real and fake images from ImageFolder-style directory structure:
  <split>/
    real/   -> Label 0
    fake/   -> Label 1
"""

import os
from pathlib import Path
from typing import Optional, Callable, List, Tuple
from PIL import Image

try:
    import torch
    from torch.utils.data import Dataset, DataLoader
except ImportError:
    torch = None
    Dataset = object
    DataLoader = None


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


class DeepfakeImageDataset(Dataset):
    """
    Standard PyTorch dataset for binary forensic image classification.
    0: Real / Authentic
    1: Fake / Synthetic (AI-generated)
    """
    def __init__(
        self,
        split_dir: str | Path,
        transform: Optional[Callable] = None,
        max_samples_per_class: Optional[int] = None,
    ):
        self.split_dir = Path(split_dir)
        self.transform = transform
        self.samples: List[Tuple[Path, int]] = []
        self.class_to_idx = {"real": 0, "fake": 1}

        real_dir = self.split_dir / "real"
        fake_dir = self.split_dir / "fake"

        if not real_dir.exists() and not fake_dir.exists():
            raise FileNotFoundError(
                f"Dataset directory '{self.split_dir}' must contain 'real' and/or 'fake' subfolders."
            )

        # Collect Real samples
        if real_dir.exists():
            real_files = [
                p for p in real_dir.rglob("*")
                if p.suffix.lower() in SUPPORTED_EXTENSIONS
            ]
            if max_samples_per_class:
                real_files = real_files[:max_samples_per_class]
            for p in real_files:
                self.samples.append((p, 0))

        # Collect Fake samples
        if fake_dir.exists():
            fake_files = [
                p for p in fake_dir.rglob("*")
                if p.suffix.lower() in SUPPORTED_EXTENSIONS
            ]
            if max_samples_per_class:
                fake_files = fake_files[:max_samples_per_class]
            for p in fake_files:
                self.samples.append((p, 1))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        img_path, label = self.samples[idx]
        try:
            with open(img_path, "rb") as f:
                img = Image.open(f).convert("RGB")
        except Exception:
            # Fallback for corrupt image during long training runs: return black image
            img = Image.new("RGB", (224, 224), (0, 0, 0))

        if self.transform is not None:
            img = self.transform(img)

        return img, label, str(img_path)

    @property
    def class_counts(self) -> dict:
        real_c = sum(1 for _, l in self.samples if l == 0)
        fake_c = sum(1 for _, l in self.samples if l == 1)
        return {"real": real_c, "fake": fake_c, "total": len(self.samples)}


def build_dataloaders(
    data_dir: str | Path,
    image_size: int = 224,
    batch_size: int = 32,
    num_workers: int = 4,
    max_samples_per_class: Optional[int] = None,
    train_transform_fn: Optional[Callable] = None,
    eval_transform_fn: Optional[Callable] = None,
):
    """Factory creating Train, Validation, and Test PyTorch DataLoaders."""
    data_dir = Path(data_dir)

    train_ds = DeepfakeImageDataset(
        data_dir / "train",
        transform=train_transform_fn,
        max_samples_per_class=max_samples_per_class,
    )
    val_ds = DeepfakeImageDataset(
        data_dir / "val",
        transform=eval_transform_fn,
        max_samples_per_class=max_samples_per_class,
    )
    test_ds = DeepfakeImageDataset(
        data_dir / "test",
        transform=eval_transform_fn,
        max_samples_per_class=max_samples_per_class,
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available() if torch else False,
        drop_last=True if len(train_ds) > batch_size else False,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available() if torch else False,
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available() if torch else False,
    )

    return train_loader, val_loader, test_loader
