import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Creates a default superuser if it does not exist. Credentials can be provided via env vars ADMIN_USERNAME and ADMIN_PASSWORD."

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.getenv('ADMIN_USERNAME', 'admin')
        password = os.getenv('ADMIN_PASSWORD', 'SkyTerra3008%')
        email = os.getenv('ADMIN_EMAIL', 'admin@example.com')

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.NOTICE(f"Superuser '{username}' already exists."))
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created successfully.")) 