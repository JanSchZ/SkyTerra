# Guía de Seguridad - SkyTerra Frontend

## Configuración de Mapbox Segura

### Cambios Implementados

1. **Token de Mapbox en Variables de Entorno**
   - ✅ El token ya no está hardcodeado en el código
   - ✅ Se usa `VITE_MAPBOX_ACCESS_TOKEN` como variable de entorno
   - ✅ Fallback configurado para desarrollo

2. **Configuración Centralizada**
   - ✅ Archivo `src/config/environment.js` para centralizar configuración
   - ✅ Validación de token en tiempo de ejecución
   - ✅ Logging seguro (sin exponer tokens completos)

### Mejores Prácticas de Seguridad Mapbox

Basado en la [documentación oficial de Mapbox](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/):

#### 1. Gestión de Tokens
- **✅ No usar el token público por defecto** - Crear tokens específicos para cada aplicación
- **✅ Almacenar tokens en variables de entorno** - Nunca en el código fuente
- **⚠️ Pendiente: Restricciones de URL** - Configurar en la consola de Mapbox
- **⚠️ Pendiente: Rotación de tokens** - Implementar rotación programada

#### 2. Configuración Recomendada del Token

Para crear un token seguro en [Mapbox Console](https://console.mapbox.com/account/access-tokens/):

1. **Scopes necesarios:**
   ```
   styles:read
   fonts:read
   ```

2. **Restricciones de URL (Recomendado):**
   ```
   http://localhost:*
   https://tudominio.com/*
   ```

3. **No incluir scopes secretos en tokens públicos:**
   - ❌ uploads:write
   - ❌ uploads:read
   - ❌ styles:write

#### 3. Configuración del Proyecto

```bash
# 1. Copiar archivo de ejemplo
cp frontend/env.example frontend/.env

# 2. Editar con tu token
VITE_MAPBOX_ACCESS_TOKEN=pk.tu_token_aqui

# 3. Verificar que .env está en .gitignore (✅ Ya configurado)
```

### Estructura de Archivos de Configuración

```
frontend/
├── .env                    # Variables locales (no versionado)
├── env.example            # Plantilla de variables
├── src/
│   ├── config/
│   │   └── environment.js # Configuración centralizada
│   └── components/
│       └── map/
│           └── MapView.jsx # Usa config centralizada
```

### Validaciones Implementadas

1. **Validación de Token:**
   ```javascript
   if (!config.mapbox.accessToken || config.mapbox.accessToken === 'your_mapbox_access_token_here') {
     console.warn('⚠️ Mapbox access token not configured properly');
   }
   ```

2. **Logging Seguro:**
   ```javascript
   tokenPrefix: config.mapbox.accessToken?.substring(0, 10) + '...'
   ```

### Próximos Pasos de Seguridad

1. **Configurar Restricciones de URL** en Mapbox Console
2. **Implementar Rotación de Tokens** para producción
3. **Separar Tokens** para desarrollo y producción
4. **Monitoreo de Uso** a través de Mapbox Statistics

### Para Producción

1. **Variables de Entorno del Servidor:**
   ```bash
   VITE_MAPBOX_ACCESS_TOKEN=pk.tu_token_de_produccion
   ```

2. **Configurar Token con Restricciones:**
   - Solo dominios de producción
   - Scopes mínimos necesarios
   - Monitoreo de uso habilitado

3. **Separación de Ambientes:**
   ```bash
   # Desarrollo
   VITE_MAPBOX_ACCESS_TOKEN=pk.token_desarrollo
   
   # Producción  
   VITE_MAPBOX_ACCESS_TOKEN=pk.token_produccion
   ```

## Referencias

- [Mapbox Security Guide](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/) 