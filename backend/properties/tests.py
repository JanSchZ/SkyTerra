import os
import shutil
import uuid
import json
from io import BytesIO
import zipfile

from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from django.core.files.storage import default_storage

from .models import Property, Tour, Image

User = get_user_model()

TEST_MEDIA_ROOT = os.path.join(settings.BASE_DIR, 'test_media_properties')

@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PropertyTourUploadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(
            username='admin_tour_test',
            email='admin_tour_test@example.com',
            password='password123'
        )
        cls.regular_user = User.objects.create_user(
            username='user_tour_test',
            email='user_tour_test@example.com',
            password='password123'
        )

        # Create a dummy HTML file content
        cls.html_content = b"<html><head><title>Test Pano</title></head><body><h1>Hello Pano</h1><script src='script.js'></script></body></html>"
        cls.js_content = b"console.log('pano script loaded');"

        # Create a dummy ZIP file
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("index.html", cls.html_content)
            zf.writestr("script.js", cls.js_content)
        zip_buffer.seek(0)
        cls.zip_file = SimpleUploadedFile(
            name="test_pano.zip",
            content=zip_buffer.read(),
            content_type="application/zip"
        )

        # Create a dummy HTML file
        cls.html_file = SimpleUploadedFile(
            name="test_pano.html",
            content=cls.html_content,
            content_type="text/html"
        )
        
        # Basic property data
        cls.property_data = {
            'name': 'Test Property for Tours',
            'type': 'farm',
            'price': 100000,
            'size': 10.5,
            'latitude': -33.45,
            'longitude': -70.67,
            'description': 'A beautiful property for testing tours.',
        }

    def setUp(self):
        self.client.login(username='admin_tour_test', password='password123')
        # Ensure files are fresh for each test by resetting their pointers
        self.zip_file.seek(0)
        self.html_file.seek(0)
        
        # Create a property instance owned by the admin_user for update/delete tests
        self.property_instance = Property.objects.create(
            owner=self.admin_user, 
            **self.property_data
        )

    @classmethod
    def tearDownClass(cls):
        # Clean up the test media directory after all tests in this class have run
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
        super().tearDownClass()

    def test_admin_create_property_with_zip_tour(self):
        data = self.property_data.copy()
        data['new_tour_file'] = self.zip_file
        
        response = self.client.post(reverse('property-list'), data, format='multipart') # Changed URL name
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Property.objects.count(), 2) # One created in setUp, one here
        
        created_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(Tour.objects.filter(property=created_property).count(), 1)
        
        tour = Tour.objects.get(property=created_property)
        self.assertEqual(tour.type, '360')
        
        # Expected path parts: /media/properties/<prop_id>/tours/<tour_uuid>/index.html
        self.assertTrue(tour.url.startswith(settings.MEDIA_URL))
        self.assertTrue(f'properties/{created_property.id}/tours/' in tour.url)
        self.assertTrue(tour.url.endswith('/index.html'))
        
        # Verify files exist in storage
        tour_url_relative_path = tour.url.replace(settings.MEDIA_URL, "")
        index_html_path = tour_url_relative_path
        script_js_path = os.path.join(os.path.dirname(tour_url_relative_path), "script.js")
        
        self.assertTrue(default_storage.exists(index_html_path))
        self.assertTrue(default_storage.exists(script_js_path))
        
        # Verify original zip is not in the tour directory (it's deleted after extraction)
        original_zip_in_tour_dir = os.path.join(os.path.dirname(tour_url_relative_path), self.zip_file.name)
        self.assertFalse(default_storage.exists(original_zip_in_tour_dir))

    def test_admin_create_property_with_html_tour(self):
        data = self.property_data.copy()
        data['new_tour_file'] = self.html_file
        
        response = self.client.post(reverse('property-list'), data, format='multipart') # Changed URL name
        
        self.assertEqual(response.status_code, 201)
        created_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(Tour.objects.filter(property=created_property).count(), 1)
        
        tour = Tour.objects.get(property=created_property)
        self.assertEqual(tour.type, '360')
        
        self.assertTrue(tour.url.startswith(settings.MEDIA_URL))
        self.assertTrue(f'properties/{created_property.id}/tours/' in tour.url)
        self.assertTrue(tour.url.endswith(f'/{self.html_file.name}'))
        
        tour_url_relative_path = tour.url.replace(settings.MEDIA_URL, "")
        self.assertTrue(default_storage.exists(tour_url_relative_path))

    def test_admin_update_property_replace_tour_with_zip(self):
        # First, create a property with an initial HTML tour
        initial_html_tour_file = SimpleUploadedFile("initial_tour.html", b"initial content", "text/html")
        initial_html_tour_file.seek(0)
        
        prop_for_update = Property.objects.create(owner=self.admin_user, name="Prop for tour update", price=1, size=1)
        
        data_initial = {
            'new_tour_file': initial_html_tour_file,
        }
        # For PATCH with files, format='multipart' is correct.
        # Explicitly adding content_type as a workaround for potential test client issues with PATCH multipart.
        response_initial = self.client.patch(
            reverse('property-detail', kwargs={'pk': prop_for_update.id}), 
            data_initial, 
            format='multipart',
            content_type='multipart/form-data' 
        )
        self.assertEqual(response_initial.status_code, 200) # Check initial creation
        self.assertEqual(Tour.objects.filter(property=prop_for_update).count(), 1)
        old_tour = Tour.objects.get(property=prop_for_update)
        old_tour_path_relative = old_tour.url.replace(settings.MEDIA_URL, "")
        old_tour_dir_relative = os.path.dirname(old_tour_path_relative)
        self.assertTrue(default_storage.exists(old_tour_path_relative))

        # Now, update with a new ZIP tour
        self.zip_file.seek(0) # Reset pointer
        data_update = {
            'new_tour_file': self.zip_file,
        }
        response = self.client.patch(reverse('property-detail', kwargs={'pk': prop_for_update.id}), data_update, format='multipart')
        
        self.assertEqual(response.status_code, 200)
        prop_for_update.refresh_from_db()
        self.assertEqual(Tour.objects.filter(property=prop_for_update).count(), 1) # Should still be one, but new
        
        new_tour = Tour.objects.get(property=prop_for_update)
        self.assertNotEqual(new_tour.id, old_tour.id) # Ensure it's a new Tour object
        
        self.assertTrue(new_tour.url.endswith('/index.html'))
        new_tour_path_relative = new_tour.url.replace(settings.MEDIA_URL, "")
        new_tour_index_html_path = new_tour_path_relative
        new_tour_script_js_path = os.path.join(os.path.dirname(new_tour_path_relative), "script.js")
        
        self.assertTrue(default_storage.exists(new_tour_index_html_path))
        self.assertTrue(default_storage.exists(new_tour_script_js_path))
        
        # Verify old tour files/directory are deleted
        self.assertFalse(default_storage.exists(old_tour_path_relative)) # old file
        # Check if the directory itself is gone. Need to be careful if it's a shared base path.
        # The serializer deletes os.path.dirname(old_tour_path_relative)
        self.assertFalse(default_storage.exists(old_tour_dir_relative))


    def test_non_admin_update_property_tour_permission_denied(self):
        # Property owned by admin_user
        self.client.logout()
        self.client.login(username='user_tour_test', password='password123')
        
        self.html_file.seek(0)
        data = {
            'new_tour_file': self.html_file,
        }
        response = self.client.patch(reverse('property-detail', kwargs={'pk': self.property_instance.id}), data, format='multipart')
        
        self.assertEqual(response.status_code, 403) # PermissionDenied

    def test_admin_delete_tour(self):
        # Create a property with a tour first
        self.html_file.seek(0)
        prop_with_tour = Property.objects.create(owner=self.admin_user, name="Prop with tour to delete", price=1, size=1)
        data_create_tour = {'new_tour_file': self.html_file}
        
        # Use PATCH for initial tour creation with file
        response_create_tour = self.client.patch(
            reverse('property-detail', kwargs={'pk': prop_with_tour.id}), 
            data_create_tour, 
            format='multipart',
            content_type='multipart/form-data'
        )
        self.assertEqual(response_create_tour.status_code, 200) # Ensure tour creation was successful
        
        self.assertEqual(Tour.objects.filter(property=prop_with_tour).count(), 1)
        tour_to_delete = Tour.objects.get(property=prop_with_tour)
        tour_file_path_relative = tour_to_delete.url.replace(settings.MEDIA_URL, "")
        tour_dir_path_relative = os.path.dirname(tour_file_path_relative)
        
        self.assertTrue(default_storage.exists(tour_file_path_relative))

        # Now delete the tour
        data_delete_tour = {
            'tour_to_delete_id': tour_to_delete.id
        }
        response = self.client.patch(reverse('property-detail', kwargs={'pk': prop_with_tour.id}), data_delete_tour, format='json') # Changed format to json
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Tour.objects.filter(property=prop_with_tour).count(), 0)
        self.assertFalse(default_storage.exists(tour_file_path_relative))
        self.assertFalse(default_storage.exists(tour_dir_path_relative)) # Directory should also be gone
        
    # Additional test: Ensure property owner (non-admin) can also manage their own tours
    def test_property_owner_can_update_tour(self):
        owner_user = User.objects.create_user(username='owner_user', password='password123')
        owned_property = Property.objects.create(owner=owner_user, name="Owned Prop", price=1, size=1)
        
        self.client.logout()
        self.client.login(username='owner_user', password='password123')
        
        self.html_file.seek(0)
        data_update = {
            'new_tour_file': self.html_file,
        }
        # Use PATCH for tour creation with file
        response = self.client.patch(
            reverse('property-detail', kwargs={'pk': owned_property.id}), 
            data_update, 
            format='multipart',
            content_type='multipart/form-data'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Tour.objects.filter(property=owned_property).count(), 1)
        
        tour_instance = Tour.objects.get(property=owned_property)
        
        # Owner can delete their tour
        data_delete_tour = {'tour_to_delete_id': tour_instance.id}
        response_delete = self.client.patch(reverse('property-detail', kwargs={'pk': owned_property.id}), data_delete_tour, format='json') # Changed format to json
        self.assertEqual(response_delete.status_code, 200)
        self.assertEqual(Tour.objects.filter(property=owned_property).count(), 0)

    # Test creating property without any tour file
    def test_create_property_without_tour(self):
        data = self.property_data.copy() # No 'new_tour_file'
        response = self.client.post(reverse('property-list'), data, format='multipart') # Changed URL name
        self.assertEqual(response.status_code, 201)
        created_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(Tour.objects.filter(property=created_property).count(), 0)

    # Test updating property without changing tour
    def test_update_property_unrelated_field_no_tour_change(self):
        # Create property with a tour
        self.html_file.seek(0)
        prop_with_tour = Property.objects.create(owner=self.admin_user, name="Prop for no tour change", price=1, size=1)
        data_create_tour = {'new_tour_file': self.html_file}
        # Use PATCH for initial tour creation with file
        response_create_tour = self.client.patch(
            reverse('property-detail', kwargs={'pk': prop_with_tour.id}), 
            data_create_tour, 
            format='multipart',
            content_type='multipart/form-data'
        )
        self.assertEqual(response_create_tour.status_code, 200) # Ensure tour creation was successful
        
        initial_tour_count = Tour.objects.filter(property=prop_with_tour).count()
        self.assertEqual(initial_tour_count, 1)
        tour_instance = Tour.objects.get(property=prop_with_tour)
        initial_tour_url = tour_instance.url

        # Update unrelated field
        data_update_name = {'name': 'Updated Name No Tour Change'}
        response = self.client.patch(reverse('property-detail', kwargs={'pk': prop_with_tour.id}), data_update_name, format='json') # Changed format to json
        self.assertEqual(response.status_code, 200)
        
        prop_with_tour.refresh_from_db()
        self.assertEqual(prop_with_tour.name, 'Updated Name No Tour Change')
        self.assertEqual(Tour.objects.filter(property=prop_with_tour).count(), initial_tour_count)
        self.assertEqual(Tour.objects.get(property=prop_with_tour).url, initial_tour_url) # Tour URL should be the same

    # Test invalid tour file (e.g. non-zip, non-html) - This might be hard if serializer doesn't check content type explicitly for tours
    # The serializer currently checks file.name.endswith('.zip'), otherwise assumes HTML.
    # A .txt file would be treated as HTML. This might be an acceptable simplification for now.
    # A more robust check would involve python-magic or similar, but that's beyond current scope.

    # Test for deleting a non-existent tour_id (should not error, just do nothing or be handled gracefully by serializer)
    def test_delete_non_existent_tour_id(self):
        response = self.client.patch(
            reverse('property-detail', kwargs={'pk': self.property_instance.id}),
            {'tour_to_delete_id': 99999}, # Non-existent tour ID
            format='json' # Changed format to json
        )
        self.assertEqual(response.status_code, 200) # Should not error
        self.assertEqual(Tour.objects.filter(property=self.property_instance).count(), 0) # No tours initially on self.property_instance
