import { assignTicketPriority } from '../../../services/aiService';

const ticketTitles = [
    "No puedo subir fotos de mi propiedad",
    "Error al iniciar sesión en mi cuenta",
    "Sugerencia: Filtro por cercanía en el mapa",
    "¿Cómo creo un tour 360?",
    "Problema con la facturación de mi plan",
    "El mapa no carga los datos correctamente",
    "Mi contraseña no funciona",
    "Consulta sobre el plan Pro"
];

const mockUsers = [
    { id: 1, name: 'Usuario 1' },
    { id: 2, name: 'Usuario 2' },
    { id: 3, name: 'Usuario 3' },
    { id: 4, name: 'Usuario 4' },
    { id: 5, name: 'Usuario 5' },
    { id: 6, name: 'Usuario 6' },
    { id: 7, name: 'Usuario 7' },
    { id: 8, name: 'Usuario 8' },
    { id: 9, name: 'Usuario 9' },
    { id: 10, name: 'Usuario 10' },
    { id: 11, name: 'Usuario 11' },
    { id: 12, name: 'Usuario 12' },
];

const mockMessages = (ticketId) => ([
    { id: ticketId * 100 + 1, author: 'user', text: 'Este es el problema inicial que tengo.', timestamp: '2023-10-27 10:00' },
    { id: ticketId * 100 + 2, author: 'support', text: 'Hemos recibido su consulta y la estamos revisando.', timestamp: '2023-10-27 10:05' },
]);


export const mockTickets = Array.from({ length: 8 }, (_, i) => {
    const title = ticketTitles[i];
    const user = mockUsers[i % mockUsers.length];
    const status = i < 2 ? 'new' : i < 5 ? 'in-progress' : 'resolved';

    return {
        id: i + 1,
        title: title,
        user: user,
        status: status,
        priority: assignTicketPriority(title),
        messages: mockMessages(i + 1),
    };
}); 