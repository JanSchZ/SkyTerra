from django.http import JsonResponse
from properties.models import Property
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .serializers import UserDetailsSerializer

def get_southern_chile_properties(request):
    regions = ['Los Lagos', 'Aysén', 'Magallanes']  # Add more if needed based on the script
    properties = Property.objects.filter(region__in=regions).values('name', 'latitude', 'longitude', 'price', 'size', 'type')  # Adjust fields as per model
    data = list(properties)  # Convert queryset to list for JSON serialization
    return JsonResponse(data, safe=False)

class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailsSerializer

    def get(self, request, *args, **kwargs):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        serializer = self.serializer_class(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400) 