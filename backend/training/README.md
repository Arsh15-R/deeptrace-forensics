# DeepTrace Training Pipeline

This directory provides the complete training, evaluation, and temperature calibration pipeline for fine-tuning deep visual forensic models (`efficientnet_b0` or `convnext_tiny`) on the NVIDIA RTX 3050 (6 GB VRAM) to distinguish authentic photographs from AI-generated / synthetic images.

---

## 1. Directory Structure

Place your dataset images inside `backend/training/data/` (or create a symlink / pass `--data_dir` to the scripts) structured as standard `ImageFolder` splits:

```
backend/training/data/
├── train/
│   ├── real/      # Genuine camera photographs
│   └── fake/      # Synthetic / Diffusion / GAN generated images
├── val/
│   ├── real/
│   └── fake/
└── test/
    ├── real/
    └── fake/
```

> **Note:** No datasets are downloaded automatically. You must download and place images manually into the directories above.

---

## 2. Recommended Datasets

### A. CIFAKE Dataset (Recommended Starter ~105 MB)
- **Source**: [Kaggle - CIFAKE: Real and AI-Generated Synthetic Images](https://www.kaggle.com/datasets/birdy654/cifake-real-and-ai-generated-synthetic-images)
- **Images**: 60,000 Real (CIFAR-10) and 60,000 Synthetic (Stable Diffusion v1.4).
- **Setup**:
  ```powershell
  # Using Kaggle CLI
  kaggle datasets download -d birdy654/cifake-real-and-ai-generated-synthetic-images
  Expand-Archive cifake-real-and-ai-generated-synthetic-images.zip -DestinationPath backend/training/data/
  ```

### B. 140k Real and Fake Faces (~1.7 GB)
- **Source**: [Kaggle - 140k Real and Fake Faces](https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces)
- **Images**: 70,000 Real (FFHQ Flickr portraits) and 70,000 Synthetic (StyleGAN).
- **Setup**: Extract into `data/train`, `data/val`, and `data/test`.

### C. GenImage / ArtiFact Subsets (HuggingFace / Zenodo)
- **Source**: [Hugging Face GenImage](https://huggingface.co/datasets/GenImage)
- **Covers**: Midjourney, DALL-E 3, SDXL, ADM, VQ-DM, and Wukong generators against real ImageNet validation scenes.

---

## 3. Training & Evaluation Commands

### Step 1: Install Dependencies
```powershell
# In PowerShell:
pip install -r backend/training/requirements-train.txt
```

### Step 2: Train Model
Fine-tune EfficientNet-B0 with mixed precision (fp16) on GPU:
```powershell
python backend/training/train.py --data_dir backend/training/data --model_name efficientnet_b0 --epochs 10 --batch_size 32 --lr 3e-4 --amp
```

### Step 3: Calibrate Probabilities
Fit temperature scaling on the validation set to eliminate overconfidence and minimize Expected Calibration Error (ECE):
```powershell
python backend/training/calibrate.py --data_dir backend/training/data --model_path backend/models/detector.pt --config_path backend/models/config.json
```

### Step 4: Evaluate Robustness
Compute test metrics (Accuracy, Precision, Recall, F1, ROC-AUC, FPR, FNR, confusion matrix) and test robustness against JPEG-50, 50% downscaling, and screenshot simulation:
```powershell
python backend/training/evaluate.py --data_dir backend/training/data --model_path backend/models/detector.pt --config_path backend/models/config.json
```
