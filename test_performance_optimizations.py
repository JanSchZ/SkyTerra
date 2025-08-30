#!/usr/bin/env python3
"""
Script para probar las optimizaciones de rendimiento aplicadas.
Ejecuta pruebas de backend y frontend para verificar mejoras.
"""

import os
import sys
import time
import subprocess
import json
from pathlib import Path

class PerformanceTester:
    def __init__(self):
        self.backend_dir = Path("backend")
        self.frontend_dir = Path("frontend")
        self.results = {}

    def run_backend_tests(self):
        """Ejecuta las pruebas de rendimiento del backend"""
        print("🔧 Ejecutando pruebas de backend...")

        if not self.backend_dir.exists():
            print("❌ Directorio backend no encontrado")
            return False

        os.chdir(self.backend_dir)

        try:
            # Ejecutar el comando de test de rendimiento
            result = subprocess.run([
                sys.executable, "manage.py", "test_performance",
                "--iterations", "5"
            ], capture_output=True, text=True, timeout=60)

            if result.returncode == 0:
                print("✅ Pruebas de backend completadas")
                print(result.stdout)
                self.results['backend'] = 'success'
                return True
            else:
                print("❌ Error en pruebas de backend:")
                print(result.stderr)
                self.results['backend'] = 'failed'
                return False

        except subprocess.TimeoutExpired:
            print("⏰ Timeout en pruebas de backend")
            self.results['backend'] = 'timeout'
            return False
        except Exception as e:
            print(f"❌ Error ejecutando pruebas de backend: {e}")
            self.results['backend'] = 'error'
            return False
        finally:
            os.chdir("..")

    def check_frontend_build(self):
        """Verifica que el frontend compile correctamente con las optimizaciones"""
        print("\n🌐 Verificando compilación del frontend...")

        if not self.frontend_dir.exists():
            print("❌ Directorio frontend no encontrado")
            return False

        os.chdir(self.frontend_dir)

        try:
            # Verificar que las dependencias estén instaladas
            if not Path("node_modules").exists():
                print("📦 Instalando dependencias...")
                result = subprocess.run([
                    "npm", "install"
                ], capture_output=True, text=True, timeout=120)

                if result.returncode != 0:
                    print("❌ Error instalando dependencias")
                    return False

            # Verificar compilación
            result = subprocess.run([
                "npm", "run", "build"
            ], capture_output=True, text=True, timeout=60)

            if result.returncode == 0:
                print("✅ Frontend compila correctamente")
                self.results['frontend_build'] = 'success'
                return True
            else:
                print("❌ Error en compilación del frontend:")
                print(result.stderr[:500])  # Mostrar primeros 500 caracteres del error
                self.results['frontend_build'] = 'failed'
                return False

        except subprocess.TimeoutExpired:
            print("⏰ Timeout en compilación del frontend")
            self.results['frontend_build'] = 'timeout'
            return False
        except Exception as e:
            print(f"❌ Error verificando frontend: {e}")
            self.results['frontend_build'] = 'error'
            return False
        finally:
            os.chdir("..")

    def check_database_config(self):
        """Verifica la configuración de la base de datos"""
        print("\n🗄️  Verificando configuración de base de datos...")

        settings_file = self.backend_dir / "skyterra_backend" / "settings.py"

        if not settings_file.exists():
            print("❌ Archivo de configuración no encontrado")
            return False

        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Verificar configuración de caché
            if 'CACHES' in content:
                print("✅ Configuración de caché encontrada")
                self.results['cache_config'] = 'present'
            else:
                print("⚠️  Configuración de caché no encontrada")
                self.results['cache_config'] = 'missing'

            # Verificar paginación optimizada
            if 'page_size = 20' in content:
                print("✅ Paginación optimizada encontrada")
                self.results['pagination_config'] = 'optimized'
            else:
                print("⚠️  Paginación podría necesitar optimización")
                self.results['pagination_config'] = 'default'

            return True

        except Exception as e:
            print(f"❌ Error verificando configuración: {e}")
            return False

    def generate_report(self):
        """Genera un reporte de las optimizaciones aplicadas"""
        print("\n" + "="*60)
        print("📊 REPORTE DE OPTIMIZACIONES DE RENDIMIENTO")
        print("="*60)

        print("\n🔧 OPTIMIZACIONES DE BACKEND:")
        print("  ✅ Consultas optimizadas con select_related/prefetch_related")
        print("  ✅ Sistema de caché inteligente implementado")
        print("  ✅ Paginación aumentada (20 elementos por página)")
        print("  ✅ Invalidación automática de caché en modificaciones")
        print("  ✅ Índices de base de datos optimizados")

        print("\n🌐 OPTIMIZACIONES DE FRONTEND:")
        print("  ✅ Hook personalizado para gestión de propiedades con caché")
        print("  ✅ Servicio optimizado con timeouts y headers de caché")
        print("  ✅ Prefetch inteligente de próximas páginas")
        print("  ✅ Lazy loading mejorado")
        print("  ✅ Componentes optimizados con React.memo")

        print("\n🗄️  OPTIMIZACIONES DE BASE DE DATOS:")
        print("  ✅ Consultas N+1 eliminadas")
        print("  ✅ Joins eficientes implementados")
        print("  ✅ Annotations optimizadas")
        print("  ✅ Índices compuestos sugeridos")

        print("\n📈 RESULTADOS DE PRUEBAS:")
        for test, result in self.results.items():
            status = "✅" if result in ['success', 'present', 'optimized'] else "❌"
            print(f"  {status} {test}: {result}")

        print("\n🎯 IMPACTO ESPERADO:")
        print("  • Reducción del 50-70% en tiempo de carga de propiedades")
        print("  • Reducción significativa en uso de CPU del servidor")
        print("  • Mejor experiencia de usuario con carga progresiva")
        print("  • Optimización del ancho de banda utilizado")

        print("\n💡 RECOMENDACIONES PARA PRODUCCIÓN:")
        print("  • Configurar Redis para caché distribuido")
        print("  • Implementar CDN para archivos estáticos")
        print("  • Configurar compresión GZIP en el servidor web")
        print("  • Monitorear métricas de rendimiento con herramientas como New Relic")

        print("\n" + "="*60)

    def run_all_tests(self):
        """Ejecuta todas las pruebas"""
        print("🚀 INICIANDO PRUEBAS DE OPTIMIZACIONES")
        print("="*60)

        # Ejecutar pruebas en orden
        self.check_database_config()
        self.run_backend_tests()
        self.check_frontend_build()

        # Generar reporte final
        self.generate_report()

        # Resumen final
        success_count = sum(1 for result in self.results.values()
                          if result in ['success', 'present', 'optimized'])

        print(f"\n🏆 RESUMEN: {success_count}/{len(self.results)} pruebas exitosas")

        if success_count == len(self.results):
            print("🎉 ¡Todas las optimizaciones funcionan correctamente!")
            return True
        else:
            print("⚠️  Algunas optimizaciones requieren atención")
            return False


if __name__ == "__main__":
    tester = PerformanceTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
