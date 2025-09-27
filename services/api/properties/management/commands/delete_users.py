from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Deletes all user accounts.'

    def handle(self, *args, **options):
        User = get_user_model()
        # Delete all user accounts
        users_to_delete = User.objects.all()
        
        if not users_to_delete.exists():
            self.stdout.write(self.style.SUCCESS('No user accounts to delete.'))
            return

        count = users_to_delete.count()
        users_to_delete.delete()
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} user accounts.'))
