function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const propertyNames = [
    "Fundo Los Coihues", "Parcela Vista al Lago", "Loteo El Arrayán", "Hacienda Pucón",
    "Terreno Orilla de Río", "Campo Agrícola Valdivia", "Bosque Nativo Chiloé", "Mirador del Volcán Osorno"
];

const locations = [
    { name: "Puerto Varas, Los Lagos", coords: [-41.32, -72.98] },
    { name: "Pucón, Araucanía", coords: [-39.27, -71.97] },
    { name: "Frutillar, Los Lagos", coords: [-41.12, -73.05] },
    { name: "Valdivia, Los Ríos", coords: [-39.81, -73.24] },
    { name: "Chiloé, Los Lagos", coords: [-42.61, -73.76] },
    { name: "Osorno, Los Lagos", coords: [-40.57, -73.13] },
];

const propertyTypes = ["Fundo", "Parcela", "Loteo", "Terreno"];
const statuses = ["approved", "pending", "rejected"];

const mockDocuments = [
    { id: 1, name: 'Contrato Compraventa', type: 'Contrato' },
    { id: 2, name: 'Plano del Terreno', type: 'Plano' },
    { id: 3, name: 'Certificado de Dominio Vigente', type: 'Certificado' },
];

export const mockProperties = Array.from({ length: 50 }, (_, i) => {
    const location = locations[i % locations.length];
    return {
        id: 1000 + i,
        name: propertyNames[i % propertyNames.length] + ` #${i+1}`,
        location: location.name,
        type: propertyTypes[i % propertyTypes.length],
        status: statuses[i % statuses.length],
        price: Math.floor(Math.random() * (250000 - 20000 + 1) + 20000) * 1000,
        size: Math.floor(Math.random() * (100 - 2 + 1) + 2), // Hectares
        publicationDate: getRandomDate(new Date(2022, 0, 1), new Date()).toISOString().split('T')[0],
        plusvalia_score: Math.floor(Math.random() * 95) + 5, // Score from 5 to 100
        documents: mockDocuments.map(doc => ({ ...doc, id: doc.id * 1000 + i, status: statuses[Math.floor(Math.random() * statuses.length)] })),
        agent: {
            name: `Agent ${i % 5 + 1}`,
            avatar: `https://i.pravatar.cc/150?u=agent${i%5+1}`
        },
        image: `https://source.unsplash.com/random/800x600?landscape,chile,nature&sig=${i}`,
    };
}); 