from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework.exceptions import AuthenticationFailed


class LenientJWTCookieAuthentication(JWTCookieAuthentication):
    """
    Like JWTCookieAuthentication but does NOT block requests to auth endpoints
    (e.g., /api/auth/login/, /api/auth/registration/) when cookies contain
    invalid/expired JWTs. It simply returns None so the view can proceed.
    """

    _AUTH_PATH_PREFIXES = (
        '/api/auth/login/',
        '/api/auth/registration/',
        '/api/auth/csrf/',
        '/api/auth/password/reset/',
        '/api/auth/password/reset/confirm/',
        '/api/auth/verify-email/',
    )

    def authenticate(self, request):
        path = (request.path or '')
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            # If we are on an auth endpoint, ignore invalid cookie tokens
            if any(path.startswith(pfx) for pfx in self._AUTH_PATH_PREFIXES):
                return None
            # Otherwise, re-raise to preserve normal behavior
            raise


