# Operator API (WIP)

Endpoints previstos para la app de operadores. Estos deben exponerse desde `services/api`.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/operator/jobs/` | GET | Lista trabajos disponibles para el operador autenticado (filtrados por radio/distancia). |
| `/api/operator/jobs/<id>/` | GET | Detalle completo del trabajo (propiedad, instrucciones, histórico). |
| `/api/operator/jobs/<id>/accept/` | POST | Operador acepta el trabajo. Payload opcional `eta_minutes`. |
| `/api/operator/jobs/<id>/start/` | POST | Marca inicio de grabación/desplazamiento. |
| `/api/operator/jobs/<id>/complete/` | POST | Completa el trabajo (payload con notas, enlaces a media). |
| `/api/operator/devices/` | POST | Registra token de notificaciones push (Expo/FCM). |
| `/api/operator/locations/` | POST | Reporta posición GPS periódica para matching y seguimiento. |
| `/api/media/presign-upload/` | POST | URL firmada para subir media (ya implementado). |

> Nota: proteger rutas con permisos específicos (`IsOperator`) y JWT cookies. Considerar Channels/Redis para actualizaciones en tiempo real.
