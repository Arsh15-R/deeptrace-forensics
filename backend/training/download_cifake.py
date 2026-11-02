import os
import sys
import zipfile
import urllib.request
from pathlib import Path
import shutil

DATA_DIR = Path("backend/training/data")
ZIP_URL = "https://huggingface.co/datasets/yanbax/CIFAKE_autotrain_compatible/resolve/main/train.zip"
ZIP_PATH = DATA_DIR / "cifake_train.zip"

def download_and_setup_cifake():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    if not ZIP_PATH.exists():
        print(f"[*] Downloading CIFAKE dataset from {ZIP_URL} (~85.6 MB)...")
        def report_hook(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100.0, downloaded * 100 / total_size)
                mb = downloaded / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                sys.stdout.write(f"\r    -> {percent:5.1f}% ({mb:5.1f} / {total_mb:5.1f} MB)")
                sys.stdout.flush()

        urllib.request.urlretrieve(ZIP_URL, str(ZIP_PATH), reporthook=report_hook)
        print("\n[*] Download complete.")
    else:
        print(f"[*] Found existing archive at {ZIP_PATH}")

    extract_tmp = DATA_DIR / "_extracted"
    extract_tmp.mkdir(exist_ok=True)
    
    print("[*] Extracting archive...")
    with zipfile.ZipFile(str(ZIP_PATH), "r") as zf:
        zf.extractall(str(extract_tmp))
    print("[*] Extraction complete.")

    # Inspect structure
    print("[*] Contents of extracted archive:")
    for item in extract_tmp.iterdir():
        print(f"    - {item.name} ({'dir' if item.is_dir() else 'file'})")

if __name__ == "__main__":
    download_and_setup_cifake()
