# SkyTerra Marketplace & Operaciones

Este documento describe el flujo operativo unificado entre vendedores, administradores y operadores de dron. Incluye la máquina de estados vigente, los endpoints expuestos por el backend, los componentes de interfaz que ya fueron actualizados y un backlog sugerido para las siguientes iteraciones.

## 1. Estados de la publicación

Cada propiedad recorre cinco hitos principales. El backend registra todas las transiciones en `PropertyStatusHistory` y expone un timeline consolidado (`workflow_timeline`) con duración por etapa, actor y cumplimiento de SLA.

| Etapa | Propósito | Disparadores principales |
| --- | --- | --- |
| `review` | Revisión documental y validación de datos. Para poder enviar la publicación se exige polígono guardado, documentos base aprobados y contacto operativo completo (nombre, teléfono y dirección de encuentro). | Creación de la propiedad, `submitted`, `changes_requested`. |
| `approved` | Validación final del equipo Skyterra. Se genera automáticamente el `Job`, se calculan payouts y se dispara la primera ola de invitaciones a pilotos dentro del radio definido por el plan. | `approved_for_shoot`. |
| `pilot` | Coordinación con el operador asignado: invitaciones, aceptación, agenda, vuelo y cierre de terreno. | `inviting`, `assigned`, `scheduling`, `scheduled`, `shooting`, `finished`. |
| `post` | Postproducción y control de calidad. El operador sube ZIP/RAW/JPG/PNG desde la app; el staff marca recepción, QC y edición. | `uploading`, `received`, `qc`, `editing`, `preview_ready`, `ready_for_publish`. |
| `live` | Publicación activa y visible en Skyterra. | `published`. |

Las alertas visibles para el vendedor continúan en `Property.workflow_alerts`. El timeline permite visualizar en dashboards cuántos días tomó cada etapa y quién accionó el último cambio.

## 2. Nuevos modelos principales

- **Property**: incorpora campos `contact_name`, `contact_phone`, `contact_email`, `address_*` y el método `build_workflow_timeline()`.
- **ListingPlan**: define planes, precios y SLA (`sla_hours`).
- **PilotProfile / PilotDocument**: perfil operativo, disponibilidad y documentos obligatorios.
- **Job**: trabajo operativo por propiedad (estado, agenda, payouts, ofertas). Si el plan no define `pilot_payout_amount`, se usa automáticamente el precio del plan como pago al operador.
- **JobOffer**: invitaciones en oleadas a pilotos (score, radio, TTL). El primero que acepta asigna el trabajo.

## 3. Endpoints clave

Ruta base REST `/api/`.

### Propiedades
- `POST /properties/`: creación por vendedor autenticado (contacto y dirección obligatorios).
- `PATCH /properties/{id}/`: edición por propietario o staff.
- `POST /properties/{id}/submit/`: envía a revisión (`submitted`).
- `GET /properties/{id}/`: incluye `status_bar`, `status_history`, `workflow_timeline` y requisitos de envío.
- `GET /properties/{id}/status-bar/` y `/status-history/`: endpoints ligeros para UI.
- `POST /properties/{id}/transition/`: uso interno de admin; la nueva vista de administración usa acciones rápidas sobre esta ruta.
- `POST /properties/{id}/alerts/` y `/clear-alerts/`: gestión de alertas visibles para el vendedor.

### Planes y workflow
- `GET /plans/`: planes disponibles.
- `GET /properties/workflow-structure/`: definición de nodos/subestados consumida por el front.

### Pilotos y matching
- `GET/PATCH /pilot-profiles/me/`: perfil del operador.
- `POST /pilot-profiles/availability/`: heartbeat y disponibilidad.
- `GET /jobs/available/`: trabajos con invitaciones pendientes.
- `POST /job-offers/{id}/accept|decline/`: acciones sobre la invitación.
- `POST /jobs/{id}/schedule/`: confirma agenda.
- `POST /jobs/{id}/start-flight/` y `/complete-flight/`: inicio y término de vuelo.
- `POST /jobs/{id}/invite-next-wave/` (admin): fuerza una nueva ola.
- `POST /jobs/{id}/set-status/` (admin): sincroniza job y property.

El backend expira ofertas vencidas y lanza automáticamente la siguiente ola (máximo 3), agregando alertas cuando no hay pilotos disponibles.

## 4. Frontend Web (Vendedor)

