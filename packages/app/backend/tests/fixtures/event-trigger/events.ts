/**
 * Test fixtures for Event Trigger System
 * Provides realistic test data for events, triggers, actions, and integrations
 */

import { v4 as uuidv4 } from 'uuid';

// Organization fixtures
export const testOrganizations = {
  org1: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Test Organization 1',
    clerk_organization_id: 'org_test1'
  },
  org2: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Test Organization 2',
    clerk_organization_id: 'org_test2'
  }
};

// Form fixtures
export const testForms = {
  form1: {
    id: '33333333-3333-3333-3333-333333333333',
    organization_id: testOrganizations.org1.id,
    name: 'Customer Intake Form',
    status: 'published'
  },
  form2: {
    id: '44444444-4444-4444-4444-444444444444',
    organization_id: testOrganizations.org1.id,
    name: 'Feedback Form',
    status: 'published'
  }
};

// User fixtures
export const testUsers = {
  admin: {
    id: '55555555-5555-5555-5555-555555555555',
    clerk_user_id: 'user_admin',
    email: 'admin@test.com',
    role: 'admin'
  },
  manager: {
    id: '66666666-6666-6666-6666-666666666666',
    clerk_user_id: 'user_manager',
    email: 'manager@test.com',
    role: 'manager'
  },
  worker: {
    id: '77777777-7777-7777-7777-777777777777',
    clerk_user_id: 'user_worker',
    email: 'worker@test.com',
    role: 'worker'
  }
};

// Event fixtures
export const testEvents = {
  formSubmitted: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'form.submitted',
    entity_type: 'form',
    entity_id: testForms.form1.id,
    user_id: testUsers.worker.id,
    data: {
      formId: testForms.form1.id,
      formName: 'Customer Intake Form',
      submittedBy: testUsers.worker.id,
      submittedAt: new Date().toISOString(),
      fields: {
        fullName: 'יוסי כהן',
        email: 'yossi@example.com',
        phone: '050-1234567',
        company: 'חברת הדוגמה בע"מ'
      }
    },
    processing_mode: 'redis',
    created_at: new Date()
  },

  formApproved: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'form.approved',
    entity_type: 'form',
    entity_id: testForms.form1.id,
    user_id: testUsers.manager.id,
    data: {
      formId: testForms.form1.id,
      approvedBy: testUsers.manager.id,
      approvedAt: new Date().toISOString(),
      comments: 'נראה טוב, מאושר'
    },
    processing_mode: 'redis',
    created_at: new Date()
  },

  userCreated: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'user.created',
    entity_type: 'user',
    entity_id: testUsers.worker.id,
    user_id: testUsers.admin.id,
    data: {
      userId: testUsers.worker.id,
      email: testUsers.worker.email,
      role: testUsers.worker.role,
      createdBy: testUsers.admin.id
    },
    processing_mode: 'redis',
    created_at: new Date()
  },

  workflowCompleted: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'workflow.completed',
    entity_type: 'workflow',
    entity_id: '88888888-8888-8888-8888-888888888888',
    user_id: testUsers.worker.id,
    data: {
      workflowId: '88888888-8888-8888-8888-888888888888',
      workflowName: 'Approval Process',
      completedAt: new Date().toISOString(),
      result: 'approved'
    },
    processing_mode: 'redis',
    created_at: new Date()
  },

  // Hebrew text edge case
  hebrewTextEvent: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'form.submitted',
    entity_type: 'form',
    entity_id: testForms.form1.id,
    user_id: testUsers.worker.id,
    data: {
      formId: testForms.form1.id,
      fields: {
        name: 'שלום עולם',
        description: 'טקסט ארוך בעברית עם סימני פיסוק: שאלה? תשובה! גרש״ם וגרשיים',
        mixed: 'עברית English עוד עברית 123 מספרים',
        email: 'user@דוגמה.co.il',
        rtlMarks: '\u202Bעברית עם סימני RTL\u202C'
      }
    },
    processing_mode: 'redis',
    created_at: new Date()
  },

  // Large payload edge case (1MB)
  largePayloadEvent: {
    id: uuidv4(),
    organization_id: testOrganizations.org1.id,
    event_type: 'form.submitted',
    entity_type: 'form',
    entity_id: testForms.form1.id,
    user_id: testUsers.worker.id,
    data: {
      formId: testForms.form1.id,
      largeField: 'x'.repeat(1000000) // 1MB of data
    },
    processing_mode: 'redis',
    created_at: new Date()
  }
};

