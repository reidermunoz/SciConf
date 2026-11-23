from rest_framework import serializers
from .models import Article, ArticleCoAuthor, ArticleVersion, ArticleReview, ConferenceDeadline
from django.contrib.auth import get_user_model
from users.permissions import has_role, ADMIN, COMMITTEE_ROLES

User = get_user_model()

class ConferenceDeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceDeadline
        fields = '__all__'

    def validate_copyright_template(self, value):
        if value and not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('La plantilla de copyright debe estar en formato PDF (.pdf).')
        return value

class ArticleVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleVersion
        fields = ['id', 'article', 'version_type', 'file', 'copyright_file', 'created_at']
        read_only_fields = ['created_at']

class ArticleReviewSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()
    article_title = serializers.CharField(source='article.title', read_only=True)
    article_status = serializers.CharField(source='article.status', read_only=True)
    article_thematic_line = serializers.CharField(source='article.thematic_line', read_only=True)
    article_abstract = serializers.CharField(source='article.abstract', read_only=True)
    article_keywords = serializers.CharField(source='article.keywords', read_only=True)
    article_versions = ArticleVersionSerializer(source='article.versions', many=True, read_only=True)
    other_reviews = serializers.SerializerMethodField()
    presentation_endorsements_count = serializers.SerializerMethodField()
    presentation_votes_count = serializers.SerializerMethodField()
    publication_endorsed_by = serializers.SerializerMethodField()

    class Meta:
        model = ArticleReview
        fields = [
            'id', 'article', 'article_title', 'article_status', 'article_thematic_line',
            'article_abstract', 'article_keywords', 'article_versions',
            'evaluator', 'evaluator_name',
            'originality_score', 'relevance_score', 'technical_quality_score',
            'comments', 'is_approved', 'reviewed_at',
            'presentation_endorsement', 'presentation_decision', 'presentation_endorsed_at',
            'presentation_endorsements_count', 'presentation_votes_count',
            'publication_endorsement', 'publication_endorsed_at', 'publication_endorsed_by',
            'other_reviews',
        ]
        read_only_fields = [
            'article', 'evaluator', 'reviewed_at',
            'presentation_endorsed_at', 'publication_endorsed_at'
        ]

    def get_evaluator_name(self, obj):
        return obj.evaluator.get_full_name() or obj.evaluator.username

    def get_presentation_endorsements_count(self, obj):
        return sum(1 for r in obj.article.reviews.all() if r.presentation_endorsement)

    def get_presentation_votes_count(self, obj):
        return sum(1 for r in obj.article.reviews.all() if r.presentation_decision is not None)

    def get_publication_endorsed_by(self, obj):
        for r in obj.article.reviews.all():
            if r.publication_endorsement:
                return r.evaluator.get_full_name() or r.evaluator.username
        return None

    def get_other_reviews(self, obj):
        # Solo visible después de que el jurado actual envíe su evaluación inicial
        if obj.is_approved is None:
            return []
        request = self.context.get('request')
        user = request.user if request else None
        if user and not has_role(user, ADMIN, *COMMITTEE_ROLES):
            return []
        peers = [
            r for r in obj.article.reviews.all()
            if r.id != obj.id and r.is_approved is not None
        ]
        return [
            {
                'id': r.id,
                'evaluator_name': r.evaluator.get_full_name() or r.evaluator.username,
                'originality_score': r.originality_score,
                'relevance_score': r.relevance_score,
                'technical_quality_score': r.technical_quality_score,
                'comments': r.comments,
                'is_approved': r.is_approved,
                'reviewed_at': r.reviewed_at,
            }
            for r in peers
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None
        has_evaluated = instance.is_approved is not None
        data['has_evaluated'] = has_evaluated
        data['is_hidden_until_own_vote'] = False

        if user:
            is_admin = has_role(user, ADMIN)
            is_committee = has_role(user, *COMMITTEE_ROLES)
            # Oculta siempre la identidad de los jurados para usuarios que no son Admin o Comité
            if not is_admin and not is_committee:
                data.pop('evaluator', None)
                data['evaluator_name'] = None
            # Si es Comité (no Admin) y es jurado del artículo sin haber votado, oculta evaluaciones de pares
            elif not is_admin and instance.evaluator_id != user.id:
                own_pending = any(
                    r.evaluator_id == user.id and r.is_approved is None
                    for r in instance.article.reviews.all()
                )
                if own_pending:
                    data['is_hidden_until_own_vote'] = True
                    data['originality_score'] = None
                    data['relevance_score'] = None
                    data['technical_quality_score'] = None
                    data['comments'] = None
                    data['is_approved'] = None
                    data['reviewed_at'] = None
        return data


class ArticleCoAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCoAuthor
        fields = ['id', 'first_name', 'last_name', 'email', 'university']


class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_institution = serializers.CharField(source='author.institution', read_only=True)
    versions = ArticleVersionSerializer(many=True, read_only=True)
    coauthors = ArticleCoAuthorSerializer(many=True, read_only=True)
    reviews = ArticleReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'abstract', 'keywords', 'thematic_line',
            'author', 'author_name', 'author_email', 'author_institution',
            'status', 'is_active', 'deactivation_reason', 'created_at', 'updated_at',
            'versions', 'coauthors', 'reviews'
        ]
        read_only_fields = [
            'author', 'author_name', 'author_email', 'author_institution', 'status',
            'is_active', 'deactivation_reason', 'created_at', 'updated_at'
        ]
        
    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username