import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
django.setup()

from django.urls import resolve
from django.conf import settings

url = '/media/tours/4cc7af84-e588-417c-9289-1a57d8331661/test pano2vr/output/index.html'
match = resolve(url)
print('View func:', getattr(match.func, '__name__', str(match.func)))
print('Kwargs:', match.kwargs)
print('Settings MEDIA_ROOT:', settings.MEDIA_ROOT)