// Trigger fixtures
export const testTriggers = {
  platformTrigger: {
    id: '99999999-9999-9999-9999-999999999999',
    organization_id: null,
    name: 'Platform: Form Submitted Notification',
    level: 'platform' as const,
    event_type: 'form.submitted',
    status: 'active' as const,
    scope: 'all_forms' as const,
    form_ids: [],
    conditions: [],
    priority: 0,
    error_handling: 'stop_on_first_error' as const,
    created_at: new Date(),
    updated_at: new Date()
  },

  organizationTrigger: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organization_id: testOrganizations.org1.id,
    name: 'Org: High Priority Form Alert',
    level: 'organization' as const,
    event_type: 'form.submitted',
    status: 'active' as const,
    scope: 'specific_forms' as const,
    form_ids: [testForms.form1.id],
    conditions: [
      {
        field: 'data.fields.priority',
        operator: 'equals',
        value: 'high'
      }
    ],
    priority: 10,
    error_handling: 'continue_on_error' as const,
    created_at: new Date(),
    updated_at: new Date()
  },

  userTrigger: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organization_id: testOrganizations.org1.id,
    name: 'User: Send to CRM on Approval',
    level: 'user_defined' as const,
    event_type: 'form.approved',
    status: 'active' as const,
    scope: 'all_forms' as const,
    form_ids: [],
    conditions: [],
    priority: 5,
    error_handling: 'stop_on_first_error' as const,
    created_at: new Date(),
    updated_at: new Date()
  },

  inactiveTrigger: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    organization_id: testOrganizations.org1.id,
    name: 'Inactive Trigger',
    level: 'user_defined' as const,
    event_type: 'form.submitted',
    status: 'inactive' as const,
    scope: 'all_forms' as const,
    form_ids: [],
    conditions: [],
    priority: 0,
    error_handling: 'stop_on_first_error' as const,
    created_at: new Date(),
    updated_at: new Date()
  }
};

// Action fixtures
export const testActions = {
  sendWebhook: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    trigger_id: testTriggers.userTrigger.id,
    action_type: 'send_webhook' as const,
    order: 1,
    config: {
      url: 'https://webhook.example.com/api/form-submitted',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: {
        event: '{{event.type}}',
        formId: '{{event.data.formId}}',
        fields: '{{event.data.fields}}'
      }
    },
    retry_config: {
      max_attempts: 3,
      backoff_multiplier: 2,
      initial_delay_ms: 1000
    },
    timeout_ms: 30000,
    is_critical: true,
    created_at: new Date(),
    updated_at: new Date()
  },

  updateCrm: {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    trigger_id: testTriggers.userTrigger.id,
    action_type: 'update_crm' as const,
    order: 2,
    config: {
      integration_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      operation: 'create_lead',
      mapping: {
        firstName: '{{event.data.fields.fullName}}',
        email: '{{event.data.fields.email}}',
        phone: '{{event.data.fields.phone}}',
        company: '{{event.data.fields.company}}'
      }
    },
    retry_config: {
      max_attempts: 3,
      backoff_multiplier: 2,
      initial_delay_ms: 1000
    },
    timeout_ms: 60000,
    is_critical: true,
    created_at: new Date(),
    updated_at: new Date()
  },

  sendEmail: {
    id: '10101010-1010-1010-1010-101010101010',
    trigger_id: testTriggers.organizationTrigger.id,
    action_type: 'send_email' as const,
    order: 1,
    config: {
      to: 'manager@example.com',
      subject: 'דחיפות גבוהה: טופס חדש התקבל',
      body: 'שלום,\n\nטופס חדש עם עדיפות גבוהה התקבל.\n\nפרטים: {{event.data.fields}}'
    },
    retry_config: {
      max_attempts: 2,
      backoff_multiplier: 2,
      initial_delay_ms: 500
    },
    timeout_ms: 15000,
    is_critical: false,
    created_at: new Date(),
    updated_at: new Date()
  }
};

