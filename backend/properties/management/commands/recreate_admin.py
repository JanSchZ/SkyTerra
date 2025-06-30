from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = "Deletes the default superuser if it exists and then recreates it. Credentials can be provided via command-line arguments, env vars ADMIN_USERNAME and ADMIN_PASSWORD."

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username for the superuser')
        parser.add_argument('--password', type=str, help='Password for the superuser')
        parser.add_argument('--email', type=str, help='Email for the superuser')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username'] or os.getenv('ADMIN_USERNAME', 'admin')
        password = options['password'] or os.getenv('ADMIN_PASSWORD', 'SkyTerra3008%')
        email = options['email'] or os.getenv('ADMIN_EMAIL', 'admin@example.com')

        if not username or not password or not email:
            self.stdout.write(self.style.ERROR("Username, password, and email are required to create a superuser. Provide them via --username, --password, --email arguments or ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL environment variables."))
            return

        self.stdout.write(self.style.NOTICE(f"Attempting to recreate superuser '{username}'..."))

        # Check if superuser exists and delete it
        if User.objects.filter(username=username).exists():
            User.objects.filter(username=username).delete()
            self.stdout.write(self.style.SUCCESS(f"Existing superuser '{username}' deleted successfully."))
        else:
            self.stdout.write(self.style.NOTICE(f"Superuser '{username}' does not exist. Proceeding with creation."))

        # Create the superuser
        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' recreated successfully.")) 