export type GuideId = 'preflight' | 'safety' | 'billing' | 'shooting';

export interface GuideSection {
  title: string;
  bullets?: string[];
  body?: string;
}

export interface Guide {
  id: GuideId;
  title: string;
  description?: string;
  sections: GuideSection[];
}

export const guides: Record<GuideId, Guide> = {
  preflight: {
    id: 'preflight',
    title: 'Checklist de Pre‑vuelo',
    description:
      'Pasos mínimos antes de cada salida para reducir riesgos y asegurar calidad.',
    sections: [
      {
        title: 'Clima y entorno',
        bullets: [
          'Viento < 30 km/h; sin ráfagas peligrosas; sin lluvia.',
          'Evitar zonas con interferencias (subestaciones, torres, aeropuerto).',
          'Revisar NOTAM locales y restricciones temporales.',
        ],
      },
      {
        title: 'Equipo y baterías',
        bullets: [
          'Baterías cargadas y balanceadas; registrar ciclos críticos.',
          'Hélices sin fisuras; apriete y repuestos disponibles.',
          'Tarjetas de memoria formateadas; espacio >= 32 GB libre.',
        ],
      },
      {
        title: 'Permisos y seguridad',
        bullets: [
          'Área segura delimitada; briefing a asistentes y cliente.',
          'Contacto de emergencia y botiquín; extintor si es requerido.',
          'Seguro vigente y documentos del operador a mano.',
        ],
      },
      {
        title: 'Plan de toma',
        bullets: [
          'Waypoints y alturas revisados; geocercas configuradas.',
          'Checklist de tomas (panorámicas, detalles, fachadas, puntos clave).',
          'Formato y perfil definidos: fotos en RAW/DNG; video en LOG (D‑Log/D‑Log‑M).',
        ],
      },
    ],
  },
  safety: {
    id: 'safety',
    title: 'Protocolos de Seguridad',
    description:
      'Buenas prácticas de operación RPAS y pautas para incidentes y reportes.',
    sections: [
      {
        title: 'Zonas y alturas',
        bullets: [
          'No sobrevolar a personas no involucradas.',
          'Mantener línea de vista (VLOS) en todo momento.',
          'Respetar alturas máximas y distancias a aeródromos.',
        ],
      },
      {
        title: 'Emergencias',
        bullets: [
          'Procedimiento de RTH y aterrizaje forzado documentado.',
          'Interrupción inmediata ante pérdida de control o enlace.',
          'Reporte de incidentes al equipo de operaciones dentro de 24h.',
        ],
      },
      {
        title: 'Privacidad y ética',
        bullets: [
          'Evitar grabar propiedades sin consentimiento.',
          'Resguardar material sensible; compartir solo con el cliente.',
        ],
      },
    ],
  },
  billing: {
    id: 'billing',
    title: 'Facturación y Pagos',
    description: 'Cómo entregar boletas/facturas y plazos de pago estimados.',
    sections: [
      {
        title: 'Documentos',
        bullets: [
          'Emitir boleta/factura con el monto acordado (ver app en el detalle).',
          'Adjuntar RUT y datos bancarios si es primera vez.',
        ],
      },
      {
        title: 'Plazos y estados',
        bullets: [
          'Pago se gestiona al aprobar la entrega final (QA interno).',
          'Plazo bancario habitual: 5–10 días hábiles desde aprobación.',
        ],
      },
      {
        title: 'Soporte',
        bullets: [
          'Incidencias de pagos: operaciones@skyterra.cl',
          'Adjuntar ID del trabajo y comprobantes.',
        ],
      },
    ],
  },
  shooting: {
    id: 'shooting',
    title: 'Instructivo de Grabación',
    description:
      'Configuraciones recomendadas de cámara y dron para capturar fotos y video consistentes y de alta calidad.',
    sections: [
      {
        title: 'Antes de despegar',
        bullets: [
          'Actualiza firmware de dron y control. Calibra IMU y brújula si el equipo lo solicita.',
          'Limpia lente y sensores. Verifica hélices y ajuste del gimbal.',
          'Perfil de color: siempre LOG (D‑Log/D‑Log‑M o equivalente). Captura en 10‑bit si está disponible. Ajusta el histograma y sobreexpón levemente (+0.3 EV) si la escena es muy contrastada para preservar altas luces.',
        ],
      },
      {
        title: 'Fotografía — ajustes recomendados',
        bullets: [
          'Formato: RAW (DNG) para máxima latitud de edición.',
          'Modo: panorámica 360° cuando corresponda (propiedades/entornos), con exposición bloqueada antes de iniciar la secuencia.',
          'Velocidad (shutter): 1/400 para congelar movimiento y minimizar trepidación.',
          'ISO: Automático con tope bajo (si tu modelo lo permite) para evitar ruido excesivo.',
          'Apertura: Automática (o fija en el “punto dulce”, p.ej. f/2.8–f/4 en equipos con apertura variable).',
        ],
      },
      {
        title: 'Video — ajustes recomendados',
        bullets: [
          'Perfil de color: LOG (D‑Log/D‑Log‑M). 10‑bit si es posible; planifica una gradación básica (contraste/saturación) en post.',
          'Resolución: mínimo 4K; tasa: 30 fps.',
          'Regla 180°: usa shutter ≈ 1/60 para 30 fps (usa ND si es necesario para mantener el obturador).',
          'ISO: Automático con límite bajo; preferir ISO nativo si tu dron lo ofrece.',
          'Balance de blancos: Fijo (5600K día) para evitar cambios de color durante la toma.',
          'Estabiliza con giros suaves (pitch/yaw) y evita cambios bruscos de altura. Planifica trayectorias rectas y órbitas lentas.',
        ],
      },
      {
        title: 'Plan de tomas sugerido',
        bullets: [
          'Establece 2–3 planos generales (frontal, posterior, lateral) y 2–3 detalles clave (accesos, señalética, entorno inmediato).',
          'Para video, mezcla travellings a baja altura con tomas elevadas estáticas y una órbita suave de 180° alrededor del punto principal.',
          'Evita volar sobre personas o vías de alto tránsito. Mantén VLOS (línea de vista) y respeta alturas máximas.',
        ],
      },
      {
        title: 'Fuentes y referencias',
        bullets: [
          'Normativa DGAC (Chile): https://www.dgac.gob.cl (RPAS / Drones).',
          'Guías de cámara DJI (modelos y parámetros): https://www.dji.com/support',
          'Buenas prácticas de cinematografía aérea (ND / 180° rule): https://www.premiumbeat.com/blog/the-180-degree-shutter-rule/ (inglés).',
        ],
      },
    ],
  },
};
