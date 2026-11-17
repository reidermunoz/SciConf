from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet, ArticleReviewViewSet, ConferenceDeadlineViewSet

router = DefaultRouter()
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'reviews', ArticleReviewViewSet, basename='review')
router.register(r'deadlines', ConferenceDeadlineViewSet, basename='deadline')

urlpatterns = [
    path('', include(router.urls)),
]