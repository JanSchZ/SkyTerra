from django.db import models

class AIModel(models.Model):
    MODEL_CHOICES = [
        ('2.0-flash', '2.0 Flash'),
        ('2.5-flash', '2.5 Flash'),
        ('2.5-pro', '2.5 Pro'),
    ]

    name = models.CharField(max_length=50, choices=MODEL_CHOICES, unique=True)
    price_per_1k_tokens_input = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    price_per_1k_tokens_output = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    system_prompt = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.get_name_display()

class AIUsageLog(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    model_used = models.ForeignKey(AIModel, on_delete=models.CASCADE)
    tokens_input = models.PositiveIntegerField()
    tokens_output = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=6)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Usage of {self.model_used.get_name_display()} by {self.user.username if self.user else 'Anonymous'} at {self.timestamp}"
