import os
import sys

# Ensure backend directory is in sys.path when running from repo root
_backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from app.main import app  # noqa: F401
