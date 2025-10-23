#!/usr/bin/env python3
"""
Script de diagnóstico para el sistema de jobs y ofertas de trabajo.

Este script verifica:
1. Estado de propiedades y jobs
2. Estado de pilotos
3. Coordenadas GPS
4. Matching de ofertas

Uso:
    python tools/diagnose_jobs.py
"""

import os
import sys
import django
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
sys.path.append('services/api')
django.setup()

from properties.models import Property, PilotProfile, Job, JobOffer
from django.contrib.auth.models import User
from django.db.models import Q, Count


def print_header(title):
    """Imprime un encabezado formateado."""
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{'='*50}")


def diagnose_properties():
    """Diagnóstico de propiedades."""
    print_header("DIAGNÓSTICO DE PROPIEDADES")

    total_properties = Property.objects.count()
    approved_properties = Property.objects.filter(publication_status='approved').count()
    approved_for_shoot = Property.objects.filter(workflow_substate='approved_for_shoot').count()
    properties_with_coords = Property.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True).count()

    print(f"Total propiedades: {total_properties}")
    print(f"Propiedades aprobadas: {approved_properties}")
    print(f"Propiedades en approved_for_shoot: {approved_for_shoot}")
    print(f"Propiedades con coordenadas GPS: {properties_with_coords}")

    if approved_for_shoot > 0:
        print("\nPropiedades en approved_for_shoot:")
        for prop in Property.objects.filter(workflow_substate='approved_for_shoot')[:5]:
            print(f"  - {prop.name} (ID: {prop.id}) - Coords: {prop.latitude}, {prop.longitude}")
    else:
        print("\n❌ No hay propiedades en approved_for_shoot - el flujo no se está activando")


def diagnose_pilots():
    """Diagnóstico de pilotos."""
    print_header("DIAGNÓSTICO DE PILOTOS")

    total_pilots = PilotProfile.objects.count()
    approved_pilots = PilotProfile.objects.filter(status='approved').count()
    available_pilots = PilotProfile.objects.filter(status='approved', is_available=True).count()
    pilots_with_coords = PilotProfile.objects.exclude(location_latitude__isnull=True).exclude(location_longitude__isnull=True).count()

    print(f"Total pilotos: {total_pilots}")
    print(f"Pilotos aprobados: {approved_pilots}")
    print(f"Pilotos disponibles: {available_pilots}")
    print(f"Pilotos con coordenadas GPS: {pilots_with_coords}")

    if approved_pilots == 0:
        print("\n❌ No hay pilotos aprobados - el sistema no puede crear ofertas")
        return

    print("\nPilotos aprobados:")
    for pilot in PilotProfile.objects.filter(status='approved')[:10]:
        coords = f"{pilot.location_latitude}, {pilot.location_longitude}" if pilot.location_latitude and pilot.location_longitude else "Sin coordenadas"
        print(f"  - {pilot.user.username}: {pilot.display_name or 'Sin nombre'} - {pilot.status} - {coords}")


def diagnose_jobs():
    """Diagnóstico de jobs."""
    print_header("DIAGNÓSTICO DE JOBS")

    total_jobs = Job.objects.count()
    draft_jobs = Job.objects.filter(status='draft').count()
    inviting_jobs = Job.objects.filter(status='inviting').count()
    assigned_jobs = Job.objects.filter(status='assigned').count()

    print(f"Total jobs: {total_jobs}")
    print(f"Jobs en draft: {draft_jobs}")
    print(f"Jobs en inviting: {inviting_jobs}")
    print(f"Jobs asignados: {assigned_jobs}")

    if total_jobs > 0:
        print("\nJobs recientes:")
        for job in Job.objects.select_related('property', 'assigned_pilot').order_by('-created_at')[:10]:
            pilot_info = f" (Piloto: {job.assigned_pilot.user.username})" if job.assigned_pilot else ""
            print(f"  - Job {job.id}: {job.property.name} - {job.status}{pilot_info}")


