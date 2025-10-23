from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.core.management import call_command


def create_listing_plans(sender, **kwargs):
    """Create default listing plans if they don't exist"""
    try:
        call_command('create_listing_plans', verbosity=0)
    except Exception as e:
        # Don't fail if command doesn't exist or fails
        pass


class PropertiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'properties'

    def ready(self):
        post_migrate.connect(create_listing_plans, sender=self)
