from collections import defaultdict, Counter
from statistics import mean, median

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import models
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import timedelta
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import Job, PilotProfile, Property
from support_tickets.models import Ticket

from .serializers import UserSerializer  # Import the new serializer


def _serialize_actor(actor):
    """Return a JSON-serializable representation of an actor."""
    if not actor:
        return None

    if isinstance(actor, dict):
        return actor

    try:
        return {
            'id': getattr(actor, 'id', None),
            'username': getattr(actor, 'username', None),
            'email': getattr(actor, 'email', None),
            'first_name': getattr(actor, 'first_name', None),
            'last_name': getattr(actor, 'last_name', None),
            'full_name': actor.get_full_name() if hasattr(actor, 'get_full_name') else None,
        }
    except Exception:
        return None


def _serialize_timeline_payload(timeline):
    serialized = []
    for entry in timeline or []:
        entry_copy = entry.copy()

        events = []
        for event in entry.get('events', []):
            event_copy = event.copy()
            event_copy['actor'] = _serialize_actor(event.get('actor'))
            events.append(event_copy)
        entry_copy['events'] = events

        current_event = entry.get('current_event')
        if current_event:
            current_copy = current_event.copy()
            current_copy['actor'] = _serialize_actor(current_event.get('actor'))
            entry_copy['current_event'] = current_copy
        else:
            entry_copy['current_event'] = None

        serialized.append(entry_copy)
    return serialized

User = get_user_model()

