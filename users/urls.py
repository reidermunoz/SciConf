from django.urls import path, include
from rest_framework import routers
from .views import UserViewSet, RoleViewSet, LoginView

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
]

