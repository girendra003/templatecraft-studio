"""Rebuild the single fictional sample and demo stamps using existing PDF dependencies."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.sample import write_sample_assets
if __name__ == '__main__':
    write_sample_assets(ROOT)
    print('Generated fictional sample template, data and demo stamps.')
