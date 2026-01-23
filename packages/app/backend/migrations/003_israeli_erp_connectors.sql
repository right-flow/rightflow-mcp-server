-- ============================================================================
-- Migration 003: Israeli ERP Connector Definitions
-- Phase 5: Integration Hub
--
-- Inserts 5 pre-configured connector definitions for Israeli market:
-- 1. Priority Cloud (REST API)
-- 2. Priority On-Premise (OData)
-- 3. SAP Business One (Service Layer REST)
-- 4. Hashavshevet/חשבשבת (Proprietary API)
-- 5. Generic REST (Flexible)
--
-- Dependencies: Migration 002 (Integration Hub Schema)
-- ============================================================================

-- ============================================================================
-- 1. PRIORITY CLOUD CONNECTOR
-- ============================================================================

INSERT INTO connector_definitions (
  slug,
  name,
  description,
  category,
  vendor,
  logo_url,
  auth_schema,
  endpoints,
  config_schema,
  capabilities,
  supports_hebrew,
  is_enabled
) VALUES (
  'priority-cloud',
  'Priority Cloud',
  'Priority ERP Cloud Edition with REST API support. Full Hebrew text support for Israeli businesses.',
  'erp',
  'Priority Software',
  NULL,
  '{
    "type": "basic",
    "fields": [
      {
        "key": "username",
        "label": "Priority Username",
        "type": "text",
        "required": true,
        "placeholder": "Enter your Priority username"
      },
      {
        "key": "password",
        "label": "Priority Password",
        "type": "password",
        "required": true,
        "placeholder": "Enter your Priority password"
      }
    ]
  }'::JSONB,
  '{
    "getCustomer": {
      "path": "/customers/{customerId}",
      "method": "GET",
      "description": "Get customer by ID",
      "requiredParams": ["customerId"]
    },
    "listCustomers": {
      "path": "/customers",
      "method": "GET",
      "description": "List all customers",
      "supportsPagination": true,
      "supportsFiltering": true,
      "queryParams": {
        "limit": "number",
        "offset": "number",
        "filter": "string"
      }
    },
    "createCustomer": {
      "path": "/customers",
      "method": "POST",
      "description": "Create new customer",
      "requiresBody": true
    },
    "updateCustomer": {
      "path": "/customers/{customerId}",
      "method": "PUT",
      "description": "Update existing customer",
      "requiredParams": ["customerId"],
      "requiresBody": true
    },
    "deleteCustomer": {
      "path": "/customers/{customerId}",
      "method": "DELETE",
      "description": "Delete customer",
      "requiredParams": ["customerId"]
    },
    "getOrder": {
      "path": "/orders/{orderId}",
      "method": "GET",
      "description": "Get order by ID",
      "requiredParams": ["orderId"]
    },
    "listOrders": {
      "path": "/orders",
      "method": "GET",
      "description": "List all orders",
      "supportsPagination": true,
      "supportsFiltering": true
    },
    "createOrder": {
      "path": "/orders",
      "method": "POST",
      "description": "Create new order",
      "requiresBody": true
    },
    "getItem": {
      "path": "/items/{itemId}",
      "method": "GET",
      "description": "Get item/product by ID",
      "requiredParams": ["itemId"]
    },
    "listItems": {
      "path": "/items",
      "method": "GET",
      "description": "List all items",
      "supportsPagination": true
    },
    "getInvoice": {
      "path": "/invoices/{invoiceId}",
      "method": "GET",
      "description": "Get invoice by ID",
      "requiredParams": ["invoiceId"]
    },
    "createInvoice": {
      "path": "/invoices",
      "method": "POST",
      "description": "Create new invoice",
      "requiresBody": true
    }
  }'::JSONB,
  '{
    "baseUrl": {
      "type": "url",
      "required": true,
      "label": "Priority Cloud URL",
      "placeholder": "https://your-subdomain.priority-connect.com/api",
      "description": "Full URL to your Priority Cloud API endpoint"
    },
    "subdomain": {
      "type": "text",
      "required": false,
      "label": "Subdomain (optional)",
      "placeholder": "your-company",
      "description": "Your Priority Cloud subdomain (if baseUrl not provided)"
    },
    "timeout": {
      "type": "number",
      "required": false,
      "label": "Request Timeout (ms)",
      "default": 15000,
      "min": 1000,
      "max": 60000,
      "description": "Maximum time to wait for API response"
    },
    "rateLimit": {
      "type": "number",
      "required": false,
      "label": "Rate Limit (requests/minute)",
      "default": 100,
      "min": 1,
      "max": 1000
    }
  }'::JSONB,
  ARRAY['customers', 'orders', 'items', 'invoices'],
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. PRIORITY ON-PREMISE CONNECTOR (OData)
-- ============================================================================