def diagnose_offers():
    """Diagnóstico de ofertas."""
    print_header("DIAGNÓSTICO DE OFERTAS")

    total_offers = JobOffer.objects.count()
    pending_offers = JobOffer.objects.filter(status='pending').count()
    accepted_offers = JobOffer.objects.filter(status='accepted').count()
    declined_offers = JobOffer.objects.filter(status='declined').count()

    print(f"Total ofertas: {total_offers}")
    print(f"Ofertas pendientes: {pending_offers}")
    print(f"Ofertas aceptadas: {accepted_offers}")
    print(f"Ofertas declinadas: {declined_offers}")

    if pending_offers > 0:
        print("\nOfertas pendientes por piloto:")
        pending_by_pilot = JobOffer.objects.filter(status='pending').values('pilot__user__username').annotate(count=Count('id')).order_by('-count')
        for item in pending_by_pilot[:10]:
            print(f"  - {item['pilot__user__username']}: {item['count']} ofertas")


def diagnose_matching():
    """Diagnóstico del sistema de matching."""
    print_header("DIAGNÓSTICO DEL MATCHING")

    try:
        from properties.matching import MATCHING_DEFAULTS
        print(f"Configuración de matching: {MATCHING_DEFAULTS}")

        # Verificar si hay propiedades que deberían generar jobs
        properties_approved = Property.objects.filter(publication_status='approved')
        properties_needs_job = properties_approved.exclude(workflow_substate__in=['approved_for_shoot', 'inviting', 'assigned'])

        print(f"Propiedades aprobadas que necesitan job: {properties_needs_job.count()}")

        if properties_needs_job.count() > 0:
            print("\nEstas propiedades deberían activar el flujo de creación de jobs:")
            for prop in properties_needs_job[:5]:
                print(f"  - {prop.name} (ID: {prop.id}) - Estado: {prop.workflow_substate}")

        # Verificar pilotos disponibles para matching
        available_pilots = PilotProfile.objects.filter(status='approved', is_available=True)
        pilots_with_coords = available_pilots.exclude(location_latitude__isnull=True).exclude(location_longitude__isnull=True)

        print(f"Pilotos disponibles para matching: {available_pilots.count()}")
        print(f"Pilotos con coordenadas: {pilots_with_coords.count()}")

        if pilots_with_coords.count() == 0:
            print("\n❌ No hay pilotos con coordenadas GPS - el matching no puede funcionar")

    except ImportError as e:
        print(f"❌ Error importando matching: {e}")


def main():
    """Función principal de diagnóstico."""
    print("🚀 DIAGNÓSTICO DEL SISTEMA DE JOBS")
    print("=" * 60)

    try:
        diagnose_properties()
        diagnose_pilots()
        diagnose_jobs()
        diagnose_offers()
        diagnose_matching()

        print_header("RESUMEN")

        # Verificar estado general del sistema
        approved_for_shoot = Property.objects.filter(workflow_substate='approved_for_shoot').count()
        available_pilots = PilotProfile.objects.filter(status='approved', is_available=True).count()
        pilots_with_coords = PilotProfile.objects.exclude(location_latitude__isnull=True).exclude(location_longitude__isnull=True).count()

        if approved_for_shoot > 0:
            print("✅ Hay propiedades que deberían generar jobs")
        else:
            print("❌ No hay propiedades en approved_for_shoot")

        if available_pilots > 0:
            print("✅ Hay pilotos disponibles")
        else:
            print("❌ No hay pilotos disponibles")

        if pilots_with_coords > 0:
            print("✅ Hay pilotos con coordenadas GPS")
        else:
            print("❌ No hay pilotos con coordenadas GPS")

        if approved_for_shoot > 0 and available_pilots > 0 and pilots_with_coords > 0:
            print("\n🎯 El sistema debería estar funcionando correctamente")
            print("   Si no ves ofertas, revisa los logs del servidor para ver qué está pasando")
        else:
            print("\n⚠️  El sistema tiene problemas que impiden crear ofertas")

    except Exception as e:
        print(f"❌ Error durante el diagnóstico: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
