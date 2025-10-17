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
}

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
