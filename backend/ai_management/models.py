from django.db import models
from django.conf import settings

class AIModel(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text='Nombre descriptivo para el modelo (ej. Gemini 2.5 Pro)')
    api_name = models.CharField(max_length=100, unique=True, help_text='Nombre del modelo usado en la API de Google (ej. gemini-1.5-pro-latest)')
    price_per_1k_tokens_input = models.DecimalField(max_digits=10, decimal_places=6, help_text='Costo por 1000 tokens de entrada (prompt)')
    price_per_1k_tokens_output = models.DecimalField(max_digits=10, decimal_places=6, help_text='Costo por 1000 tokens de salida (respuesta)')
    system_prompt = models.TextField(blank=True, help_text='Instrucción de sistema por defecto para este modelo.')
    max_tokens = models.PositiveIntegerField(default=8192, help_text='Máximo de tokens que el modelo puede procesar en una sola llamada.')
    supports_thinking = models.BooleanField(default=False, help_text='Indica si el modelo soporta la función de "pensamiento" o tool-calling.')
    is_active = models.BooleanField(default=True, help_text='Si está activo, puede ser seleccionado en la configuración.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class SamConfiguration(models.Model):
    is_enabled = models.BooleanField(default=True, help_text='Activa o desactiva globalmente el asistente Sam.')
    current_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True, help_text='El modelo de IA que Sam usará para responder.')
    custom_instructions = models.TextField(
        blank=True,
        default='Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces.',
        help_text='Instrucciones personalizadas para el asistente de IA.'
    )
    max_history_messages = models.PositiveSmallIntegerField(
        default=10,
        help_text='Número máximo de mensajes (usuario + asistente) a retener en el historial de la conversación. Un número par es recomendado.'
    )
    response_temperature = models.FloatField(
        default=0.7,
        help_text='Controla la aleatoriedad de la respuesta. Valores más altos (ej. 1.0) son más creativos, valores más bajos (ej. 0.2) son más deterministas.'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sam_configs_updated'
    )

    def __str__(self):
        return "Configuración de Sam"

    @classmethod
    def get_config(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    class Meta:
        verbose_name = "Configuración de Sam"
        verbose_name_plural = "Configuraciones de Sam"

class AIUsageLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    model_used = models.ForeignKey(AIModel, on_delete=models.PROTECT)
    request_type = models.CharField(max_length=50, default='chat', help_text='Tipo de solicitud (ej. chat, search, summarization)')
    tokens_input = models.PositiveIntegerField()
    tokens_output = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=6)
    response_time_ms = models.PositiveIntegerField(help_text='Tiempo de respuesta en milisegundos.')
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log de {self.model_used.name} a las {self.timestamp}"