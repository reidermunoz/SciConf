from rest_framework import serializers
from .models import Article, ThematicLine

class ArticleSerializer(serializers.ModelSerializer):

    # Mostramos los datos del autor en modo lectura
    author_name = serializers.SerializerMethodField(read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    class Meta:
        model = Article
        fields = [
            'id',
            'title',
            'abstract',
            'thematic_line',
            'author',
            'author_name',
            'author_email',
            'is_active',
            'deactivation_reason',
            'created_at',
            'updated_at',
        ]

        # El autor y el estado inicial no se envían manualmente al crear; se gestionan en backend
        read_only_fields = ['id', 'author', 'is_active', 'deactivation_reason', 'created_at', 'updated_at']
        
    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username