// Integration fixtures
export const testIntegrations = {
  salesforce: {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    organization_id: testOrganizations.org1.id,
    type: 'salesforce' as const,
    name: 'Salesforce Production',
    config: {
      instanceUrl: 'https://test.salesforce.com',
      apiVersion: 'v57.0'
    },
    credentials: {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    },
    status: 'active' as const,
    last_sync_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },

  hubspot: {
    id: '20202020-2020-2020-2020-202020202020',
    organization_id: testOrganizations.org1.id,
    type: 'hubspot' as const,
    name: 'HubSpot Marketing',
    config: {
      portalId: 'test-portal-123'
    },
    credentials: {
      accessToken: 'test-hubspot-token',
      refreshToken: 'test-hubspot-refresh',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    },
    status: 'active' as const,
    last_sync_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },

  expiredIntegration: {
    id: '30303030-3030-3030-3030-303030303030',
    organization_id: testOrganizations.org1.id,
    type: 'salesforce' as const,
    name: 'Salesforce Expired',
    config: {
      instanceUrl: 'https://expired.salesforce.com',
      apiVersion: 'v57.0'
    },
    credentials: {
      accessToken: 'expired-token',
      refreshToken: 'expired-refresh-token',
      expiresAt: new Date(Date.now() - 3600000).toISOString() // Expired 1 hour ago
    },
    status: 'error' as const,
    last_sync_at: new Date(Date.now() - 86400000),
    created_at: new Date(),
    updated_at: new Date()
  }
};

// Action execution fixtures
export const testActionExecutions = {
  success: {
    id: '40404040-4040-4040-4040-404040404040',
    event_id: testEvents.formSubmitted.id,
    trigger_id: testTriggers.userTrigger.id,
    action_id: testActions.sendWebhook.id,
    status: 'success' as const,
    attempt: 1,
    started_at: new Date(),
    completed_at: new Date(),
    response: {
      statusCode: 200,
      body: { success: true, id: 'webhook-123' }
    },
    error: null,
    created_at: new Date()
  },

  failed: {
    id: '50505050-5050-5050-5050-505050505050',
    event_id: testEvents.formSubmitted.id,
    trigger_id: testTriggers.userTrigger.id,
    action_id: testActions.updateCrm.id,
    status: 'failed' as const,
    attempt: 3,
    started_at: new Date(Date.now() - 5000),
    completed_at: new Date(),
    response: null,
    error: {
      message: 'CRM API timeout after 60000ms',
      code: 'TIMEOUT',
      stack: 'Error: CRM API timeout...'
    },
    created_at: new Date()
  },

  retrying: {
    id: '60606060-6060-6060-6060-606060606060',
    event_id: testEvents.formApproved.id,
    trigger_id: testTriggers.organizationTrigger.id,
    action_id: testActions.sendEmail.id,
    status: 'retrying' as const,
    attempt: 2,
    started_at: new Date(),
    completed_at: null,
    response: null,
    error: {
      message: 'Connection refused',
      code: 'ECONNREFUSED'
    },
    created_at: new Date()
  }
};

// DLQ fixtures
export const testDlqEntries = {
  webhookFailure: {
    id: '70707070-7070-7070-7070-707070707070',
    event_id: testEvents.formSubmitted.id,
    trigger_id: testTriggers.userTrigger.id,
    action_id: testActions.sendWebhook.id,
    failure_reason: 'Max retry attempts (3) exceeded',
    failure_count: 3,
    last_error: {
      message: 'Network timeout',
      code: 'ETIMEDOUT',
      statusCode: null
    },
    event_snapshot: testEvents.formSubmitted,
    action_snapshot: testActions.sendWebhook,
    status: 'pending' as const,
    retry_after: null,
    created_at: new Date(),
    updated_at: new Date()
  },

  processing: {
    id: '80808080-8080-8080-8080-808080808080',
    event_id: testEvents.formApproved.id,
    trigger_id: testTriggers.organizationTrigger.id,
    action_id: testActions.sendEmail.id,
    failure_reason: 'Invalid email configuration',
    failure_count: 1,
    last_error: {
      message: 'SMTP server unavailable',
      code: 'SMTP_ERROR'
    },
    event_snapshot: testEvents.formApproved,
    action_snapshot: testActions.sendEmail,
    status: 'processing' as const,
    retry_after: new Date(Date.now() + 300000),
    created_at: new Date(),
    updated_at: new Date()
  }
};

// Helper function to create fresh event with new ID
export function createTestEvent(template: any, overrides: any = {}) {
  return {
    ...template,
    id: uuidv4(),
    created_at: new Date(),
    ...overrides
  };
}

// Helper function to create concurrent events
export function createConcurrentEvents(count: number, template: any) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => ({
    ...template,
    id: uuidv4(),
    created_at: new Date(now.getTime() + i) // Millisecond apart
  }));
}
