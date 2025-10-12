export const demoMapProperties = [
  {
    id: 'demo-lanalhue-retreat',
    name: 'Reserva Bosque de Lanalhue',
    location: 'Canete, Region del Biobio',
    region: 'Biobio',
    municipality: 'Canete',
    listing_type: 'sale',
    price: 680000000,
    rent_price: null,
    currency: 'CLP',
    size: 112,
    latitude: -37.8659,
    longitude: -73.4682,
    plusvalia_score: 86,
    has_tour: false,
    description:
      'Terreno mixto con 800 metros de ribera en Lago Lanalhue, bosque nativo y lomas suaves ideales para un lodge boutique o proyecto agro-turistico. Cuenta con acceso por camino rural estabilizado y factibilidad electrica en el deslinde norte.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      },
      {
        url: 'https://images.unsplash.com/photo-1545259749-2ea3ebf61fa5?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    features: ['Ribera de lago', 'Bosque nativo', 'Factibilidad electrica'],
    water_sources: ['Lago Lanalhue', 'Vertientes naturales'],
    access_roads: ['Camino rural ripiado con mantenimiento municipal'],
    zoning: 'Uso mixto rural (turismo y explotacion silvoagropecuaria)',
    is_demo: true,
  },
  {
    id: 'demo-pampa-andina',
    name: 'Estancia Pampa Andina',
    location: 'Coyhaique, Region de Aysen',
    region: 'Aysen',
    municipality: 'Coyhaique',
    listing_type: 'sale',
    price: 950000000,
    rent_price: null,
    currency: 'CLP',
    size: 185,
    latitude: -45.5684,
    longitude: -71.9502,
    plusvalia_score: 91,
    has_tour: false,
    description:
      'Predio cordillerano con praderas mejoradas, lomajes y dos vegas activas. Vistas despejadas al valle Simpson y acceso directo a ruta X-608. Perfecto para desarrollo ganadero premium con instalacion de glamping panoramico.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1455659817273-f96807779c84?auto=format&fit=crop&w=1200&q=80',
      },
      {
        url: 'https://images.unsplash.com/photo-1523419409543-0c1df022bdd7?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    features: ['Praderas mejoradas', 'Dos vegas activas', 'Vista a valle'],
    water_sources: ['Estero de deshielo', 'Pozos someros'],
    access_roads: ['Ruta X-608 con acceso entoscado'],
    zoning: 'Uso agropecuario intensivo',
    is_demo: true,
  },
];

export default demoMapProperties;
