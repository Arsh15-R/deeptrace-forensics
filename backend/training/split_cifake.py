import os
import shutil
import random
from pathlib import Path

random.seed(42)

DATA_DIR = Path("backend/training/data")
EXTRACTED = DATA_DIR / "_extracted"

splits = {
    "train": 40000,
    "val": 5000,
    "test": 5000,
}

for cls in ["real", "fake"]:
    src_dir = EXTRACTED / cls
    files = sorted(list(src_dir.glob("*.jpg")) + list(src_dir.glob("*.png")))
    random.shuffle(files)
    
    print(f"[*] Processing {len(files)} files for class '{cls}'...")
    
    start = 0
    for split_name, count in splits.items():
        dst_dir = DATA_DIR / split_name / cls
        dst_dir.mkdir(parents=True, exist_ok=True)
        split_files = files[start:start + count]
        start += count
        
        for f in split_files:
            # Move file into split directory
            f.replace(dst_dir / f.name)
            
        print(f"    -> {split_name}/{cls}: {len(split_files)} files")

# Clean up extracted temp dir
try:
    shutil.rmtree(EXTRACTED)
    print("[*] Cleaned up temporary extracted directory.")
except Exception as e:
    print(f"[!] Warning cleaning extracted dir: {e}")

print("[*] Dataset partitioning successfully completed!")
