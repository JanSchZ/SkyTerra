from django.db import models
from django.contrib.auth.models import User

class AIModel(models.Model):
    MODEL_CHOICES = [
        ('gemini-2.0-flash', 'Gemini 2.0 Flash'),
        ('gemini-2.5-flash', 'Gemini 2.5 Flash'),
        ('gemini-2.5-pro', 'Gemini 2.5 Pro'),
    ]

    name = models.CharField(max_length=50, choices=MODEL_CHOICES, unique=True)
    api_name = models.CharField(max_length=100, help_text="API endpoint name for this model")
    price_per_1k_tokens_input = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    price_per_1k_tokens_output = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    system_prompt = models.TextField(blank=True, help_text="Default system prompt for Sam")
    is_active = models.BooleanField(default=True)
    max_tokens = models.IntegerField(default=65536, help_text="Maximum output tokens")
    supports_thinking = models.BooleanField(default=False, help_text="Model supports thinking capabilities")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.get_name_display()

class SamConfiguration(models.Model):
    """Global configuration for Sam AI assistant"""
    is_enabled = models.BooleanField(default=True, help_text="Enable/disable Sam globally")
    current_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True, help_text="Currently selected model for Sam")
    custom_instructions = models.TextField(blank=True, help_text="Custom instructions for Sam behavior")
    max_conversation_history = models.IntegerField(default=10, help_text="Maximum conversation history to maintain")
    response_temperature = models.FloatField(default=0.7, help_text="Response creativity (0.0-1.0)")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Sam Configuration"
        verbose_name_plural = "Sam Configuration"

    def __str__(self):
        return f"Sam Configuration (Model: {self.current_model.get_name_display() if self.current_model else 'None'})"

    def save(self, *args, **kwargs):
        # Ensure only one configuration exists
        if not self.pk and SamConfiguration.objects.exists():
            raise ValueError("Only one Sam configuration can exist")
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Get or create the Sam configuration"""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'is_enabled': True,
                'custom_instructions': 'Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces.',
                'max_conversation_history': 10,
                'response_temperature': 0.7,
            }
        )
        
        # Set default model to 2.0-flash if no model is configured
        if created or not config.current_model:
            try:
                default_model = AIModel.objects.filter(name='gemini-2.0-flash', is_active=True).first()
                if default_model:
                    config.current_model = default_model
                    config.save()
            except Exception:
                pass  # In case models table doesn't exist yet
        
        return config

class AIUsageLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    model_used = models.ForeignKey(AIModel, on_delete=models.CASCADE)
    request_type = models.CharField(max_length=50, default='chat', help_text="Type of request (chat, search, etc.)")
    tokens_input = models.PositiveIntegerField()
    tokens_output = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=6)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Response time in milliseconds")
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True, help_text="Whether the request was successful")
    error_message = models.TextField(blank=True, help_text="Error message if request failed")

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['model_used']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"Usage of {self.model_used.get_name_display()} by {self.user.username if self.user else 'Anonymous'} at {self.timestamp}"
