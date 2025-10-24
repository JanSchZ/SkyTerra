export type PilotDocumentType =
  | 'id'
  | 'license'
  | 'insurance'
  | 'drone_registration'
  | 'background_check';

export interface DocumentBlueprint {
  type: PilotDocumentType;
  title: string;
  description: string;
  acceptedTypes: string[];
  maxSizeBytes?: number; // Optional max file size in bytes
}

export const DOCUMENT_UPLOAD_LIMITS = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxFileSizeMB: 10,
} as const;

// Helper function to get file size limit for a document type
export const getDocumentSizeLimit = (docType: PilotDocumentType): number => {
  return DOCUMENT_UPLOAD_LIMITS.maxFileSizeBytes;
};

// Helper function to format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const documentBlueprints: DocumentBlueprint[] = [
  {
    type: 'id',
    title: 'Documento de identidad',
    description: 'Cédula o pasaporte vigente en formato PDF, JPG o PNG.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'license',
    title: 'Licencia de operador',
    description: 'Licencia DGAC o equivalente, incluye reverso si aplica.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'insurance',
    title: 'Seguro de responsabilidad',
    description: 'Certificado de cobertura actualizado para operaciones RPAS.',
    acceptedTypes: ['application/pdf', 'image/jpeg'],
  },
  {
    type: 'drone_registration',
    title: 'Registro de aeronave',
    description: 'Documento de inscripción del dron principal y número de serie.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'background_check',
    title: 'Certificado de antecedentes',
    description: 'Certificado de antecedentes vigente emitido por el Registro Civil.',
    acceptedTypes: ['application/pdf', 'image/jpeg'],
  },
];

export const DOCUMENT_TOTAL = documentBlueprints.length;
