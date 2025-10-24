from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import datetime
from payments.models import Subscription


class SubscriptionApplyStripePayloadTestCase(TestCase):
    """Test cases for Subscription.apply_stripe_payload method."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.subscription = Subscription.objects.create(user=self.user)

    def test_apply_stripe_payload_with_iso8601_datetime(self):
        """Test that ISO8601 datetime strings are properly parsed."""
        # Test with ISO8601 format (with timezone)
        iso_datetime = '2025-10-24T12:00:00Z'
        expected_dt = timezone.datetime(2025, 10, 24, 12, 0, 0, tzinfo=timezone.utc)

        # Apply payload with ISO8601 string
        self.subscription.apply_stripe_payload({
            'current_period_end': iso_datetime
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert the datetime was parsed correctly and is timezone-aware
        self.assertIsNotNone(self.subscription.current_period_end)
        self.assertEqual(self.subscription.current_period_end, expected_dt)
        self.assertTrue(timezone.is_aware(self.subscription.current_period_end))

    def test_apply_stripe_payload_with_numeric_timestamp(self):
        """Test that numeric timestamps are still handled correctly."""
        # Test with Unix timestamp
        timestamp = 1730000000  # 2024-10-27 12:00:00 UTC
        expected_dt = timezone.datetime.fromtimestamp(timestamp, tz=timezone.utc)

        # Apply payload with numeric timestamp
        self.subscription.apply_stripe_payload({
            'current_period_end': timestamp
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert the timestamp was parsed correctly
        self.assertIsNotNone(self.subscription.current_period_end)
        self.assertEqual(self.subscription.current_period_end, expected_dt)

    def test_apply_stripe_payload_with_numeric_string(self):
        """Test that numeric strings are handled as timestamps."""
        # Test with numeric string
        timestamp_str = '1730000000'
        expected_dt = timezone.datetime.fromtimestamp(float(timestamp_str), tz=timezone.utc)

        # Apply payload with numeric string
        self.subscription.apply_stripe_payload({
            'current_period_end': timestamp_str
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert the numeric string was parsed as timestamp
        self.assertIsNotNone(self.subscription.current_period_end)
        self.assertEqual(self.subscription.current_period_end, expected_dt)

    def test_apply_stripe_payload_with_naive_iso_datetime(self):
        """Test that naive ISO datetime strings are made timezone-aware."""
        # Test with ISO8601 format without timezone (naive)
        naive_iso = '2025-10-24T12:00:00'
        expected_dt = timezone.make_aware(
            timezone.datetime(2025, 10, 24, 12, 0, 0)
        )

        # Apply payload with naive ISO datetime
        self.subscription.apply_stripe_payload({
            'current_period_end': naive_iso
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert the naive datetime was made timezone-aware
        self.assertIsNotNone(self.subscription.current_period_end)
        self.assertEqual(self.subscription.current_period_end, expected_dt)
        self.assertTrue(timezone.is_aware(self.subscription.current_period_end))

    def test_apply_stripe_payload_with_invalid_datetime(self):
        """Test that invalid datetime strings are ignored gracefully."""
        # Test with invalid datetime string
        invalid_datetime = 'invalid-date-string'

        # Apply payload with invalid datetime
        self.subscription.apply_stripe_payload({
            'current_period_end': invalid_datetime
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert current_period_end remains None (no change)
        self.assertIsNone(self.subscription.current_period_end)

    def test_apply_stripe_payload_with_malformed_iso_datetime(self):
        """Test that malformed ISO datetime strings are ignored gracefully."""
        # Test with malformed ISO datetime that would raise ValueError in parse_datetime
        malformed_datetime = '2025-13-45T99:99:99Z'

        # Apply payload with malformed datetime
        self.subscription.apply_stripe_payload({
            'current_period_end': malformed_datetime
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert current_period_end remains None (no change)
        self.assertIsNone(self.subscription.current_period_end)

    def test_apply_stripe_payload_no_period_end_change(self):
        """Test that no update occurs when period_end is same as current."""
        # Set initial current_period_end
        initial_dt = timezone.datetime(2025, 10, 24, 12, 0, 0, tzinfo=timezone.utc)
        self.subscription.current_period_end = initial_dt
        self.subscription.save()

        # Apply same datetime again
        self.subscription.apply_stripe_payload({
            'current_period_end': '2025-10-24T12:00:00Z'
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert the datetime remains the same
        self.assertEqual(self.subscription.current_period_end, initial_dt)

    def test_apply_stripe_payload_mixed_with_status_update(self):
        """Test that period_end parsing works alongside other payload fields."""
        # Apply payload with both status and current_period_end
        self.subscription.apply_stripe_payload({
            'status': 'active',
            'current_period_end': '2025-10-24T12:00:00Z'
        })

        # Refresh from database
        self.subscription.refresh_from_db()

        # Assert both fields were updated correctly
        self.assertEqual(self.subscription.status, 'active')
        expected_dt = timezone.datetime(2025, 10, 24, 12, 0, 0, tzinfo=timezone.utc)
        self.assertEqual(self.subscription.current_period_end, expected_dt)
