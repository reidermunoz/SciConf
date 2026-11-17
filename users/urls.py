from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet,
    RoleViewSet,
    LoginView,
    RequestPasswordResetView,
    ConfirmPasswordResetView,
    CaptchaView,
)

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('captcha/', CaptchaView.as_view(), name='captcha'),
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='password-reset-confirm'),
]

