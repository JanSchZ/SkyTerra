import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
django.setup()

from django.conf import settings
from django.utils._os import safe_join
from urllib.parse import unquote

def inspect(path: str):
    print("DEBUG:")
    print("  DEBUG:", settings.DEBUG)
    print("  MEDIA_ROOT:", settings.MEDIA_ROOT)
    print("  MEDIA_URL:", settings.MEDIA_URL)
    print("  raw path:", path)
    upath = unquote(path)
    print("  unquoted:", upath)
    full = safe_join(settings.MEDIA_ROOT, upath)
    print("  full path:", full)
    print("  exists?:", os.path.exists(full))
    if os.path.exists(full):
        print("  size:", os.path.getsize(full))

if __name__ == "__main__":
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else ''
    inspect(p)