INSERT INTO connector_definitions (
  slug,
  name,
  description,
  category,
  vendor,
  logo_url,
  auth_schema,
  endpoints,
  config_schema,
  capabilities,
  supports_hebrew,
  is_enabled
) VALUES (
  'priority-onpremise',
  'Priority On-Premise',
  'Priority ERP On-Premise installation with OData protocol. Supports self-hosted deployments.',
  'erp',
  'Priority Software',
  NULL,
  '{
    "type": "basic",
    "fields": [
      {
        "key": "username",
        "label": "Priority Username",
        "type": "text",
        "required": true
      },
      {
        "key": "password",
        "label": "Priority Password",
        "type": "password",
        "required": true
      }
    ]
  }'::JSONB,
  '{
    "getCustomer": {
      "path": "/CUSTOMERS('\''{customerId}'\'')",
      "method": "GET",
      "description": "Get customer by ID (OData syntax)",
      "requiredParams": ["customerId"],
      "odataVersion": "4.0"
    },
    "listCustomers": {
      "path": "/CUSTOMERS",
      "method": "GET",
      "description": "List all customers",
      "supportsPagination": true,
      "supportsFiltering": true,
      "odataVersion": "4.0",
      "queryParams": {
        "$top": "number",
        "$skip": "number",
        "$filter": "string",
        "$orderby": "string",
        "$select": "string"
      }
    },
    "createCustomer": {
      "path": "/CUSTOMERS",
      "method": "POST",
      "description": "Create new customer",
      "requiresBody": true,
      "odataVersion": "4.0"
    },
    "updateCustomer": {
      "path": "/CUSTOMERS('\''{customerId}'\'')",
      "method": "PATCH",
      "description": "Update existing customer (OData PATCH)",
      "requiredParams": ["customerId"],
      "requiresBody": true,
      "odataVersion": "4.0"
    },
    "deleteCustomer": {
      "path": "/CUSTOMERS('\''{customerId}'\'')",
      "method": "DELETE",
      "description": "Delete customer",
      "requiredParams": ["customerId"],
      "odataVersion": "4.0"
    },
    "getOrder": {
      "path": "/ORDERS('\''{orderId}'\'')",
      "method": "GET",
      "description": "Get order by ID",
      "requiredParams": ["orderId"],
      "odataVersion": "4.0"
    },
    "listOrders": {
      "path": "/ORDERS",
      "method": "GET",
      "description": "List all orders",
      "supportsPagination": true,
      "supportsFiltering": true,
      "odataVersion": "4.0"
    },
    "createOrder": {
      "path": "/ORDERS",
      "method": "POST",
      "description": "Create new order",
      "requiresBody": true,
      "odataVersion": "4.0"
    },
    "getItem": {
      "path": "/LOGPART('\''{itemId}'\'')",
      "method": "GET",
      "description": "Get item/part by ID",
      "requiredParams": ["itemId"],
      "odataVersion": "4.0"
    },
    "listItems": {
      "path": "/LOGPART",
      "method": "GET",
      "description": "List all items",
      "supportsPagination": true,
      "odataVersion": "4.0"
    }
  }'::JSONB,
  '{
    "baseUrl": {
      "type": "url",
      "required": true,
      "label": "Priority Server URL",
      "placeholder": "https://priority-server.company.com",
      "description": "Base URL of your Priority on-premise server"
    },
    "company": {
      "type": "text",
      "required": true,
      "label": "Company Name",
      "placeholder": "DEMO_CO",
      "description": "Your Priority company database name"
    },
    "odataPath": {
      "type": "text",
      "required": false,
      "label": "OData Path",
      "default": "/odata/Priority",
      "description": "OData endpoint path (usually /odata/Priority)"
    },
    "timeout": {
      "type": "number",
      "required": false,
      "label": "Request Timeout (ms)",
      "default": 15000,
      "min": 1000,
      "max": 60000
    },
    "verifySsl": {
      "type": "boolean",
      "required": false,
      "label": "Verify SSL Certificate",
      "default": true,
      "description": "Set to false for self-signed certificates (not recommended for production)"
    }
  }'::JSONB,
  ARRAY['customers', 'orders', 'items', 'parts'],
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 3. SAP BUSINESS ONE CONNECTOR
-- ============================================================================

