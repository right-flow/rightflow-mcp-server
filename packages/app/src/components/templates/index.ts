/**
 * Template Components Exports
 */

export { default as TemplateGallery } from './TemplateGallery';
export { default as TemplateManager } from './TemplateManager';

// Re-export services for convenience
export { templateService, type FormTemplate } from '../../services/templateService';
export {
  pdfFieldMapper,
  type PDFFieldInfo,
  type FieldMapping,
  type MappingProfile
} from '../../services/pdfFieldMapper';