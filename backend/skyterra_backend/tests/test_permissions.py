from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework import permissions

from properties.models import Property
from skyterra_backend.permissions import IsOwnerOrAdmin

User = get_user_model()

class MockPropertyView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get_object(self):
        # This method is usually provided by a ViewSet or a mixin
        # For testing purposes, we'll return a mock object
        return self.kwargs.get('obj')

    def get(self, request, *args, **kwargs):
        obj = self.get_object()
        self.check_object_permissions(request, obj)
        return permissions.Response({'detail': 'GET allowed'})

    def put(self, request, *args, **kwargs):
        obj = self.get_object()
        self.check_object_permissions(request, obj)
        return permissions.Response({'detail': 'PUT allowed'})

    def delete(self, request, *args, **kwargs):
        obj = self.get_object()
        self.check_object_permissions(request, obj)
        return permissions.Response({'detail': 'DELETE allowed'})

class IsOwnerOrAdminPermissionTest(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin_user = User.objects.create_user(username='admin', email='admin@example.com', password='password', is_staff=True)
        self.owner_user = User.objects.create_user(username='owner', email='owner@example.com', password='password')
        self.other_user = User.objects.create_user(username='other', email='other@example.com', password='password')

        self.property_owned_by_owner = Property.objects.create(owner=self.owner_user, name='Owner Property', price=100, size=10)
        self.property_owned_by_other = Property.objects.create(owner=self.other_user, name='Other Property', price=200, size=20)

    def _test_permission(self, user, obj, method, expected_status):
        request = self.factory.generic(method, '/', format='json')
        request.user = user
        view = MockPropertyView()
        view.kwargs = {'obj': obj} # Pass the object to the view
        
        # Manually call the permission check
        has_permission = view.permission_classes[0]().has_object_permission(request, view, obj)
        
        if expected_status == 200:
            self.assertTrue(has_permission, f"Expected permission for {user.username} on {obj.name} with {method}")
        else:
            self.assertFalse(has_permission, f"Expected no permission for {user.username} on {obj.name} with {method}")

    # Test cases for GET (SAFE_METHODS)
    def test_get_permission_admin(self):
        self._test_permission(self.admin_user, self.property_owned_by_owner, 'GET', 200)
        self._test_permission(self.admin_user, self.property_owned_by_other, 'GET', 200)

    def test_get_permission_owner(self):
        self._test_permission(self.owner_user, self.property_owned_by_owner, 'GET', 200)

    def test_get_permission_other_user(self):
        self._test_permission(self.other_user, self.property_owned_by_owner, 'GET', 200)

    # Test cases for PUT (Write Methods)
    def test_put_permission_admin(self):
        self._test_permission(self.admin_user, self.property_owned_by_owner, 'PUT', 200)
        self._test_permission(self.admin_user, self.property_owned_by_other, 'PUT', 200)

    def test_put_permission_owner(self):
        self._test_permission(self.owner_user, self.property_owned_by_owner, 'PUT', 200)

    def test_put_permission_other_user(self):
        self._test_permission(self.other_user, self.property_owned_by_owner, 'PUT', 403) # Should be denied

    # Test cases for DELETE (Write Methods)
    def test_delete_permission_admin(self):
        self._test_permission(self.admin_user, self.property_owned_by_owner, 'DELETE', 200)
        self._test_permission(self.admin_user, self.property_owned_by_other, 'DELETE', 200)

    def test_delete_permission_owner(self):
        self._test_permission(self.owner_user, self.property_owned_by_owner, 'DELETE', 200)

    def test_delete_permission_other_user(self):
        self._test_permission(self.other_user, self.property_owned_by_owner, 'DELETE', 403) # Should be denied