INSERT INTO connector_definitions (
  slug,
  name,
  description,
  category,
  vendor,
  logo_url,
  auth_schema,
  endpoints,
  config_schema,
  capabilities,
  supports_hebrew,
  is_enabled
) VALUES (
  'sap-b1',
  'SAP Business One',
  'SAP Business One Service Layer REST API. Session-based authentication with B1SESSION cookie.',
  'erp',
  'SAP',
  NULL,
  '{
    "type": "session",
    "sessionEndpoint": "/Login",
    "sessionHeader": "B1S-SessionId",
    "sessionCookie": "B1SESSION",
    "fields": [
      {
        "key": "username",
        "label": "SAP B1 Username",
        "type": "text",
        "required": true
      },
      {
        "key": "password",
        "label": "SAP B1 Password",
        "type": "password",
        "required": true
      },
      {
        "key": "companyDB",
        "label": "Company Database",
        "type": "text",
        "required": true,
        "placeholder": "SBODEMOUS",
        "description": "SAP B1 company database name"
      }
    ]
  }'::JSONB,
  '{
    "login": {
      "path": "/Login",
      "method": "POST",
      "description": "Obtain B1SESSION cookie",
      "requiresBody": true,
      "bodySchema": {
        "CompanyDB": "string",
        "UserName": "string",
        "Password": "string"
      },
      "returns": "B1SESSION"
    },
    "logout": {
      "path": "/Logout",
      "method": "POST",
      "description": "Invalidate B1SESSION"
    },
    "getBusinessPartner": {
      "path": "/BusinessPartners('\''{partnerId}'\'')",
      "method": "GET",
      "description": "Get business partner by ID",
      "requiredParams": ["partnerId"],
      "requiresAuth": true
    },
    "listBusinessPartners": {
      "path": "/BusinessPartners",
      "method": "GET",
      "description": "List all business partners",
      "supportsPagination": true,
      "supportsFiltering": true,
      "requiresAuth": true,
      "queryParams": {
        "$top": "number",
        "$skip": "number",
        "$filter": "string",
        "$select": "string"
      }
    },
    "createBusinessPartner": {
      "path": "/BusinessPartners",
      "method": "POST",
      "description": "Create new business partner",
      "requiresBody": true,
      "requiresAuth": true
    },
    "updateBusinessPartner": {
      "path": "/BusinessPartners('\''{partnerId}'\'')",
      "method": "PATCH",
      "description": "Update business partner",
      "requiredParams": ["partnerId"],
      "requiresBody": true,
      "requiresAuth": true
    },
    "getOrder": {
      "path": "/Orders({orderId})",
      "method": "GET",
      "description": "Get sales order by ID",
      "requiredParams": ["orderId"],
      "requiresAuth": true
    },
    "createOrder": {
      "path": "/Orders",
      "method": "POST",
      "description": "Create new sales order",
      "requiresBody": true,
      "requiresAuth": true
    },
    "getItem": {
      "path": "/Items('\''{itemCode}'\'')",
      "method": "GET",
      "description": "Get item by code",
      "requiredParams": ["itemCode"],
      "requiresAuth": true
    },
    "listItems": {
      "path": "/Items",
      "method": "GET",
      "description": "List all items",
      "supportsPagination": true,
      "requiresAuth": true
    }
  }'::JSONB,
  '{
    "baseUrl": {
      "type": "url",
      "required": true,
      "label": "SAP B1 Service Layer URL",
      "placeholder": "https://sap-server:50000/b1s/v1",
      "description": "Full URL to SAP B1 Service Layer (usually port 50000)"
    },
    "companyDB": {
      "type": "text",
      "required": true,
      "label": "Company Database",
      "placeholder": "SBODEMOUS"
    },
    "timeout": {
      "type": "number",
      "required": false,
      "label": "Request Timeout (ms)",
      "default": 20000,
      "min": 1000,
      "max": 60000,
      "description": "SAP B1 can be slower, default 20 seconds"
    },
    "sessionTimeout": {
      "type": "number",
      "required": false,
      "label": "Session Timeout (minutes)",
      "default": 30,
      "description": "How long before session expires"
    }
  }'::JSONB,
  ARRAY['business-partners', 'orders', 'items', 'invoices'],
  false,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 4. HASHAVSHEVET / חשבשבת CONNECTOR
