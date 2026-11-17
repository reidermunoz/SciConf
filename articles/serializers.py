from rest_framework import serializers
from .models import Article, ArticleVersion, ArticleReview, ConferenceDeadline
from django.contrib.auth import get_user_model

User = get_user_model()

class ConferenceDeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceDeadline
        fields = '__all__'

class ArticleVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleVersion
        fields = ['id', 'article', 'version_type', 'file', 'copyright_file', 'created_at']
        read_only_fields = ['created_at']

class ArticleReviewSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()
    article_title = serializers.CharField(source='article.title', read_only=True)
    class Meta:
        model = ArticleReview
        fields = [
            'id', 'article', 'article_title', 'evaluator', 'evaluator_name',
            'comments', 'is_approved', 'reviewed_at',
            'presentation_endorsement', 'presentation_endorsed_at',
            'publication_endorsement', 'publication_endorsed_at'
        ]
        read_only_fields = [
            'article', 'evaluator', 'reviewed_at',
            'presentation_endorsed_at', 'publication_endorsed_at'
        ]

    def get_evaluator_name(self, obj):
        return obj.evaluator.get_full_name() or obj.evaluator.username
    
class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    versions = ArticleVersionSerializer(many=True, read_only=True)
    reviews = ArticleReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'abstract', 'thematic_line', 'author', 'author_name',
            'status', 'is_active', 'deactivation_reason', 'created_at', 'updated_at',
            'versions', 'reviews'
        ]
        read_only_fields = ['author', 'author_name', 'status', 'created_at', 'updated_at']
        
    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username