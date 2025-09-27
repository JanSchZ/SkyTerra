from django.urls import path
from .views import PresignUploadView, PresignReadView

urlpatterns = [
    path('presign-upload/', PresignUploadView.as_view(), name='media-presign-upload'),
    path('presign-read/', PresignReadView.as_view(), name='media-presign-read'),
]

