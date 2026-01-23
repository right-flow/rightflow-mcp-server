/**
 * Data Sources Service
 * Handles CRUD operations for dynamic dropdown data sources
 *
 * Supports multiple source types:
 * - static: Hardcoded options
 * - csv_import: File upload (v1.0)
 * - json_import: File upload (v1.0)
 * - table: Database table (future)
 * - custom_query: SQL query (future)
 * - webhook: External CRM (v1.5 future)
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';

export interface DataSourceOption {
  label: string;
  value: string;
}

export interface DataSourceConfig {
  // For 'static'
  options?: DataSourceOption[];

  // For 'csv_import' and 'json_import'
  file_path?: string;
  file_url?: string;
  file_size?: number;
  row_count?: number;
  item_count?: number;
  original_file_name?: string;

  // For 'table' (future)
  table_name?: string;
  label_column?: string;
  value_column?: string;
  filter?: string;

  // For 'custom_query' (future)
  query?: string;
  params?: Record<string, any>;

  // For 'webhook' (future v1.5)
  endpoint_url?: string;
  secret?: string;

  // For 'api' (future v1.5)
  api_url?: string;
  headers?: Record<string, string>;
  transform_script?: string;
}

export type DataSourceType =
  | 'static'
  | 'csv_import'
  | 'json_import'
  | 'table'
  | 'custom_query'
  | 'webhook'
  | 'api';

export interface CreateDataSourceDto {
  user_id: string;
  org_id?: string | null;
  name: string;
  description?: string;
  source_type: DataSourceType;
  config: DataSourceConfig;
  cache_ttl?: number;
  is_active?: boolean;
}

export interface UpdateDataSourceDto {
  name?: string;
  description?: string;
  config?: DataSourceConfig;
  cache_ttl?: number;
  is_active?: boolean;
  user_id?: string; // Should be ignored in implementation for security
}

export interface DataSourceRecord {
  id: string;
  user_id: string;
  org_id?: string | null;
  name: string;
  description: string | null;
  source_type: DataSourceType;
  config: DataSourceConfig;
  cache_ttl: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export interface FindAllFilters {
  source_type?: DataSourceType;
  is_active?: boolean;
}

export class DataSourcesService {
  private readonly tableName = 'data_sources';
  private readonly MAX_CSV_ROWS = 10000;
  private readonly MAX_JSON_ITEMS = 10000;

  /**
   * Create a new data source
   * Validates input and enforces business rules
   */
  async create(dto: CreateDataSourceDto): Promise<DataSourceRecord> {
    const db = getDb();

    // Validation
    this.validateCreateDto(dto);

    const id = crypto.randomUUID();
    const now = new Date();

    const dataSource = {
      id,
      user_id: dto.user_id,
      org_id: dto.org_id || null,
      name: dto.name,
      description: dto.description || null,
      source_type: dto.source_type,
      config: JSON.stringify(dto.config),
      cache_ttl: dto.cache_ttl ?? 3600,
      is_active: dto.is_active ?? true,
      created_at: now,
      updated_at: null,
      deleted_at: null,
    };

    await db(this.tableName).insert(dataSource);

    return {
      ...dataSource,
      config: dto.config,
    };
  }

  /**
   * Find data source by ID with multi-tenant isolation
   * Returns null if not found or user doesn't have access
   * Supports both personal (user_id) and organization (org_id) ownership
   */
  async findById(
    id: string,
    userId: string,
    orgId?: string | null,
  ): Promise<DataSourceRecord | null> {
    const db = getDb();

    // First, fetch the data source
    const record = await db(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!record) {
      return null;
    }

    // Check access: personal ownership OR org membership
    const hasPersonalAccess = record.user_id === userId && !record.org_id;
    const hasOrgAccess = record.org_id && record.org_id === orgId;

    if (!hasPersonalAccess && !hasOrgAccess) {
      return null; // No access
    }

    return {
      ...record,
      config: typeof record.config === 'string'
        ? JSON.parse(record.config)
        : record.config,
    };
  }

  /**
   * Find all data sources for a user or organization
   * Supports filtering by source_type and is_active
   * Returns personal data sources if orgId is null, org data sources if orgId is provided
   */
  async findAll(
    userId: string,
    filters?: FindAllFilters,
    orgId?: string | null,
  ): Promise<DataSourceRecord[]> {
    const db = getDb();

    let query = db(this.tableName).whereNull('deleted_at');

    if (orgId) {
      // Return only org data sources
      query = query.where({ org_id: orgId });
    } else {
      // Return only personal data sources
      query = query.where({ user_id: userId }).whereNull('org_id');
    }

    if (filters?.source_type) {
      query = query.where({ source_type: filters.source_type });
    }

    if (filters?.is_active !== undefined) {
      query = query.where({ is_active: filters.is_active });
    }

    query = query.orderBy('created_at', 'desc');

    const records = await query;

    return records.map((record) => ({
      ...record,
      config: typeof record.config === 'string'
        ? JSON.parse(record.config)
        : record.config,
    }));
  }

  /**
   * Update a data source
   * Enforces multi-tenant isolation
   * Supports both personal and organization ownership
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateDataSourceDto,
    orgId?: string | null,
  ): Promise<DataSourceRecord> {
    const db = getDb();

    // Verify ownership
    const existing = await this.findById(id, userId, orgId);
    if (!existing) {
      throw new Error('Data source not found or access denied');
    }

    // Prepare update data (exclude user_id for security)
    const updateData: any = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) {
      this.validateName(dto.name);
      updateData.name = dto.name;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.config !== undefined) {
      updateData.config = JSON.stringify(dto.config);
    }

    if (dto.cache_ttl !== undefined) {
      updateData.cache_ttl = dto.cache_ttl;
    }

    if (dto.is_active !== undefined) {
      updateData.is_active = dto.is_active;
    }

    // Perform update
    await db(this.tableName)
      .where({ id })
      .update(updateData);

    // Return updated record
    const updated = await this.findById(id, userId, orgId);
    if (!updated) {
      throw new Error('Failed to retrieve updated data source');
    }

    return updated;
  }

  /**
   * Soft delete a data source
   * Sets deleted_at timestamp instead of removing from database
   * Supports both personal and organization ownership
   */
  async delete(id: string, userId: string, orgId?: string | null): Promise<void> {
    const db = getDb();

    // Verify ownership
    const existing = await this.findById(id, userId, orgId);
    if (!existing) {
      throw new Error('Data source not found or access denied');
    }

    // Soft delete
    await db(this.tableName)
      .where({ id })
      .update({
        deleted_at: new Date(),
      });
  }

  /**
   * Get options from a data source
   * Returns array of {label, value} objects
   * Supports both personal and organization ownership
   */
  async getOptions(
    id: string,
    userId: string,
    orgId?: string | null,
  ): Promise<DataSourceOption[]> {
    const dataSource = await this.findById(id, userId, orgId);

    if (!dataSource) {
      throw new Error('Data source not found or access denied');
    }

    if (!dataSource.is_active) {
      throw new Error('Data source is not active');
    }

    // Static options
    if (dataSource.source_type === 'static') {
      return dataSource.config.options || [];
    }

    // CSV/JSON imports - options are stored in config during upload
    if (dataSource.source_type === 'csv_import' || dataSource.source_type === 'json_import') {
      return dataSource.config.options || [];
    }

    // Future: Database table queries
    if (dataSource.source_type === 'table') {
      throw new Error('Database table data sources not yet implemented');
    }

    // Future: Custom SQL queries
    if (dataSource.source_type === 'custom_query') {
      throw new Error('Custom query data sources not yet implemented');
    }

    // Future: Webhook/API integrations
    if (dataSource.source_type === 'webhook' || dataSource.source_type === 'api') {
      throw new Error('Webhook/API data sources not yet implemented (v1.5)');
    }

    throw new Error(`Unsupported source type: ${dataSource.source_type}`);
  }

  /**
   * Parse CSV content into options array
   * Validates format and enforces limits
   */
  async parseCSV(csvContent: string): Promise<DataSourceOption[]> {
    const lines = csvContent.trim().split('\n');

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Validate headers
    const headers = lines[0].trim().toLowerCase();
    if (headers !== 'label,value') {
      throw new Error(
        'Invalid CSV format. Headers must be exactly: label,value',
      );
    }

    // Check row limit (excluding header)
    const dataRows = lines.slice(1);
    if (dataRows.length > this.MAX_CSV_ROWS) {
      throw new Error(
        `CSV exceeds maximum of ${this.MAX_CSV_ROWS.toLocaleString()} rows`,
      );
    }

    const options: DataSourceOption[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted values with commas)
      const parsed = this.parseCSVLine(line);

      if (parsed.length !== 2) {
        continue; // Skip malformed rows
      }

      const [label, value] = parsed;

      // Skip rows with empty label or value
      if (!label || !value) {
        continue;
      }

      options.push({ label, value });
    }

    return options;
  }

  /**
   * Parse JSON content into options array
   * Validates format and enforces limits
   */
  async parseJSON(jsonContent: string): Promise<DataSourceOption[]> {
    let data: any;

    // Parse JSON
    try {
      data = JSON.parse(jsonContent);
    } catch (error) {
      throw new Error('Invalid JSON format: ' + (error as Error).message);
    }

    // Validate it's an array
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of objects');
    }

    // Check item limit
    if (data.length > this.MAX_JSON_ITEMS) {
      throw new Error(
        `JSON exceeds maximum of ${this.MAX_JSON_ITEMS.toLocaleString()} items`,
      );
    }

    const options: DataSourceOption[] = [];

    for (const item of data) {
      // Skip non-objects
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      // Extract only label and value (ignore other fields)
      const label = item.label;
      const value = item.value;

      // Skip items missing label or value
      if (!label || !value) {
        continue;
      }

      options.push({
        label: String(label),
        value: String(value),
      });
    }

    return options;
  }

  // ========== Private Helper Methods ==========

  private validateCreateDto(dto: CreateDataSourceDto): void {
    this.validateName(dto.name);

    // Validate source_type
    const validTypes: DataSourceType[] = [
      'static',
      'csv_import',
      'json_import',
      'table',
      'custom_query',
      'webhook',
      'api',
    ];

    if (!validTypes.includes(dto.source_type)) {
      throw new Error(`Invalid source_type: ${dto.source_type}`);
    }

    // Validate user_id
    if (!dto.user_id || typeof dto.user_id !== 'string') {
      throw new Error('user_id is required');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('name is required and cannot be empty');
    }

    if (name.length > 255) {
      throw new Error('name cannot exceed 255 characters');
    }
  }

  /**
   * Parse a single CSV line handling quoted values
   * Follows CSV RFC 4180: quotes are special only when they start a field
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < line.length) {
      let value = '';

      // Skip leading whitespace
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
        i++;
      }

      // Check if this field starts with a quote
      if (line[i] === '"') {
        i++; // Skip opening quote
        // Read until closing quote
        while (i < line.length) {
          if (line[i] === '"') {
            // Check if it's a double quote (escaped quote)
            if (line[i + 1] === '"') {
              value += '"';
              i += 2;
            } else {
              // End of quoted field
              i++;
              break;
            }
          } else {
            value += line[i];
            i++;
          }
        }
        // Skip trailing whitespace and comma
        while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
          i++;
        }
        if (i < line.length && line[i] === ',') {
          i++;
        }
      } else {
        // Unquoted field - read until comma
        while (i < line.length && line[i] !== ',') {
          value += line[i];
          i++;
        }
        if (i < line.length && line[i] === ',') {
          i++;
        }
        value = value.trim();
      }

      result.push(value);
    }

    return result;
  }
}

// Export singleton instance
export const dataSourcesService = new DataSourcesService();
