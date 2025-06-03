#!/usr/bin/env python3
"""
Script para probar el backend de Django
"""
import sys
import os

# Añadir el directorio backend al path
sys.path.insert(0, '/workspaces/SkyTerra/backend')

# Configurar Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')

import django
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
import requests
import json

def test_django_setup():
    """Probar que Django está configurado correctamente"""
    print("🔍 Probando configuración de Django...")
    
    # Probar crear un usuario
    try:
        test_user = User.objects.create_user(
            username='test_backend_user',
            email='test@backend.com',
            password='testpass123'
        )
        token, created = Token.objects.get_or_create(user=test_user)
        print(f"✅ Usuario de prueba creado: {test_user.username}")
        print(f"✅ Token generado: {token.key[:10]}...")
        
        # Limpiar
        test_user.delete()
        print("✅ Usuario de prueba eliminado")
        return True
        
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
        return False

def test_register_endpoint():
    """Probar el endpoint de registro directamente"""
    print("\n🔍 Probando endpoint de registro...")
    
    try:
        from skyterra_backend.urls import register_view
        from django.test import RequestFactory
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        
        # Crear una request de prueba
        request = factory.post('/api/auth/register/', {
            'email': 'test_endpoint@example.com',
            'username': 'test_endpoint_user',
            'password': 'testpass123'
        })
        
        response = register_view(request)
        print(f"✅ Endpoint respondió con status: {response.status_code}")
        print(f"✅ Respuesta: {response.data}")
        
        return response.status_code == 201
        
    except Exception as e:
        print(f"❌ Error al probar endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando pruebas del backend...\n")
    
    # Prueba 1: Django setup
    if test_django_setup():
        print("✅ Django configurado correctamente")
    else:
        print("❌ Problemas con la configuración de Django")
        sys.exit(1)
    
    # Prueba 2: Endpoint de registro
    if test_register_endpoint():
        print("✅ Endpoint de registro funcionando")
    else:
        print("❌ Problemas con el endpoint de registro")
        sys.exit(1)
    
    print("\n🎉 Todas las pruebas pasaron correctamente!")
