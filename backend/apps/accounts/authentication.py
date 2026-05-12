from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """JWT authentication that falls back to reading the access token from a
    cookie when no `Authorization` header is provided.

    Login (apps.accounts.views.CookieTokenObtainPairView) sets `access_token`
    as an HTTP-only cookie. Without this class, browser requests authenticated
    only via that cookie would be rejected with "credenziali non immesse".
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token')
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
