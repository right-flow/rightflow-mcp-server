// User types
export interface User {
  id: string;
  organizationId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'worker';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Organization types
export interface Organization {
  id: string;
  clerkOrganizationId: string;
  name: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Form types
export interface Form {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  validation?: Record<string, any>;
}

// Submission types
export interface Submission {
  id: string;
  organizationId: string;
  formId: string;
  submittedById?: string;
  data: Record<string, any>;
  metadata: SubmissionMetadata;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SubmissionMetadata {
  location?: {
    lat: number;
    lon: number;
    address: string;
  };
  device?: string;
  appVersion?: string;
  submittedOffline?: boolean;
  syncedAt?: string;
}

// Webhook types
export interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type WebhookEvent =
  | 'submission.created'
  | 'submission.updated'
  | 'submission.approved'
  | 'submission.rejected'
  | 'form.created'
  | 'form.updated'
  | 'form.deleted';

export interface WebhookEventLog {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: WebhookEvent;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  lastError?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// File types
export interface File {
  id: string;
  organizationId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
  createdAt: Date;
  deletedAt?: Date;
}

// Express Request extension (for TypeScript)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;           // Database UUID (set by syncUser)
        clerkId?: string;     // Original Clerk user ID (preserved by syncUser)
        organizationId: string;
        role: string;
        email: string;
        name: string;
      };
      id?: string;
    }
  }
}
