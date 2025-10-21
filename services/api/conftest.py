import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skyterra_backend.settings")

import django
from django.core.management import call_command


def pytest_configure():
    django.setup()
    # Ensure the SQLite test database has the required schema before running tests
    call_command("migrate", run_syncdb=True, verbosity=0)