-- ============================================================================

INSERT INTO connector_definitions (
  slug,
  name,
  description,
  category,
  vendor,
  logo_url,
  auth_schema,
  endpoints,
  config_schema,
  capabilities,
  supports_hebrew,
  is_enabled
) VALUES (
  'hashavshevet',
  'חשבשבת (Hashavshevet)',
  'Hashavshevet Israeli accounting system API. Full Hebrew support for local businesses.',
  'accounting',
  'Hashavshevet',
  NULL,
  '{
    "type": "apikey",
    "headerName": "X-API-Key",
    "fields": [
      {
        "key": "apiKey",
        "label": "API Key / מפתח API",
        "type": "password",
        "required": true,
        "placeholder": "Enter your Hashavshevet API key",
        "description": "API key from Hashavshevet settings / מפתח API מהגדרות המערכת"
      },
      {
        "key": "companyId",
        "label": "Company ID / מזהה חברה",
        "type": "text",
        "required": true,
        "placeholder": "12345",
        "description": "Your company ID in Hashavshevet / מזהה החברה שלך במערכת"
      }
    ]
  }'::JSONB,
  '{
    "getCustomer": {
      "path": "/customers/{customerId}",
      "method": "GET",
      "description": "Get customer by ID / קבלת לקוח לפי מזהה",
      "requiredParams": ["customerId"]
    },
    "listCustomers": {
      "path": "/customers",
      "method": "GET",
      "description": "List all customers / רשימת כל הלקוחות",
      "supportsPagination": true,
      "supportsFiltering": true,
      "queryParams": {
        "page": "number",
        "limit": "number",
        "search": "string"
      }
    },
    "createCustomer": {
      "path": "/customers",
      "method": "POST",
      "description": "Create new customer / יצירת לקוח חדש",
      "requiresBody": true
    },
    "updateCustomer": {
      "path": "/customers/{customerId}",
      "method": "PUT",
      "description": "Update customer / עדכון לקוח",
      "requiredParams": ["customerId"],
      "requiresBody": true
    },
    "getInvoice": {
      "path": "/invoices/{invoiceId}",
      "method": "GET",
      "description": "Get invoice by ID / קבלת חשבונית לפי מזהה",
      "requiredParams": ["invoiceId"]
    },
    "listInvoices": {
      "path": "/invoices",
      "method": "GET",
      "description": "List invoices / רשימת חשבוניות",
      "supportsPagination": true,
      "supportsFiltering": true
    },
    "createInvoice": {
      "path": "/invoices",
      "method": "POST",
      "description": "Create invoice / יצירת חשבונית",
      "requiresBody": true
    },
    "getDocument": {
      "path": "/documents/{documentId}",
      "method": "GET",
      "description": "Get document by ID / קבלת מסמך לפי מזהה",
      "requiredParams": ["documentId"]
    },
    "listDocuments": {
      "path": "/documents",
      "method": "GET",
      "description": "List documents / רשימת מסמכים",
      "supportsPagination": true
    }
  }'::JSONB,
  '{
    "baseUrl": {
      "type": "url",
      "required": false,
      "label": "API URL / כתובת API",
      "default": "https://api.hashavshevet.co.il/v1",
      "description": "Hashavshevet API endpoint / נקודת קצה של API"
    },
    "companyId": {
      "type": "text",
      "required": true,
      "label": "Company ID / מזהה חברה",
      "placeholder": "12345",
      "description": "Your company identifier / מזהה החברה שלך"
    },
    "timeout": {
      "type": "number",
      "required": false,
      "label": "Timeout (ms) / זמן המתנה",
      "default": 10000,
      "min": 1000,
      "max": 30000
    },
    "language": {
      "type": "select",
      "required": false,
      "label": "Language / שפה",
      "default": "he",
      "options": [
        { "value": "he", "label": "עברית" },
        { "value": "en", "label": "English" }
      ]
    }
  }'::JSONB,
  ARRAY['customers', 'invoices', 'documents', 'accounting'],
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 5. GENERIC REST CONNECTOR
-- ============================================================================

