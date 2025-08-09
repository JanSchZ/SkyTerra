import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
import django
django.setup()
from django.conf import settings

print('DEBUG=', settings.DEBUG)
print('SECURE_SSL_REDIRECT=', getattr(settings, 'SECURE_SSL_REDIRECT', None))
print('ALLOWED_HOSTS=', settings.ALLOWED_HOSTS)
print('CORS_ALLOWED_ORIGINS=', getattr(settings, 'CORS_ALLOWED_ORIGINS', None))
print('CORS_ALLOW_CREDENTIALS=', getattr(settings, 'CORS_ALLOW_CREDENTIALS', None))
print('CSRF_TRUSTED_ORIGINS=', getattr(settings, 'CSRF_TRUSTED_ORIGINS', None))

