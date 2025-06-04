from django.http import JsonResponse
from properties.models import Property
import json

def get_southern_chile_properties(request):
    regions = ['Los Lagos', 'Aysén', 'Magallanes']  # Add more if needed based on the script
    properties = Property.objects.filter(region__in=regions).values('name', 'latitude', 'longitude', 'price', 'size', 'type')  # Adjust fields as per model
    data = list(properties)  # Convert queryset to list for JSON serialization
    return JsonResponse(data, safe=False) 