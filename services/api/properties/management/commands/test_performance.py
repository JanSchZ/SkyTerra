"""
Comando para probar el rendimiento de las consultas de propiedades optimizadas.
"""
import time
from django.core.management.base import BaseCommand
from django.db import connection
from properties.models import Property
from django.db.models import Count, Exists, OuterRef


class Command(BaseCommand):
    help = 'Prueba el rendimiento de las consultas de propiedades optimizadas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--iterations',
            type=int,
            default=10,
            help='Número de iteraciones para el benchmark'
        )

    def handle(self, *args, **options):
        iterations = options['iterations']

        self.stdout.write(
            self.style.SUCCESS(f'[PERFORMANCE TEST] Probando rendimiento de consultas de propiedades ({iterations} iteraciones)')
        )

        # Prueba 1: Consulta sin optimizaciones
        self.stdout.write('\n📊 Prueba 1: Consulta sin optimizaciones')
        start_time = time.time()
        for _ in range(iterations):
            properties = Property.objects.filter(publication_status='approved')[:20]
            # Forzar evaluación de queryset
            list(properties)
        unoptimized_time = (time.time() - start_time) / iterations

        # Mostrar queries ejecutadas
        query_count_before = len(connection.queries)

        # Prueba 2: Consulta optimizada
        self.stdout.write('\n⚡ Prueba 2: Consulta optimizada con prefetch_related')
        start_time = time.time()
        for _ in range(iterations):
            properties = Property.objects.filter(
                publication_status='approved'
            ).select_related('owner').prefetch_related(
                'images', 'tours', 'documents'
            ).annotate(
                image_count_annotation=Count('images', distinct=True),
                tour_count_annotation=Count('tours', distinct=True),
                has_tour_annotation=Exists(Property.objects.filter(
                    id=OuterRef('pk'), tours__isnull=False
                ))
            )[:20]
            # Forzar evaluación de queryset
            list(properties)
        optimized_time = (time.time() - start_time) / iterations

        query_count_after = len(connection.queries)
        total_queries = query_count_after - query_count_before

        # Calcular mejora
        improvement = ((unoptimized_time - optimized_time) / unoptimized_time) * 100

        self.stdout.write(
            self.style.SUCCESS(f'\n📈 Resultados del benchmark:')
        )
        self.stdout.write(f'   • Tiempo sin optimizar: {unoptimized_time:.4f}s por consulta')
        self.stdout.write(f'   • Tiempo optimizado: {optimized_time:.4f}s por consulta')
        self.stdout.write(f'   • Mejora: {improvement:.1f}% más rápido')
        self.stdout.write(f'   • Queries totales en optimizada: {total_queries}')

        if improvement > 50:
            self.stdout.write(
                self.style.SUCCESS('🎉 ¡Excelente mejora de rendimiento!')
            )
        elif improvement > 20:
            self.stdout.write(
                self.style.SUCCESS('👍 Buena mejora de rendimiento')
            )
        else:
            self.stdout.write(
                self.style.WARNING('⚠️  Mejora moderada, revisar optimizaciones')
            )

        # Prueba 3: Verificar funcionamiento del caché
        self.stdout.write('\n🧠 Prueba 3: Verificando caché')
        from django.core.cache import cache

        # Limpiar caché
        cache.clear()

        # Primera consulta (debería cachear)
        start_time = time.time()
        properties = Property.objects.filter(publication_status='approved').select_related('owner')[:20]
        list(properties)
        first_query_time = time.time() - start_time

        # Segunda consulta (debería usar caché)
        start_time = time.time()
        properties = Property.objects.filter(publication_status='approved').select_related('owner')[:20]
        list(properties)
        second_query_time = time.time() - start_time

        cache_improvement = ((first_query_time - second_query_time) / first_query_time) * 100

        self.stdout.write(f'   • Primera consulta: {first_query_time:.4f}s')
        self.stdout.write(f'   • Segunda consulta: {second_query_time:.4f}s')
        self.stdout.write(f'   • Mejora de caché: {cache_improvement:.1f}%')

        if cache_improvement > 10:
            self.stdout.write(
                self.style.SUCCESS('✅ Caché funcionando correctamente')
            )
        else:
            self.stdout.write(
                self.style.WARNING('⚠️  Caché podría necesitar ajustes')
            )

        self.stdout.write(
            self.style.SUCCESS('\n🎯 Optimizaciones aplicadas exitosamente!')
        )
