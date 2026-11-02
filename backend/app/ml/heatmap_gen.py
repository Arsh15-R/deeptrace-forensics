"""
DeepTrace Forensic Heatmap Generator
Provides:
  1. Grad-CAM visual explanation from the trained neural network's final convolutional layer.
  2. Fallback procedural Error Level Analysis (ELA) and high-frequency residual heatmap.
Both output an RGBA PNG with an alpha channel suitable for forensic glassmorphic overlays.
"""

import io
import math
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
import numpy as np

try:
    import torch
    import torch.nn.functional as F
except ImportError:
    torch = None
    F = None


def _get_last_conv_layer(model):
    """Finds the last 2D convolutional layer in the backbone."""
    for name, module in reversed(list(model.named_modules())):
        if isinstance(module, torch.nn.Conv2d):
            return module
    return None


def generate_gradcam_heatmap(model, input_tensor, orig_image_bytes: bytes) -> bytes:
    """
    Computes Grad-CAM from the trained model's last convolutional layer.
    Visualizes regions most responsible for the AI/synthetic classification.
    """
    if torch is None or model is None or input_tensor is None:
        return generate_ela_heatmap(orig_image_bytes)

    try:
        orig = Image.open(io.BytesIO(orig_image_bytes)).convert("RGB")
        w, h = orig.size

        # Find target layer
        target_layer = _get_last_conv_layer(model)
        if target_layer is None:
            return generate_ela_heatmap(orig_image_bytes)

        activations = []
        gradients = []

        def forward_hook(module, input, output):
            activations.append(output)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        fh = target_layer.register_forward_hook(forward_hook)
        bh = target_layer.register_full_backward_hook(backward_hook)

        # Forward pass
        model.eval()
        input_tensor = input_tensor.clone().requires_grad_(True)
        logits = model(input_tensor)

        # Backpropagate for class 1 (Fake/Synthetic)
        target_class = 1 if logits.shape[1] > 1 else 0
        score = logits[:, target_class].sum()
        model.zero_grad()
        score.backward()

        fh.remove()
        bh.remove()

        if not activations or not gradients:
            return generate_ela_heatmap(orig_image_bytes)

        act = activations[0].detach()  # [B, C, H, W]
        grad = gradients[0].detach()   # [B, C, H, W]

        # Global average pool gradients to get channel weights
        weights = torch.mean(grad, dim=(2, 3), keepdim=True)  # [B, C, 1, 1]
        cam = torch.sum(weights * act, dim=1, keepdim=True)     # [B, 1, H, W]
        cam = F.relu(cam)

        # Upsample CAM to original image size
        cam = F.interpolate(cam, size=(h, w), mode="bilinear", align_corners=False)
        cam = cam.squeeze().cpu().numpy()

        # Normalize to [0, 1]
        cam_min, cam_max = np.min(cam), np.max(cam)
        if cam_max > cam_min:
            cam_norm = (cam - cam_min) / (cam_max - cam_min + 1e-8)
        else:
            cam_norm = np.zeros_like(cam)

        # Map to RGBA forensic heat colormap: Transparent -> Cyan -> Yellow -> Neon Red
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[..., 0] = np.clip((cam_norm - 0.2) / 0.8 * 255, 0, 255).astype(np.uint8)
        rgba[..., 1] = np.clip(np.sin(cam_norm * math.pi) * 220, 0, 255).astype(np.uint8)
        rgba[..., 2] = np.clip((1.0 - cam_norm) * 180, 0, 255).astype(np.uint8)
        rgba[..., 3] = np.clip((cam_norm ** 1.2) * 210, 0, 210).astype(np.uint8)

        heatmap_img = Image.fromarray(rgba, mode="RGBA")
        heatmap_img = heatmap_img.filter(ImageFilter.GaussianBlur(radius=2))

        out_buf = io.BytesIO()
        heatmap_img.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue()

    except Exception:
        return generate_ela_heatmap(orig_image_bytes)


def generate_ela_heatmap(image_bytes: bytes) -> bytes:
    """
    Generates a calibrated forensic Error Level Analysis (ELA) and high-frequency
    residual heatmap with an RGBA alpha channel suitable for glassmorphic overlay.
    """
    try:
        orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = orig.size

        # Error Level Analysis
        buffer = io.BytesIO()
        orig.save(buffer, "JPEG", quality=90)
        buffer.seek(0)
        recompressed = Image.open(buffer)

        diff = ImageChops.difference(orig, recompressed)
        enhancer = ImageEnhance.Brightness(diff)
        diff_enhanced = enhancer.enhance(12.0)

        gray_orig = orig.convert("L")
        edges = gray_orig.filter(ImageFilter.FIND_EDGES)

        diff_arr = np.array(diff_enhanced.convert("L"), dtype=np.float32)
        edge_arr = np.array(edges, dtype=np.float32)

        combined = (diff_arr * 0.7) + (edge_arr * 0.3)
        combined = np.clip(combined, 0, 255)
        norm = combined / 255.0

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        r = np.clip((norm - 0.2) / 0.8 * 255, 0, 255)
        g = np.clip(np.sin(norm * math.pi) * 220, 0, 255)
        b = np.clip((1.0 - norm) * 180, 0, 255)
        alpha = np.clip((norm ** 1.3) * 210, 0, 210)

        rgba[..., 0] = r.astype(np.uint8)
        rgba[..., 1] = g.astype(np.uint8)
        rgba[..., 2] = b.astype(np.uint8)
        rgba[..., 3] = alpha.astype(np.uint8)

        heatmap_img = Image.fromarray(rgba, mode="RGBA")
        heatmap_img = heatmap_img.filter(ImageFilter.GaussianBlur(radius=2))

        out_buf = io.BytesIO()
        heatmap_img.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue()

    except Exception:
        fallback = Image.new("RGBA", (800, 600), (255, 69, 58, 60))
        out_buf = io.BytesIO()
        fallback.save(out_buf, format="PNG")
        return out_buf.getvalue()


def generate_forensic_heatmap(image_bytes: bytes, model=None, input_tensor=None) -> bytes:
    """Unified entry point: prefers Grad-CAM when model is supplied, falls back to ELA."""
    if model is not None and input_tensor is not None:
        return generate_gradcam_heatmap(model, input_tensor, image_bytes)
    return generate_ela_heatmap(image_bytes)
