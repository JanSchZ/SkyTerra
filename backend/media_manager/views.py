import re
from urllib.parse import quote

import boto3
from botocore.config import Config as BotoConfig
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _get_s3_client():
    endpoint_url = getattr(settings, 'AWS_S3_ENDPOINT_URL', None)
    region = getattr(settings, 'AWS_S3_REGION_NAME', None)
    signature = getattr(settings, 'AWS_S3_SIGNATURE_VERSION', 's3v4')
    return boto3.client(
        's3',
        aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
        aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        region_name=region,
        endpoint_url=endpoint_url,
        config=BotoConfig(signature_version=signature),
    )


def _sanitize_key(key: str) -> str:
    # Disallow path traversal and control characters
    key = key.strip()
    if key.startswith('/'):
        key = key[1:]
    if '..' in key:
        raise ValueError('Invalid key')
    # Basic allowlist of characters; percent-encode others
    allowed = re.compile(r"[^A-Za-z0-9/_.,=:;@!()\-]")
    return allowed.sub(lambda m: quote(m.group(0)), key)


class PresignUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        if not bucket:
            return Response({'detail': 'Storage bucket not configured'}, status=500)

        key = request.data.get('key')
        content_type = request.data.get('content_type') or 'application/octet-stream'
        expires_in = int(request.data.get('expires_in') or 3600)

        if not key or not isinstance(key, str):
            return Response({'detail': 'key is required'}, status=400)

        prefix = getattr(settings, 'MEDIA_UPLOADS_PREFIX', 'uploads/')
        try:
            safe_key = _sanitize_key(key)
        except ValueError:
            return Response({'detail': 'invalid key'}, status=400)

        object_key = f"{prefix.rstrip('/')}/{safe_key}"

        s3 = _get_s3_client()
        params = {
            'Bucket': bucket,
            'Key': object_key,
            'ContentType': content_type,
        }
        url = s3.generate_presigned_url(
            ClientMethod='put_object',
            Params=params,
            ExpiresIn=expires_in,
            HttpMethod='PUT',
        )

        return Response({'url': url, 'key': object_key, 'bucket': bucket})


class PresignReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        if not bucket:
            return Response({'detail': 'Storage bucket not configured'}, status=500)

        key = request.data.get('key')
        expires_in = int(request.data.get('expires_in') or 900)

        if not key or not isinstance(key, str):
            return Response({'detail': 'key is required'}, status=400)

        try:
            safe_key = _sanitize_key(key)
        except ValueError:
            return Response({'detail': 'invalid key'}, status=400)

        s3 = _get_s3_client()
        params = {
            'Bucket': bucket,
            'Key': safe_key,
        }
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params=params,
            ExpiresIn=expires_in,
            HttpMethod='GET',
        )

        return Response({'url': url, 'key': safe_key, 'bucket': bucket})

