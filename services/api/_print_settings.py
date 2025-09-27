import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
import django
django.setup()
from django.conf import settings

import logging
logger = logging.getLogger(__name__)
logger.info('DEBUG=%s', settings.DEBUG)
logger.info('SECURE_SSL_REDIRECT=%s', getattr(settings, 'SECURE_SSL_REDIRECT', None))
logger.info('ALLOWED_HOSTS=%s', settings.ALLOWED_HOSTS)
logger.info('CORS_ALLOWED_ORIGINS=%s', getattr(settings, 'CORS_ALLOWED_ORIGINS', None))
logger.info('CORS_ALLOW_CREDENTIALS=%s', getattr(settings, 'CORS_ALLOW_CREDENTIALS', None))
logger.info('CSRF_TRUSTED_ORIGINS=%s', getattr(settings, 'CSRF_TRUSTED_ORIGINS', None))

