from django.core.management.base import BaseCommand
from properties.models import Property
from properties.services import categorize_property_with_ai

class Command(BaseCommand):
    help = 'Clasifica y genera resumen IA para propiedades existentes (campos ai_category y ai_summary)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=200, help='Máximo de propiedades a procesar')
        parser.add_argument('--force', action='store_true', help='Recalcular aunque ya exista ai_category/ai_summary')

    def handle(self, *args, **options):
        limit = options['limit']
        force = options['force']
        qs = Property.objects.all().order_by('-updated_at')
        if not force:
            qs = qs.filter(ai_category__isnull=True) | Property.objects.filter(ai_summary__isnull=True)
        processed = 0
        updated = 0
        for prop in qs[:limit]:
            processed += 1
            data = categorize_property_with_ai(prop)
            if data:
                for k, v in data.items():
                    if v:
                        setattr(prop, k, v)
                prop.save(update_fields=[k for k, v in data.items() if v])
                updated += 1
                self.stdout.write(self.style.SUCCESS(f"Propiedad {prop.id} clasificada: {data}"))
        self.stdout.write(self.style.SUCCESS(f"Procesadas {processed}, actualizadas {updated}."))
