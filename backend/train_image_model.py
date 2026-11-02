#!/usr/bin/env python3
"""
DeepTrace Forensics - Image Model Training & Fine-Tuning Pipeline
Trains a PyTorch binary classifier (Authentic vs. AI-Generated) using MobileNetV3-Small backbone.
Saves calibrated weights to app/ml/weights/deepfake_vision_model.pth.
"""

import os
import sys
import time
import argparse
import random
import numpy as np
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
import cv2

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.model_architecture import DeepfakeClassifier

# Training Transforms
train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class SyntheticBenchDataset(Dataset):
    """
    Forensic benchmark dataset that synthesizes rich, diverse authentic camera specimens
    (Poisson-Gaussian sensor noise, multi-ISO profiles, Bayer CFA demosaicing, optical lens
    vignetting and PSF blur, natural scene gradients and textures) and diverse synthetic
    diffusion/GAN specimens (Laplacian joint VAE residual noise across channels, porcelain flat
    regions, sharp boundary disparity, upsampling lattice artifacts).
    """
    def __init__(self, num_samples: int = 480, transform=None, is_train: bool = True):
        self.num_samples = num_samples
        self.transform = transform
        self.is_train = is_train

    def __len__(self):
        return self.num_samples

    def _generate_authentic_specimen(self, idx: int, h: int = 300, w: int = 300) -> np.ndarray:
        """
        Synthesizes an authentic optical camera capture obeying sensor physics:
        - Diverse scene archetypes: landscape, human portrait, architectural perspective, still life, foliage, low-light
        - Optical lens vignetting and slight point spread function (PSF) diffraction
        - Physical multi-ISO Poisson-Gaussian sensor noise (shot + read noise)
        - Color-filter array (CFA) Bayer mosaic sampling and bilinear hardware demosaicing
        """
        np.random.seed((idx * 37) + (10000 if not self.is_train else 0))
        y, x = np.ogrid[:h, :w]
        scene = (idx // 2) % 6

        if scene == 0:
            # 1. Landscape & Sky horizon with atmospheric gradation & natural terrain
            sky = 230.0 - 95.0 * (y / float(h))
            ground = 75.0 + 35.0 * np.sin(x / 45.0) + 20.0 * np.cos(y / 35.0)
            elevation = h * 0.52 + 25.0 * np.sin(x / 50.0) + 10.0 * np.cos(x / 20.0)
            mask = (y > elevation).astype(np.float32)
            base_r = sky * (1.0 - mask) + (ground * 0.85) * mask
            base_g = (sky * 0.92) * (1.0 - mask) + (ground * 1.15) * mask
            base_b = (sky * 1.08) * (1.0 - mask) + (ground * 0.55) * mask
            img = np.stack([base_r, base_g, base_b], axis=-1)
        elif scene == 1:
            # 2. Natural Portrait / Human skin tones with organic curvature & Lambertian falloff
            cx, cy = w // 2, h // 2
            r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            face_contour = np.clip(1.0 - (r / 115.0), 0.0, 1.0)
            shade = 0.7 + 0.3 * np.cos((x - cx) / 80.0)
            base_r = (185.0 + 35.0 * face_contour) * shade
            base_g = (140.0 + 30.0 * face_contour) * shade
            base_b = (118.0 + 22.0 * face_contour) * shade
            bg_tone = 90.0 + 25.0 * np.sin(y / 55.0)
            is_face = (face_contour > 0.05).astype(np.float32)
            img = np.stack([
                base_r * is_face + bg_tone * 0.9 * (1.0 - is_face),
                base_g * is_face + bg_tone * 1.0 * (1.0 - is_face),
                base_b * is_face + bg_tone * 1.1 * (1.0 - is_face)
            ], axis=-1)
        elif scene == 2:
            # 3. Architectural perspective with natural diffuse edges & ambient occlusion
            grid_x = np.sin(x / 28.0) * 22.0
            grid_y = np.cos(y / 24.0) * 22.0
            wall = 135.0 + grid_x + grid_y
            ao = 1.0 - 0.25 * np.exp(-((x - 20) ** 2) / 1200.0)
            wall = wall * ao
            img = np.stack([wall * 0.96, wall * 1.0, wall * 1.04], axis=-1)
        elif scene == 3:
            # 4. Indoor ambient still life / directional window lighting
            light = np.exp(-((x - 85) ** 2 + (y - 95) ** 2) / 28000.0)
            obj = (((x - 170) ** 2 + (y - 180) ** 2) < 48 ** 2).astype(np.float32)
            base = 65.0 + 130.0 * light + 40.0 * obj
            img = np.stack([base * 1.04, base * 0.98, base * 0.92], axis=-1)
        elif scene == 4:
            # 5. Natural macro foliage / organic botanical pigments
            harmonics = (
                np.sin(x / 14.0) * np.cos(y / 14.0) * 28.0
                + np.sin(x / 7.0 + y / 11.0) * 14.0
                + np.cos(x / 24.0 - y / 18.0) * 18.0
            )
            base_g = 138.0 + harmonics
            base_r = 92.0 + harmonics * 0.65
            base_b = 62.0 + harmonics * 0.48
            img = np.stack([base_r, base_g, base_b], axis=-1)
        else:
            # 6. Night / Low-light sensor capture with localized illumination
            lamp = np.exp(-((x - 150) ** 2 + (y - 120) ** 2) / 8000.0)
            base = 35.0 + 180.0 * lamp
            img = np.stack([base * 1.15, base * 1.0, base * 0.85], axis=-1)

        # Lens optical vignetting (radial light falloff toward lens edges)
        r2 = ((x - w / 2) ** 2 + (y - h / 2) ** 2) / ((w / 2) ** 2 + (h / 2) ** 2)
        vignette = 1.0 - 0.16 * np.clip(r2, 0.0, 1.0)
        img = img * vignette[:, :, None]

        # Physical Optical Point Spread Function (PSF blur from lens optics)
        img = cv2.GaussianBlur(img, (3, 3), sigmaX=0.55)

        # Multi-ISO Poisson-Gaussian Sensor Noise Model
        iso_levels = [100, 200, 400, 800, 1600, 3200, 6400]
        iso = iso_levels[idx % len(iso_levels)]
        shot_factor = 0.075 * np.sqrt(iso / 400.0)
        read_sigma = 2.4 * np.sqrt(iso / 400.0)

        # Independent sensor silicon noise per color channel + White Balance gains
        wb_gains = [1.95, 1.0, 1.75]
        for c in range(3):
            shot_noise = np.random.normal(0, 1.0, (h, w)) * np.sqrt(np.maximum(img[:, :, c], 0.0)) * shot_factor
            read_noise = np.random.normal(0, read_sigma, (h, w))
            img[:, :, c] += (shot_noise + read_noise) * (wb_gains[c] / 1.5)

        img = np.clip(img, 0, 255).astype(np.uint8)

        # Physical Bayer CFA Filter Mosaic Extraction & Bilinear Hardware Demosaicing
        # Imparts authentic 2x2 inter-pixel spatial correlations absent in AI generators
        bayer = np.zeros((h, w), dtype=np.uint8)
        bayer[0::2, 0::2] = img[0::2, 0::2, 0]  # R
        bayer[0::2, 1::2] = img[0::2, 1::2, 1]  # G
        bayer[1::2, 0::2] = img[1::2, 0::2, 1]  # G
        bayer[1::2, 1::2] = img[1::2, 1::2, 2]  # B
        img_demosaiced = cv2.cvtColor(bayer, cv2.COLOR_BAYER_RG2RGB)

        return img_demosaiced

    def _generate_synthetic_specimen(self, idx: int, h: int = 300, w: int = 300) -> np.ndarray:
        """
        Synthesizes an AI generative specimen exhibiting authentic diffusion/GAN anomalies:
        - Diverse generative archetypes: porcelain AI face, surreal shapes, inpainting seams, checkerboard GAN lattices, over-smoothed scenes
        - High-kurtosis joint VAE latent noise across channels (cross-channel correlation violating sensor physics)
        - Upsampling checkerboard/transposed-conv lattice artifacts
        - Sharp boundary disparities without optical PSF blur
        """
        np.random.seed((idx * 43) + (20000 if not self.is_train else 0))
        y, x = np.ogrid[:h, :w]
        scene = (idx // 2) % 6
        img = np.zeros((h, w, 3), dtype=np.float32)

        if scene == 0:
            # 1. AI Portrait: Porcelain smoothed skin + sharp ocular cutouts
            img[:, :] = [210.0, 202.0, 196.0]
            # Smooth porcelain face oval (over-smoothed texture)
            cv2.ellipse(img, (150, 150), (85, 115), 0, 0, 360, (238, 196, 178), -1)
            # Uncanny sharp circular irises with razor specular boundary
            cv2.circle(img, (120, 135), 19, (42, 78, 112), -1)
            cv2.circle(img, (180, 135), 19, (42, 78, 112), -1)
            cv2.circle(img, (120, 135), 7, (12, 12, 12), -1)
            cv2.circle(img, (180, 135), 7, (12, 12, 12), -1)
            cv2.circle(img, (116, 131), 3, (255, 255, 255), -1)
            cv2.circle(img, (176, 131), 3, (255, 255, 255), -1)
            # Sharp hair cutout
            cv2.rectangle(img, (60, 30), (240, 85), (28, 18, 18), -1)
        elif scene == 1:
            # 2. Diffusion Surrealism: Hyper-saturated geometric elements with inconsistent specularities
            img[:, :] = [182.0, 192.0, 215.0]
            cv2.rectangle(img, (45, 50), (225, 155), (248, 92, 22), -1)
            cv2.circle(img, (195, 205), 62, (28, 185, 195), -1)
            pts = np.array([[75, 265], [165, 175], [255, 275]], np.int32)
            cv2.fillPoly(img, [pts], (225, 38, 125))
        elif scene == 2:
            # 3. Latent Inpainting: Sharp boundary disparity seam
            img[:, :, 0] = 98.0 + 42.0 * np.sin(x / 48.0)
            img[:, :, 1] = 128.0 + 32.0 * np.cos(y / 42.0)
            img[:, :, 2] = 162.0 + 22.0 * np.sin((x + y) / 58.0)
            patch = np.zeros((120, 120, 3), dtype=np.float32)
            patch[:, :] = [232.0, 162.0, 42.0]
            cv2.circle(patch, (60, 60), 42, (195, 28, 72), -1)
            img[90:210, 90:210] = patch
        elif scene == 3:
            # 4. GAN Transposed-Conv Checkerboard Lattice
            lattice_8 = (np.sin(x * np.pi / 4.0) * np.sin(y * np.pi / 4.0)) * 15.0
            lattice_4 = (((x % 4 < 2) ^ (y % 4 < 2)).astype(np.float32) - 0.5) * 8.5
            base = 142.0 + lattice_8 + lattice_4
            img[:, :, 0] = base + 22.0 * np.cos(x / 32.0)
            img[:, :, 1] = base + 16.0 * np.sin(y / 32.0)
            img[:, :, 2] = base * 0.92
        elif scene == 4:
            # 5. Over-smoothed Diffusion Landscape with sharp contour disparity
            sky = np.linspace(242.0, 188.0, h)[:, None]
            img[:, :, 0] = sky
            img[:, :, 1] = sky * 0.94
            img[:, :, 2] = sky * 1.06
            hill = (y > (155.0 + 32.0 * np.sin(x / 42.0))).astype(np.float32)
            img = img * (1.0 - hill[:, :, None]) + np.array([42.0, 132.0, 72.0], dtype=np.float32) * hill[:, :, None]
        else:
            # 6. Smooth Porcelain Gradient with Sharp Geometric Cuts
            grad = np.linspace(225.0, 165.0, w)[None, :]
            img[:, :, 0] = grad
            img[:, :, 1] = grad * 0.92
            img[:, :, 2] = grad * 1.05
            cv2.circle(img, (150, 150), 75, (25, 45, 85), -1)
            cv2.rectangle(img, (90, 120), (210, 180), (240, 175, 40), -1)

        # Latent Upsampling Lattice Modulation (subtle periodic grid from deconvolution)
        lattice_freq = 4 if (idx % 2 == 0) else 8
        lattice = (np.sin(x * (2.0 * np.pi / lattice_freq)) * np.sin(y * (2.0 * np.pi / lattice_freq))) * 3.8
        for c in range(3):
            img[:, :, c] += lattice

        # Joint VAE Latent Residual Noise across channels
        # High cross-channel covariance and high-kurtosis Laplace tails
        joint_vae = np.random.laplace(0, 5.2, (h, w)).astype(np.float32)
        for c in range(3):
            indep = np.random.laplace(0, 1.4, (h, w)).astype(np.float32)
            img[:, :, c] += (0.86 * joint_vae + 0.14 * indep)

        img = np.clip(img, 0, 255).astype(np.uint8)
        return img

    def __getitem__(self, idx):
        # Even indices: Real / Authentic (0), Odd indices: Synthetic / AI-Generated (1)
        label = idx % 2
        h, w = 300, 300

        if label == 0:
            img_np = self._generate_authentic_specimen(idx, h, w)
        else:
            img_np = self._generate_synthetic_specimen(idx, h, w)

        img_pil = Image.fromarray(img_np, mode='RGB')

        if self.transform:
            tensor = self.transform(img_pil)
        else:
            tensor = transforms.ToTensor()(img_pil)

        return tensor, torch.tensor(label, dtype=torch.long)

class DirectoryDataset(Dataset):
    """
    Loads real and fake images from a directory structured as:
    dataset_dir/
      real/ (or authentic/)
      fake/ (or synthetic/ or ai/)
    """
    def __init__(self, root_dir: str, transform=None):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.samples = []

        valid_exts = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}

        # Look for real/authentic subdirectories
        real_dirs = [self.root_dir / 'real', self.root_dir / 'authentic', self.root_dir / '0']
        fake_dirs = [self.root_dir / 'fake', self.root_dir / 'synthetic', self.root_dir / 'ai', self.root_dir / '1']

        for rd in real_dirs:
            if rd.exists():
                for p in rd.rglob('*'):
                    if p.suffix.lower() in valid_exts:
                        self.samples.append((str(p), 0))

        for fd in fake_dirs:
            if fd.exists():
                for p in fd.rglob('*'):
                    if p.suffix.lower() in valid_exts:
                        self.samples.append((str(p), 1))

        random.shuffle(self.samples)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert('RGB')
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor(label, dtype=torch.long)

def train_model(
    data_dir: str = None,
    epochs: int = 12,
    batch_size: int = 16,
    lr: float = 1e-3,
    num_train: int = 480,
    num_val: int = 120,
    save_path: str = "app/ml/weights/deepfake_vision_model.pth"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training DeepTrace DeepfakeClassifier on device: {device}")

    # Prepare datasets
    if data_dir and os.path.exists(data_dir):
        print(f"[*] Loading dataset from directory: {data_dir}")
        full_ds = DirectoryDataset(data_dir, transform=train_transform)
        if len(full_ds) < 10:
            print("[!] Insufficient images in data_dir, falling back to augmented synthesis benchmark.")
            train_ds = SyntheticBenchDataset(num_samples=num_train, transform=train_transform, is_train=True)
            val_ds = SyntheticBenchDataset(num_samples=num_val, transform=val_transform, is_train=False)
        else:
            val_size = int(0.2 * len(full_ds))
            train_size = len(full_ds) - val_size
            train_ds, val_ds = torch.utils.data.random_split(full_ds, [train_size, val_size])
    else:
        print(f"[*] Initializing enriched synthetic forensic benchmark: {num_train} train, {num_val} val samples...")
        train_ds = SyntheticBenchDataset(num_samples=num_train, transform=train_transform, is_train=True)
        val_ds = SyntheticBenchDataset(num_samples=num_val, transform=val_transform, is_train=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # Initialize model
    model = DeepfakeClassifier(pretrained=True, dropout=0.25).to(device)

    # Freeze early backbone layers for stable fine-tuning of deep semantic/texture representation
    for param in model.backbone.features.parameters():
        param.requires_grad = False
    for param in model.backbone.features[-2:].parameters():
        param.requires_grad = True

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_acc = 0.0
    dest_path = Path(backend_dir) / save_path
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[*] Commencing training loop: {epochs} epochs, {len(train_loader)} batches/epoch")
    for epoch in range(1, epochs + 1):
        start = time.time()
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            train_correct += (preds == labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()
        train_acc = train_correct / train_total

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total
        duration = time.time() - start

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] "
            f"Train Loss: {train_loss/train_total:.4f} | Train Acc: {train_acc*100:.1f}% "
            f"Val Loss: {val_loss/val_total:.4f} | Val Acc: {val_acc*100:.1f}% "
            f"({duration:.1f}s)"
        )

        if val_acc >= best_val_acc or epoch == 1:
            best_val_acc = max(best_val_acc, val_acc)
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'val_acc': val_acc,
                'optimizer_state_dict': optimizer.state_dict(),
                'train_samples': len(train_ds),
                'val_samples': len(val_ds),
                'architecture': 'MobileNetV3-Small',
                'dataset_type': 'SyntheticBenchDataset-Enhanced'
            }, dest_path)

    print(f"\n[+] Training complete! Best validation accuracy: {best_val_acc*100:.2f}%")
    print(f"[+] Model checkpoint successfully saved to: {dest_path}")
    return dest_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train DeepTrace Real vs. Fake Deepfake Vision Classifier")
    parser.add_argument("--data_dir", type=str, default=None, help="Path to dataset containing real/ and fake/ subfolders")
    parser.add_argument("--epochs", type=int, default=12, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--num_train", type=int, default=480, help="Number of synthetic training samples")
    parser.add_argument("--num_val", type=int, default=120, help="Number of synthetic validation samples")
    args = parser.parse_args()

    train_model(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        num_train=args.num_train,
        num_val=args.num_val
    )
