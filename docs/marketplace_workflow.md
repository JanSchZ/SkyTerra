# SkyTerra Marketplace & Operaciones

Este documento resume la primera iteración del flujo unificado entre vendedores, administradores y operadores de dron. Incluye la estructura de datos recién agregada, endpoints principales, componentes de interfaz y puntos pendientes para las siguientes iteraciones.

## 1. Estados de la publicación

La entidad `Property` incorpora una máquina de estados granular orientada a la barra de progreso:

| Nodo | Subestados | Progreso aproximado |
| --- | --- | --- |
| `review` | `draft`, `submitted`, `under_review`, `changes_requested`, `resubmitted` | 0–30% |
| `approved` | `approved_for_shoot` | 45% |
| `pilot` | `inviting`, `assigned`, `scheduling`, `scheduled`, `shooting`, `finished` | 48–75% |
| `post` | `uploading`, `received`, `qc`, `editing`, `preview_ready`, `ready_for_publish` | 80–98% |
| `live` | `published` | 100% |

Cada transición crea un registro en `PropertyStatusHistory` (actor, mensaje y `percent`). Las alertas visibles para el vendedor viven en `Property.workflow_alerts`.

## 2. Nuevos modelos principales

- **ListingPlan**: define planes, precio y SLA (`sla_hours`).
- **PilotProfile / PilotDocument**: perfil operativo, disponibilidad y documentos obligatorios.
- **Job**: representa el trabajo operativo por propiedad (estado, agenda, payouts, ofertas vinculadas).
- **JobOffer**: invitaciones en oleadas a pilotos (score, radio, TTL). El primero en aceptar asigna el trabajo.

## 3. Endpoints clave

Ruta base REST `/api/`.

### Propiedades
- `POST /properties/` creación por vendedor autenticado.
- `PATCH /properties/{id}/` edición por propietario o staff.
- `POST /properties/{id}/submit/` envía a revisión (`submitted`).
- `GET /properties/{id}/status-bar/` y `/status-history/` para UI de avance.
- `POST /properties/{id}/transition/` uso interno admin (mover a cualquier subestado).
- `POST /properties/{id}/alerts/` y `/clear-alerts/` para administrar alertas visibles.

### Planes y workflow
- `GET /plans/` lista de planes disponibles.
- `GET /properties/workflow-structure/` definiciones de nodos/subestados (front).

### Pilotos y matching
- `GET/PATCH /pilot-profiles/me/` perfil del operador (incluye documentos).
- `POST /pilot-profiles/availability/` heartbeat y disponibilidad.
- `GET /jobs/available/` obtiene trabajos con invitaciones pendientes.
- `POST /job-offers/{id}/accept|decline/` acciones sobre la invitación.
- `POST /jobs/{id}/schedule/` confirma agenda.
- `POST /jobs/{id}/start-flight/` y `/complete-flight/` permiten al piloto iniciar/finalizar la grabación.
- `POST /jobs/{id}/invite-next-wave/` (admin) fuerza una nueva ola de invitaciones.
- `POST /jobs/{id}/set-status/` (admin) sincroniza job y property.
- El backend expira ofertas vencidas y lanza automáticamente la siguiente ola (máx. 3) agregando alertas si no hay pilotos disponibles.
- La transición `approved_for_shoot` crea automáticamente el `Job`, asigna plan/payout y dispara la primera ola de matching.

## 4. Frontend Web (Vendedor)

- **Dashboard** (`/dashboard`): cards con barra de estado (`StatusBar`), alertas operativas (matching, documentos), plan activo y CTA a la guía.
- **Wizard** (`/seller/listings/new` y `/seller/listings/:id`): pasos Datos → Documentos → Polígono (Mapbox + `PropertyBoundaryDraw`) → Preferencias → Revisión. El botón “Enviar a revisión” sólo se habilita cuando hay polígono guardado y los documentos críticos están aprobados.
- Servicio centralizado `services/marketplaceService.js` para planes, propiedades, documentos, polígono y transiciones.

## 5. App Operadores (Expo)

- Pantalla principal tipo “Uber”: cards con pago estimado, distancia, countdown de invitación, y CTAs `Aceptar`/`Pasar`. Incluye toggle de disponibilidad, `listAvailableJobs()` y expira ofertas caducadas automáticamente.
- Detalle de trabajo muestra estado actual, instrucciones del vendedor, agenda, timeline y botones contextuales para confirmar horario, iniciar vuelo y finalizar vuelo.
- Servicios `fetchPilotProfile`, `setAvailability`, `acceptOffer`, `declineOffer`, `fetchJob`, `scheduleJob`, `startFlight`, `completeFlight` reemplazan los endpoints antiguos.

## 6. Configuración y dependencias

- Se creó migración `properties/migrations/0019_*` para nuevos modelos y campos.
- React web reutiliza Mapbox (`VITE_MAPBOX_ACCESS_TOKEN`). Si falta token, la herramienta de polígono mostrará base neutra.
- El proyecto móvil ya usaba `expo-constants`; definir `apiUrl` en `app.config.ts` o `.env`.

## 7. Pendientes sugeridos (siguientes iteraciones)

1. **Notificaciones**: conectar emails/Push en cada transición (`submitted`, `changes_requested`, `assigned`, `scheduled`, `preview_ready`, `published`).
2. **Validaciones avanzadas**: reglas de negocio por plan (documentos obligatorios, límites de área, reintentos de oferta).
3. **Coordinación agenda**: formularios reales vendedor ↔ piloto (rangos personalizados y mensajes).
4. **Estado Operador**: endpoints adicionales `jobs/{id}/start` y `jobs/{id}/complete` con checklist.
5. **Analytics**: tableros SLA en admin, consumo de `PropertyStatusHistory` y `JobTimelineEvent`.
6. **Seguridad**: webhook para actualizar documentos vencidos, bloqueo automático, auditoría de acciones admin.
7. **Pagos**: enlazar `price_amount`/`pilot_payout_amount` con flujos reales (Stripe/transferencias) y split.
8. **Postproducción**: endpoints automáticos para marcar `uploading → received → qc → editing`, con colas de transcodificación.

## 8. Testing rápido Manual

- Crear publicación nueva → completar wizard → subir documento (PDF) → dibujar polígono → guardar preferencias → enviar a revisión.
- Desde admin (Django admin) mover a `approved_for_shoot` y crear job (automático en migración actual cuando se apruebe manualmente mediante acción `transition`).
- Iniciar app operador → alternar disponibilidad → ver invitaciones → aceptar → revisar detalle.

Mantener este documento actualizado conforme se automaticen pasos (matching inteligente, reprogramaciones, etc.).