class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        last_7_days_start = now - timedelta(days=7)
        last_month_start = now - timedelta(days=30)

        properties_qs = (
            Property.objects.select_related('plan', 'owner')
            .prefetch_related('status_history')
            .order_by('-created_at')
        )
        pilot_profiles = list(
            PilotProfile.objects.select_related('user').prefetch_related(
                'assigned_jobs__property'
            )
        )

        workflow_nodes = [node for node, _ in Property.WORKFLOW_NODE_CHOICES]
        workflow_counts = {node: 0 for node in workflow_nodes}
        duration_samples = defaultdict(list)
        expected_samples = defaultdict(list)
        sla_breaches = defaultdict(int)

        properties_in_progress = []
        alerts_total = 0
        published_today = 0

        for property_instance in properties_qs:
            workflow_counts[property_instance.workflow_node] = workflow_counts.get(property_instance.workflow_node, 0) + 1
            if property_instance.workflow_alerts:
                alerts_total += len(property_instance.workflow_alerts)

            timeline = _serialize_timeline_payload(property_instance.build_workflow_timeline())
            active_entry = next((entry for entry in timeline if entry.get('state') == 'active'), None)
            last_entry = timeline[-1] if timeline else None
            stage_entry = active_entry or last_entry

            if stage_entry and (property_instance.workflow_node != 'live' or stage_entry.get('state') != 'done'):
                last_event = stage_entry.get('current_event')
                properties_in_progress.append({
                    'id': property_instance.id,
                    'name': property_instance.name,
                    'owner_email': getattr(property_instance.owner, 'email', None),
                    'owner_name': property_instance.owner.get_full_name() if getattr(property_instance.owner, 'get_full_name', None) else None,
                    'plan_name': property_instance.plan.name if property_instance.plan else None,
                    'workflow_node': property_instance.workflow_node,
                    'workflow_label': stage_entry.get('label'),
                    'stage_state': stage_entry.get('state'),
                    'stage_duration_hours': stage_entry.get('duration_hours'),
                    'stage_duration_days': stage_entry.get('duration_days'),
                    'last_event': last_event,
                    'timeline': timeline,
                })

            for entry in timeline:
                node_key = entry.get('key')
                duration = entry.get('duration_hours')
                expected = entry.get('expected_hours')

                if duration is not None and node_key:
                    duration_samples[node_key].append(duration)
                    if expected is not None:
                        expected_samples[node_key].append(expected)
                        if duration > expected:
                            sla_breaches[node_key] += 1

                if node_key == 'live' and entry.get('started_at'):
                    started_at = parse_datetime(entry['started_at'])
                    if started_at and started_at.date() == today:
                        published_today += 1

        # Ordenar por mayor tiempo en etapa y limitar lista
        properties_in_progress.sort(
            key=lambda item: (item['stage_duration_hours'] or 0),
            reverse=True,
        )
        properties_in_progress = properties_in_progress[:20]

        def summarize_stage(node_key):
            samples = duration_samples.get(node_key, [])
            expected = expected_samples.get(node_key, [])
            if not samples:
                return {
                    'average_hours': None,
                    'average_days': None,
                    'median_hours': None,
                    'median_days': None,
                    'expected_hours': mean(expected) if expected else None,
                    'expected_days': (mean(expected) / 24) if expected else None,
                    'samples': 0,
                    'sla_breaches': sla_breaches.get(node_key, 0),
                }

            avg_hours = mean(samples)
            med_hours = median(samples)
            avg_expected = mean(expected) if expected else None

            return {
                'average_hours': round(avg_hours, 2),
                'average_days': round(avg_hours / 24, 2),
                'median_hours': round(med_hours, 2),
                'median_days': round(med_hours / 24, 2),
                'expected_hours': round(avg_expected, 2) if avg_expected is not None else None,
                'expected_days': round(avg_expected / 24, 2) if avg_expected is not None else None,
                'samples': len(samples),
                'sla_breaches': sla_breaches.get(node_key, 0),
            }

        stage_duration_stats = {
            node: summarize_stage(node)
            for node in workflow_nodes
        }

        # Métricas adicionales
        pending_properties = workflow_counts.get('review', 0)
        live_properties = workflow_counts.get('live', 0)
        from django.db.models.functions import TruncDate

        properties_by_day = (
            Property.objects.filter(created_at__gte=last_7_days_start)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .order_by('day')
            .annotate(count=models.Count('id'))
        )

        properties_last_week = Property.objects.filter(created_at__gte=last_7_days_start, created_at__lte=now).count()
        properties_last_month = Property.objects.filter(created_at__gte=last_month_start, created_at__lte=now).count()
        average_property_size_data = Property.objects.aggregate(avg_size=Avg('size'))
        average_property_size = average_property_size_data['avg_size']

        open_tickets = Ticket.objects.filter(status__in=['new', 'in_progress', 'on_hold']).count()
        new_users = User.objects.filter(date_joined__gte=last_7_days_start).count()

        active_jobs = Job.objects.filter(status__in=['inviting', 'assigned', 'scheduling', 'scheduled', 'shooting']).count()
        postproduction_jobs = Job.objects.filter(status__in=['uploading', 'received', 'qc', 'editing', 'preview_ready', 'ready_for_publish']).count()

        pilot_status_counts = Counter(profile.status for profile in pilot_profiles)
        pilots_available = sum(1 for profile in pilot_profiles if profile.status == 'approved' and profile.is_available)
        pilots_unavailable = sum(1 for profile in pilot_profiles if profile.status == 'approved' and not profile.is_available)
        pilot_region_activity = defaultdict(lambda: {'available': 0, 'unavailable': 0})

        for profile in pilot_profiles:
            assigned_jobs_manager = getattr(profile, 'assigned_jobs', None)
            assigned_jobs = assigned_jobs_manager.all() if assigned_jobs_manager is not None else []
            regions = {
                job.property.address_region
                for job in assigned_jobs
                if getattr(job, 'property', None) and job.property.address_region
            }
            if not regions:
                regions = {'Sin region'}
            availability_key = 'available' if profile.status == 'approved' and profile.is_available else 'unavailable'
            for region in regions:
                pilot_region_activity[region][availability_key] += 1

        pilot_summary = {
            'total': len(pilot_profiles),
            'status_counts': dict(pilot_status_counts),
            'availability': {
                'available': pilots_available,
                'unavailable': pilots_unavailable,
            },
            'region_activity': [
                {
                    'region': region,
                    'available': counts['available'],
                    'unavailable': counts['unavailable'],
                }
                for region, counts in sorted(
                    pilot_region_activity.items(),
                    key=lambda item: item[1]['available'] + item[1]['unavailable'],
                    reverse=True,
                )
            ],
        }

        return Response({
            'pending_properties': pending_properties,
            'live_properties': live_properties,
            'published_today': published_today,
            'open_tickets': open_tickets,
            'new_users': new_users,
            'workflow_counts': workflow_counts,
            'stage_duration_stats': stage_duration_stats,
            'properties_in_progress': properties_in_progress,
            'alerts_total': alerts_total,
            'properties_by_day': list(properties_by_day),
            'properties_last_week': properties_last_week,
            'properties_last_month': properties_last_month,
            'average_property_size': average_property_size if average_property_size is not None else 0,
            'active_jobs': active_jobs,
            'postproduction_jobs': postproduction_jobs,
            'pilots_available': pilots_available,
            'pilot_summary': pilot_summary,
        })

class AdminUserListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-date_joined')

class AdminDashboardStatsView(APIView):
    """Return aggregated counts of properties by publication status for admin charts."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Count properties in each publication status category
        pending = Property.objects.filter(publication_status='pending').count()
        approved = Property.objects.filter(publication_status='approved').count()
        rejected = Property.objects.filter(publication_status='rejected').count()

        return Response({
            "pending_properties": pending,
            "approved_properties": approved,
            "rejected_properties": rejected,
        })

class AdminPlanMetricsView(APIView):
    """
    Provides metrics related to user subscription plans for the admin dashboard.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        """
        Returns the distribution of users across different subscription plans.
        """
        plan_distribution = Group.objects.annotate(
            user_count=Count('user')
        ).values(
            'name', 
            'user_count'
        ).order_by('-user_count')

        # Opcional: filtrar solo grupos que representen planes si hay otros tipos de grupos
        # plan_distribution = plan_distribution.filter(name__contains='-')

        return Response({
            'plan_distribution': list(plan_distribution)
        })
