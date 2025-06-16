// This service simulates AI-powered operations.

const highPriorityKeywords = ['error', 'no puedo', 'caído', 'urgente', 'falla', 'problema', 'bloqueado'];
const mediumPriorityKeywords = ['duda', 'ayuda', 'cómo', 'facturación', 'lento'];

/**
 * Assigns a priority to a ticket based on its title.
 * @param {string} title The title of the ticket.
 * @returns {'high' | 'medium' | 'low'} The assigned priority.
 */
export const assignTicketPriority = (title) => {
    const lowerCaseTitle = title.toLowerCase();

    for (const keyword of highPriorityKeywords) {
        if (lowerCaseTitle.includes(keyword)) {
            // Simulate sending an immediate email for high priority tickets
            console.log(`%c[AI Notification Service]%c Sending immediate email for high priority ticket: "${title}"`, 'color: #8A2BE2; font-weight: bold;', 'color: inherit;');
            return 'high';
        }
    }

    for (const keyword of mediumPriorityKeywords) {
        if (lowerCaseTitle.includes(keyword)) {
            return 'medium';
        }
    }

    return 'low';
}; 