"""
DeepTrace Training Augmentations Pipeline
Simulates real-world degradation conditions:
  - Random JPEG recompression (Q: 30-95)
  - Downscaling + upscaling
  - Gaussian blur & color jitter
  - Screenshot simulation (aspect framing, compression, UI border)
Crucial requirement: applied identically to both Real and Fake classes so the network
does NOT learn compression artifacts as a shortcut discriminator.
"""

import io
import random
from typing import Tuple, Callable
from PIL import Image, ImageOps, ImageFilter
import numpy as np

try:
    import torch
    import torchvision.transforms as T
    import torchvision.transforms.functional as TF
except ImportError:
    torch = None
    T = None
    TF = None


class RandomJPEGCompression:
    """Randomly re-compresses PIL image using JPEG at quality 30-95."""
    def __init__(self, quality_range: Tuple[int, int] = (30, 95), p: float = 0.7):
        self.quality_range = quality_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return img
        quality = random.randint(self.quality_range[0], self.quality_range[1])
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        return Image.open(buf).convert("RGB")


class RandomDownscaleUpscale:
    """Simulates resolution loss by downscaling then upscaling."""
    def __init__(self, scale_range: Tuple[float, float] = (0.5, 0.85), p: float = 0.5):
        self.scale_range = scale_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return img
        w, h = img.size
        scale = random.uniform(self.scale_range[0], self.scale_range[1])
        down_w, down_h = max(32, int(w * scale)), max(32, int(h * scale))
        down = img.resize((down_w, down_h), Image.Resampling.BILINEAR)
        return down.resize((w, h), Image.Resampling.BICUBIC)


class ScreenshotSimulation:
    """
    Simulates screenshot capture:
      1. Scales image inside a simulated viewport
      2. Optional dark/light UI bar or padding
      3. JPEG compression artifacting commonly seen in messaging app screenshots
    """
    def __init__(self, p: float = 0.4):
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return img

        w, h = img.size
        # Simulate slight padding or top status bar
        pad_top = int(h * random.uniform(0.04, 0.08))
        pad_bottom = int(h * random.uniform(0.02, 0.05))

        # Create screen canvas
        canvas_h = h + pad_top + pad_bottom
        bg_color = (18, 18, 20) if random.random() > 0.4 else (245, 245, 247)
        canvas = Image.new("RGB", (w, canvas_h), bg_color)
        canvas.paste(img, (0, pad_top))

        # Crop back to central target region
        cropped = canvas.crop((0, 0, w, h))

        # Re-encode as mobile screenshot JPEG
        q = random.randint(55, 85)
        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=q)
        buf.seek(0)
        return Image.open(buf).convert("RGB")


def get_train_transforms(image_size: int = 224) -> Callable:
    """
    Composite training augmentation pipeline:
    Includes screenshot simulation and JPEG compression on BOTH classes.
    """
    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    
    return T.Compose([
        T.RandomResizedCrop(image_size, scale=(0.75, 1.0)),
        T.RandomHorizontalFlip(p=0.5),
        ScreenshotSimulation(p=0.35),
        RandomJPEGCompression(quality_range=(30, 95), p=0.65),
        RandomDownscaleUpscale(scale_range=(0.5, 0.85), p=0.4),
        T.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.04),
        T.ToTensor(),
        normalize
    ])


def get_val_transforms(image_size: int = 224) -> Callable:
    """Standard evaluation transformation (clean evaluation)."""
    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    return T.Compose([
        T.Resize(int(image_size * 1.14)),
        T.CenterCrop(image_size),
        T.ToTensor(),
        normalize
    ])


def get_jpeg50_transforms(image_size: int = 224) -> Callable:
    """Robustness stress test: fixed JPEG quality 50."""
    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    return T.Compose([
        RandomJPEGCompression(quality_range=(50, 50), p=1.0),
        T.Resize(int(image_size * 1.14)),
        T.CenterCrop(image_size),
        T.ToTensor(),
        normalize
    ])


def get_downscale50_transforms(image_size: int = 224) -> Callable:
    """Robustness stress test: fixed 50% resolution downscaling."""
    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    return T.Compose([
        RandomDownscaleUpscale(scale_range=(0.5, 0.5), p=1.0),
        T.Resize(int(image_size * 1.14)),
        T.CenterCrop(image_size),
        T.ToTensor(),
        normalize
    ])


def get_screenshot_transforms(image_size: int = 224) -> Callable:
    """Robustness stress test: mandatory screenshot framing and re-encode."""
    normalize = T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    return T.Compose([
        ScreenshotSimulation(p=1.0),
        T.Resize(int(image_size * 1.14)),
        T.CenterCrop(image_size),
        T.ToTensor(),
        normalize
    ])