INSERT INTO connector_definitions (
  slug,
  name,
  description,
  category,
  vendor,
  logo_url,
  auth_schema,
  endpoints,
  config_schema,
  capabilities,
  supports_hebrew,
  is_enabled
) VALUES (
  'generic-rest',
  'Generic REST API',
  'Flexible connector for any REST API. Supports multiple authentication methods and custom endpoints.',
  'custom',
  NULL,
  NULL,
  '{
    "type": "flexible",
    "supportedTypes": ["basic", "apikey", "bearer", "none"],
    "description": "Choose authentication method based on your API",
    "fields": []
  }'::JSONB,
  '{
    "customGet": {
      "path": "/{path}",
      "method": "GET",
      "description": "Custom GET request",
      "flexible": true,
      "requiredParams": ["path"]
    },
    "customPost": {
      "path": "/{path}",
      "method": "POST",
      "description": "Custom POST request",
      "flexible": true,
      "requiredParams": ["path"],
      "requiresBody": true
    },
    "customPut": {
      "path": "/{path}",
      "method": "PUT",
      "description": "Custom PUT request",
      "flexible": true,
      "requiredParams": ["path"],
      "requiresBody": true
    },
    "customPatch": {
      "path": "/{path}",
      "method": "PATCH",
      "description": "Custom PATCH request",
      "flexible": true,
      "requiredParams": ["path"],
      "requiresBody": true
    },
    "customDelete": {
      "path": "/{path}",
      "method": "DELETE",
      "description": "Custom DELETE request",
      "flexible": true,
      "requiredParams": ["path"]
    }
  }'::JSONB,
  '{
    "baseUrl": {
      "type": "url",
      "required": true,
      "label": "API Base URL",
      "placeholder": "https://api.example.com",
      "description": "Full base URL of your REST API"
    },
    "authType": {
      "type": "select",
      "required": true,
      "label": "Authentication Type",
      "default": "none",
      "options": [
        { "value": "none", "label": "No Authentication" },
        { "value": "basic", "label": "Basic Auth (username/password)" },
        { "value": "apikey", "label": "API Key (header-based)" },
        { "value": "bearer", "label": "Bearer Token" }
      ]
    },
    "timeout": {
      "type": "number",
      "required": false,
      "label": "Request Timeout (ms)",
      "default": 10000,
      "min": 1000,
      "max": 60000
    },
    "customHeaders": {
      "type": "json",
      "required": false,
      "label": "Custom Headers (JSON)",
      "placeholder": "{ \"X-Custom-Header\": \"value\" }",
      "description": "Additional headers to send with every request"
    }
  }'::JSONB,
  ARRAY['custom', 'rest', 'flexible'],
  false,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on auth schema type for filtering connectors by auth method
CREATE INDEX IF NOT EXISTS idx_connector_definitions_auth_type
ON connector_definitions ((auth_schema->>'type'));

-- Index on Hebrew support for filtering Israeli systems
CREATE INDEX IF NOT EXISTS idx_connector_definitions_hebrew
ON connector_definitions(supports_hebrew)
WHERE supports_hebrew = true;

-- Index on vendor for grouping by manufacturer
CREATE INDEX IF NOT EXISTS idx_connector_definitions_vendor
ON connector_definitions(vendor)
WHERE vendor IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERY (Optional - for manual testing)
-- ============================================================================

-- Uncomment to verify all connectors inserted:
/*
SELECT
  slug,
  name,
  category,
  vendor,
  auth_schema->>'type' AS auth_type,
  supports_hebrew,
  is_enabled,
  array_length(capabilities, 1) AS capability_count
FROM connector_definitions
WHERE slug IN (
  'priority-cloud',
  'priority-onpremise',
  'sap-b1',
  'hashavshevet',
  'generic-rest'
)
ORDER BY slug;
*/
