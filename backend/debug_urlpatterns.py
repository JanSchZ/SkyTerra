import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
django.setup()

from django.conf import settings
from skyterra_backend import urls
from django.urls.resolvers import URLPattern, URLResolver

def flatten(urlpatterns, prefix=''):
    for p in urlpatterns:
        if isinstance(p, URLPattern):
            print('PATTERN', prefix + str(p.pattern))
        elif isinstance(p, URLResolver):
            print('RESOLVER', prefix + str(p.pattern))
            try:
                flatten(p.url_patterns, prefix + str(p.pattern))
            except Exception:
                pass

print('DEBUG:', settings.DEBUG)
flatten(urls.urlpatterns)

