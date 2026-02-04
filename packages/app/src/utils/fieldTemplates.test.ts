import { describe, it, expect, vi } from 'vitest';
import { loadFieldsFromFile, saveFieldsToFile } from './fieldTemplates';
import { FieldDefinition } from '@/types/fields';

describe('fieldTemplates - Station Field Support', () => {
  const baseField: Partial<FieldDefinition> = {
    id: '1',
    type: 'text',
    pageNumber: 1,
    x: 100,
    y: 100,
    width: 200,
    height: 30,
    name: 'test_field',
    required: false,
    direction: 'rtl',
  };

  describe('loadFieldsFromFile', () => {
    it('should default station to "client" for legacy fields without station', async () => {
      const legacyField: FieldDefinition = {
        ...baseField,
        id: '1',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'legacy_field',
        required: false,
        direction: 'rtl',
      };

      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'Legacy Template',
        fields: [legacyField],
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 1,
          fieldTypes: { text: 1 },
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'legacy-template.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('client');
    });

    it('should preserve station value from new format templates', async () => {
      const fieldWithStation: FieldDefinition = {
        ...baseField,
        id: '2',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'agent_field',
        required: false,
        direction: 'rtl',
        station: 'agent',
      };

      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'New Template',
        fields: [fieldWithStation],
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 1,
          fieldTypes: { text: 1 },
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'new-template.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('agent');
    });

    it('should handle custom station values', async () => {
      const fieldWithCustomStation: FieldDefinition = {
        ...baseField,
        id: '3',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'supervisor_field',
        required: false,
        direction: 'rtl',
        station: 'supervisor',
      };

      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'Custom Station Template',
        fields: [fieldWithCustomStation],
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 1,
          fieldTypes: { text: 1 },
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'custom-template.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('supervisor');
    });

    it('should handle mixed station values in same template', async () => {
      const clientField: FieldDefinition = {
        ...baseField,
        id: '4',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'client_field',
        required: false,
        direction: 'rtl',
        station: 'client',
      };

      const agentField: FieldDefinition = {
        ...baseField,
        id: '5',
        type: 'signature',
        pageNumber: 1,
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        name: 'agent_signature',
        required: false,
        direction: 'rtl',
        station: 'agent',
      };

      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'Mixed Station Template',
        fields: [clientField, agentField],
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 2,
          fieldTypes: { text: 1, signature: 1 },
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'mixed-template.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      expect(result).toHaveLength(2);
      expect(result[0].station).toBe('client');
      expect(result[1].station).toBe('agent');
    });

    it('should handle legacy array format (without template wrapper)', async () => {
      const legacyArrayField: FieldDefinition = {
        ...baseField,
        id: '6',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'old_format_field',
        required: false,
        direction: 'rtl',
      };

      const templateContent = JSON.stringify([legacyArrayField]);

      const file = new File([templateContent], 'legacy-array.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('client'); // Should default to client
    });

    it('should gracefully handle undefined fields in array', async () => {
      const validField: FieldDefinition = {
        ...baseField,
        id: '7',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'valid_field',
        required: false,
        direction: 'rtl',
      };

      // Manually create array with undefined elements
      const fieldsArray = [
        validField,
        undefined as any, // undefined at index 1
        validField,
        null as any, // null at index 3
        validField,
      ];

      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'Template with undefined fields',
        fields: fieldsArray,
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 5,
          fieldTypes: { text: 3 },
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'undefined-fields.json', {
        type: 'application/json',
      });

      const result = await loadFieldsFromFile(file);

      // Should skip undefined/null fields and only return valid ones
      expect(result).toHaveLength(3);
      expect(result.every(f => f.id)).toBe(true);
      expect(result.every(f => f.name === 'valid_field')).toBe(true);
    });

    it('should throw error when all fields are invalid', async () => {
      const templateContent = JSON.stringify({
        version: '1.0',
        name: 'Invalid Template',
        fields: [undefined, null, undefined],
        createdAt: new Date().toISOString(),
        metadata: {
          totalFields: 3,
          fieldTypes: {},
          hasHebrewFields: false,
        },
      });

      const file = new File([templateContent], 'all-invalid.json', {
        type: 'application/json',
      });

      await expect(loadFieldsFromFile(file)).rejects.toThrow('לא נמצאו שדות תקינים בקובץ');
    });
  });

  describe('saveFieldsToFile', () => {
    it('should include station property in exported JSON', () => {
      // Mock DOM methods
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const mockLink = document.createElement('a');
      mockLink.click = vi.fn();
      createElementSpy.mockReturnValue(mockLink);
      appendChildSpy.mockImplementation(() => mockLink);
      removeChildSpy.mockImplementation(() => mockLink);

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock Blob
      let blobContent = '';
      global.Blob = vi.fn((content: any[]) => {
        blobContent = content[0];
        return {} as Blob;
      }) as any;

      const fieldWithStation: FieldDefinition = {
        ...baseField,
        id: '7',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'station_field',
        required: false,
        direction: 'rtl',
        station: 'agent',
      };

      saveFieldsToFile([fieldWithStation], 'test-template', 'Test template with station');

      // Verify Blob was created with station property
      const savedData = JSON.parse(blobContent);
      expect(savedData.fields[0].station).toBe('agent');

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