- **Dashboard (`/dashboard`)**: cards por publicación con barra de estado (`StatusBar`), timeline compacto (`WorkflowTimeline`), alertas y CTA contextuales. Se muestran los días que lleva cada etapa y el último actor.
- **Wizard (`/seller/listings/...`)**: pasos Datos → Documentos → Polígono → Preferencias → Revisión. El paso de datos ahora recopila contacto operativo y dirección exacta; no se puede enviar a revisión hasta completar estos campos, subir documentos críticos y guardar el polígono.
- **Servicios**: `services/marketplaceService.js` centraliza planes, propiedades, documentos, polígono y transiciones.

## 5. Panel de administración web

- **Dashboard operativo (`/admin/dashboard`)**: tarjetas KPI para pilotos disponibles, operaciones en terreno, postproducción en curso y alertas activas. Incluye distribución por etapa, duración promedio vs SLA y tabla de publicaciones en curso con timeline integrado.
- **Analítica (`/admin/analytics`)**: funnel consolidado por nodo, tiempos promedio/mediana por etapa y curva de altas recientes. Permite identificar cuellos de botella con datos provenientes de `workflow_timeline`.
- **Publicaciones (`/admin/publications`)**: tabla compacta con filtro por etapa, chip de estado, duración de la etapa actual y acciones rápidas (`changes_requested`, `approved_for_shoot`, `received`, `ready_for_publish`, `published`).
- **Detalle**: diálogo con timeline completo, contacto del vendedor (nombre, teléfono, email) y dirección. Todo se alimenta del campo `workflow_timeline` del backend.
- Las acciones rápidas llaman a `POST /properties/{id}/transition/` y actualizan automáticamente la lista.

## 6. App Operadores (Expo)

- Pantalla principal tipo “Uber” con payout igual al costo del plan (cuando no hay override), distancia, countdown de invitación y CTAs `Aceptar`/`Pasar`.
- Detalle de trabajo incluye estado, instrucciones, timeline, contacto del vendedor y dirección referencial para coordinar la visita.
- Se mantienen los servicios `fetchPilotProfile`, `setAvailability`, `acceptOffer`, `declineOffer`, `fetchJob`, `scheduleJob`, `startFlight`, `completeFlight`.

## 7. Configuración y dependencias

- Nueva migración `properties/migrations/0020_*` agrega campos de contacto/dirección y actualiza la trazabilidad del workflow.
- React web sigue usando Mapbox (`VITE_MAPBOX_ACCESS_TOKEN`). Si falta el token, la herramienta de polígono carga un estilo neutro.
- La app móvil (Expo) requiere `apiUrl` en `app.config.ts` o `.env` para consumir los nuevos campos.

## 8. Pendientes sugeridos

1. **Analytics**: tablero con promedios/SLA por etapa usando `workflow_timeline` y `JobTimelineEvent`.
2. **Notificaciones**: emails/push automáticos en transiciones clave (`submitted`, `changes_requested`, `assigned`, `scheduled`, `preview_ready`, `published`).
3. **Coordinación avanzada**: formularios para propuesta de horarios bidireccionales vendedor ↔ piloto.
4. **Seguridad**: webhook para documentos vencidos, bloqueo automático de pilotos sin papeles, auditoría de acciones admin.
5. **Pagos**: integrar `price_amount`/`pilot_payout_amount` con Stripe/transferencias y split de comisiones.
6. **Postproducción automática**: endpoints y colas para `uploading → received → qc → editing`.
7. **BI externo**: exportación o API dedicada con métricas del timeline para optimizar el flujo.

## 9. Testing rápido manual

1. Crear publicación nueva, completar datos de contacto/dirección, subir documentos obligatorios, dibujar polígono y enviar a revisión.
2. Desde el panel de admin usar “Aprobar y enviar a pilotos”. Verificar que se crea el `Job` y que los pilotos reciben la invitación.
3. En la app de operadores aceptar la invitación, marcar inicio y término del vuelo, subir entregables.
4. Regresar al panel de admin, revisar el timeline (etapas con duración), marcar “Marcar material recibido” y finalmente “Publicar en Skyterra”.
5. Validar que el vendedor ve el progreso actualizado en su dashboard y que la publicación aparece como activa en el marketplace.

Mantén este documento actualizado conforme se automaticen reprogramaciones, matching inteligente y analítica adicional.
