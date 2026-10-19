from rest_framework import routers
from .views import UserViewSet, RoleViewSet

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = router.urls

