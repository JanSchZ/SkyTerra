from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Property
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class PropertyAPITests(APITestCase):
    def setUp(self):
        # Create a regular user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )
        # Create an admin user
        self.admin_user = User.objects.create_superuser(
            username='adminuser',
            email='adminuser@example.com',
            password='password123'
        )

        # Minimal valid property data
        self.property_data = {
            'name': 'Test Farm',
            'type': 'farm',
            'price': 10000.00,
            'size': 10.5,
            'description': 'A small test farm.',
            # latitude and longitude can be optional based on model
        }

    def authenticate(self, user):
        """Helper to authenticate API requests using JWT tokens."""
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    def clear_credentials(self):
        """Clear authentication credentials from the client."""
        self.client.credentials()

    def test_create_property_enforces_pending_status(self):
        """Test that new properties are always created with 'pending' status, regardless of input."""
        self.authenticate(self.user)

        # Attempt to create a property with 'approved' status
        data_with_approved_status = self.property_data.copy()
        data_with_approved_status['publication_status'] = 'approved'

        url = reverse('property-list') # Assuming 'property-list' is the name for PropertyViewSet list/create
        response = self.client.post(url, data_with_approved_status, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['publication_status'], 'pending')

        # Verify in DB as well
        created_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(created_property.publication_status, 'pending')
        self.clear_credentials()

    def test_non_admin_cannot_change_publication_status_on_update(self):
        """Test that non-admin users cannot change publication_status when updating their property."""
        self.authenticate(self.user)

        # Create a property first
        create_url = reverse('property-list')
        create_response = self.client.post(create_url, self.property_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        property_id = create_response.data['id']
        self.assertEqual(create_response.data['publication_status'], 'pending') # Should be pending by default

        # Attempt to update the status to 'approved'
        update_url = reverse('property-detail', kwargs={'pk': property_id}) # Assuming 'property-detail' for retrieve/update/delete
        update_data = {'publication_status': 'approved', 'name': 'Updated Name'} # Also update another field

        response = self.client.patch(update_url, update_data, format='json') # Use PATCH for partial update

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['publication_status'], 'pending') # Status should remain 'pending'
        self.assertEqual(response.data['name'], 'Updated Name') # Other fields should update

        # Verify in DB
        updated_property = Property.objects.get(id=property_id)
        self.assertEqual(updated_property.publication_status, 'pending')
        self.assertEqual(updated_property.name, 'Updated Name')
        self.clear_credentials()

    def test_non_admin_cannot_change_status_of_admin_approved_property(self):
        """Test non-admin cannot change status if admin already approved it."""
        # User creates property
        self.authenticate(self.user)
        create_url = reverse('property-list')
        create_response = self.client.post(create_url, self.property_data, format='json')
        property_id = create_response.data['id']

        # Admin approves it
        self.clear_credentials()
        self.authenticate(self.admin_user)
        set_status_url = reverse('property-set-publication-status', kwargs={'pk': property_id}) # Corrected URL name
        admin_response = self.client.post(set_status_url, {'status': 'approved'}, format='json')
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_response.data['publication_status'], 'approved')

        # User (owner) tries to change it back to 'pending'
        self.clear_credentials()
        self.authenticate(self.user)
        update_url = reverse('property-detail', kwargs={'pk': property_id})
        user_update_data = {'publication_status': 'pending', 'description': 'User trying to revert status'}
        user_response = self.client.patch(update_url, user_update_data, format='json') # Use PATCH for partial update

        self.assertEqual(user_response.status_code, status.HTTP_200_OK)
        # Status should remain 'approved' as user cannot change it
        self.assertEqual(user_response.data['publication_status'], 'approved')
        self.assertEqual(user_response.data['description'], 'User trying to revert status')
        self.clear_credentials()


    def test_admin_can_change_publication_status_via_set_status_endpoint(self):
        """Test that admin users can change publication_status using the set-status endpoint."""
        # User creates property
        self.authenticate(self.user)
        create_url = reverse('property-list')
        create_response = self.client.post(create_url, self.property_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        property_id = create_response.data['id']
        self.assertEqual(create_response.data['publication_status'], 'pending')
        self.clear_credentials()

        # Admin logs in
        self.authenticate(self.admin_user)

        # Admin approves the property
        set_status_url = reverse('property-set-publication-status', kwargs={'pk': property_id}) # Corrected URL name
        response_approve = self.client.post(set_status_url, {'status': 'approved'}, format='json')
        self.assertEqual(response_approve.status_code, status.HTTP_200_OK)
        self.assertEqual(response_approve.data['publication_status'], 'approved')

        # Verify in DB
        approved_property = Property.objects.get(id=property_id)
        self.assertEqual(approved_property.publication_status, 'approved')

        # Admin rejects the property
        response_reject = self.client.post(set_status_url, {'status': 'rejected'}, format='json')
        self.assertEqual(response_reject.status_code, status.HTTP_200_OK)
        self.assertEqual(response_reject.data['publication_status'], 'rejected')

        # Verify in DB
        rejected_property = Property.objects.get(id=property_id)
        self.assertEqual(rejected_property.publication_status, 'rejected')
        self.clear_credentials()

    def test_admin_can_change_publication_status_via_direct_update_if_allowed(self):
        """
        Test if admin can change publication_status via a direct PUT/PATCH.
        Our current perform_update logic DOES NOT distinguish serializers for admin vs user on PUT.
        It only removes 'publication_status' from validated_data for non-staff.
        So, an admin *should* be able to update it via PUT.
        """
        # User creates property
        self.authenticate(self.user)
        create_url = reverse('property-list')
        create_response = self.client.post(create_url, self.property_data, format='json')
        property_id = create_response.data['id']
        self.clear_credentials()

        # Admin logs in
        self.authenticate(self.admin_user)
        update_url = reverse('property-detail', kwargs={'pk': property_id})

        # Admin updates the status to 'approved' via PATCH
        update_data_approve = {'publication_status': 'approved', 'name': 'Admin Approved Name'}
        response_approve = self.client.patch(update_url, update_data_approve, format='json') # Use PATCH

        self.assertEqual(response_approve.status_code, status.HTTP_200_OK)
        self.assertEqual(response_approve.data['publication_status'], 'approved')
        self.assertEqual(response_approve.data['name'], 'Admin Approved Name')

        # Admin updates the status to 'rejected' via PATCH
        update_data_reject = {'publication_status': 'rejected', 'name': 'Admin Rejected Name'}
        response_reject = self.client.patch(update_url, update_data_reject, format='json') # Use PATCH
        self.assertEqual(response_reject.status_code, status.HTTP_200_OK)
        self.assertEqual(response_reject.data['publication_status'], 'rejected')
        self.assertEqual(response_reject.data['name'], 'Admin Rejected Name')
        self.clear_credentials()
