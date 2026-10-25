import torch
import torch.nn as nn
import torchvision.models as models

class DeepfakeClassifier(nn.Module):
    """
    Deep learning classifier for detecting Real (Authentic) vs. Synthetic (AI-Generated / Deepfake) images.
    Uses MobileNetV3-Small backbone with a custom binary classification head.
    """
    def __init__(self, pretrained: bool = True, dropout: float = 0.25):
        super().__init__()
        # Load backbone
        weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        self.backbone = models.mobilenet_v3_small(weights=weights)
        
        # Replace the ImageNet 1000-class classifier head with a 2-class head
        # Class 0: Authentic (Real)
        # Class 1: Synthetic (AI-Generated / Manipulated)
        in_features = self.backbone.classifier[0].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(256, 64),
            nn.Hardswish(),
            nn.Dropout(p=dropout / 2.0),
            nn.Linear(64, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def predict_probability(self, x: torch.Tensor) -> tuple[float, float]:
        """
        Returns (prob_real, prob_fake)
        """
        self.eval()
        with torch.no_grad():
            logits = self(x)
            probs = torch.softmax(logits, dim=1)[0]
            return float(probs[0].item()), float(probs[1].item())
