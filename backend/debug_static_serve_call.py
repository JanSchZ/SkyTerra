import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
django.setup()

from django.conf import settings
from django.http import HttpRequest
from django.views.static import serve

path = 'tours/4cc7af84-e588-417c-9289-1a57d8331661/test pano2vr/output/index.html'
req = HttpRequest()
req.method = 'GET'
req.path = f'/media/{path}'
req.META = {}

resp = serve(req, path=path, document_root=settings.MEDIA_ROOT)
print('Status:', resp.status_code)
print('Headers:', dict(resp.items()))
print('Content length reported:', resp.get('Content-Length'))

