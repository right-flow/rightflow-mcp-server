/**
 * System Workflow Templates
 * Pre-built templates bundled with the application
 */

import type { WorkflowTemplate } from '@/types/workflow-template';

/**
 * System workflow templates - bundled with app at build time.
 * These templates cannot be modified or deleted by users.
 */
export const systemWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: 'system-simple-approval',
    name: 'Simple Approval Workflow',
    description:
      'Single approver reviews and approves/rejects form submissions. Perfect for basic approval workflows.',
    category: 'approval',
    tags: ['approval', 'single-level', 'basic'],
    isSystem: true,
    isShared: false,
    createdBy: 'system',
    createdAt: '2026-02-02T00:00:00Z',
    updatedAt: '2026-02-02T00:00:00Z',
    usageCount: 0,
    definition: {
      id: 'workflow-simple-approval',
      name: 'Simple Approval',
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'form-1',
          type: 'form',
          position: { x: 100, y: 200 },
          data: {
            formId: '', // To be filled by user
            requiredFields: [],
            optionalFields: [],
          },
        },
        {
          id: 'approval-1',
          type: 'approval',
          position: { x: 100, y: 300 },
          data: {
            approvalChain: {
              id: 'chain-1',
              levels: [
                {
                  id: 'level-1',
                  order: 1,
                  approvers: [
                    {
                      id: 'approver-1',
                      type: 'user',
                      value: '', // To be filled by user
                    },
                  ],
                  approvalType: 'ALL',
                },
              ],
              onTimeout: 'fail',
            },
          },
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 100, y: 400 },
          data: {},
        },
      ],
      connections: [
        {
          id: 'conn-1',
          source: 'start-1',
          target: 'form-1',
        },
        {
          id: 'conn-2',
          source: 'form-1',
          target: 'approval-1',
        },
        {
          id: 'conn-3',
          source: 'approval-1',
          target: 'end-1',
        },
      ],
      triggers: [{ type: 'manual' }],
    },
    metadata: {
      estimatedExecutionTime: 86400, // 24 hours
      requiredFields: ['formId', 'approverId'],
      supportedLanguages: ['he', 'en', 'ar'],
    },
  },

  {
    id: 'system-two-level-approval',
    name: 'Two-Level Approval Chain',
    description:
      'Manager → Director approval workflow with automatic escalation after timeout. Ideal for hierarchical approval processes.',
    category: 'approval',
    tags: ['approval', 'multi-level', 'escalation', 'hierarchy'],
    isSystem: true,
    isShared: false,
    createdBy: 'system',
    createdAt: '2026-02-02T00:00:00Z',
    updatedAt: '2026-02-02T00:00:00Z',
    usageCount: 0,
    definition: {
      id: 'workflow-two-level-approval',
      name: 'Two-Level Approval',
      nodes: [
        {
          id: 'start-2',
          type: 'start',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'form-2',
          type: 'form',
          position: { x: 100, y: 200 },
          data: {
            formId: '',
            requiredFields: [],
            optionalFields: [],
          },
        },
        {
          id: 'approval-2',
          type: 'approval',
          position: { x: 100, y: 300 },
          data: {
            approvalChain: {
              id: 'chain-2',
              levels: [
                {
                  id: 'level-2-1',
                  order: 1,
                  approvers: [
                    {
                      id: 'approver-2-1',
                      type: 'role',
                      value: 'manager',
                    },
                  ],
                  approvalType: 'ALL',
                  timeout: 24,
                  escalation: {
                    timeoutHours: 24,
                    escalateTo: {
                      id: 'escalate-2-1',
                      type: 'role',
                      value: 'director',
                    },
                    notifyBeforeHours: 4,
                  },
                },
                {
                  id: 'level-2-2',
                  order: 2,
                  approvers: [
                    {
                      id: 'approver-2-2',
                      type: 'role',
                      value: 'director',
                    },
                  ],
                  approvalType: 'ALL',
                  timeout: 48,
                },
              ],
              overallTimeout: 72,
              onTimeout: 'escalate',
            },
          },
        },
        {
          id: 'end-2',
          type: 'end',
          position: { x: 100, y: 400 },
          data: {},
        },
      ],
      connections: [
        {
          id: 'conn-2-1',
          source: 'start-2',
          target: 'form-2',
        },
        {
          id: 'conn-2-2',
          source: 'form-2',
          target: 'approval-2',
        },
        {
          id: 'conn-2-3',
          source: 'approval-2',
          target: 'end-2',
        },
      ],
      triggers: [{ type: 'manual' }],
    },
    metadata: {
      estimatedExecutionTime: 172800, // 48 hours
      requiredFields: ['formId'],
      supportedLanguages: ['he', 'en', 'ar'],
    },
  },

  {
    id: 'system-conditional-routing',
    name: 'Conditional Approval Routing',
    description:
      'Route to different approvers based on form field values (e.g., amount, category). Smart routing based on business rules.',
    category: 'conditional',
    tags: ['approval', 'conditional', 'routing', 'business-rules'],
    isSystem: true,
    isShared: false,
    createdBy: 'system',
    createdAt: '2026-02-02T00:00:00Z',
    updatedAt: '2026-02-02T00:00:00Z',
    usageCount: 0,
    definition: {
      id: 'workflow-conditional-routing',
      name: 'Conditional Routing',
      nodes: [
        {
          id: 'start-3',
          type: 'start',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'form-3',
          type: 'form',
          position: { x: 100, y: 200 },
          data: {
            formId: '',
            requiredFields: ['amount', 'category'],
            optionalFields: [],
          },
        },
        {
          id: 'condition-3',
          type: 'condition',
          position: { x: 100, y: 300 },
          data: {
            conditions: [
              {
                field: 'amount',
                operator: 'gt',
                value: 10000,
              },
            ],
          },
        },
        {
          id: 'approval-3-high',
          type: 'approval',
          position: { x: 250, y: 400 },
          data: {
            approvalChain: {
              id: 'chain-3-high',
              levels: [
                {
                  id: 'level-3-high',
                  order: 1,
                  approvers: [
                    {
                      id: 'approver-3-high',
                      type: 'role',
                      value: 'director',
                    },
                  ],
                  approvalType: 'ALL',
                },
              ],
              onTimeout: 'fail',
            },
          },
        },
        {
          id: 'approval-3-low',
          type: 'approval',
          position: { x: -50, y: 400 },
          data: {
            approvalChain: {
              id: 'chain-3-low',
              levels: [
                {
                  id: 'level-3-low',
                  order: 1,
                  approvers: [
                    {
                      id: 'approver-3-low',
                      type: 'role',
                      value: 'manager',
                    },
                  ],
                  approvalType: 'ALL',
                },
              ],
              onTimeout: 'fail',
            },
          },
        },
        {
          id: 'end-3',
          type: 'end',
          position: { x: 100, y: 500 },
          data: {},
        },
      ],
      connections: [
        {
          id: 'conn-3-1',
          source: 'start-3',
          target: 'form-3',
        },
        {
          id: 'conn-3-2',
          source: 'form-3',
          target: 'condition-3',
        },
        {
          id: 'conn-3-3',
          source: 'condition-3',
          target: 'approval-3-high',
          condition: {
            field: 'amount',
            operator: 'gt',
            value: 10000,
          },
        },
        {
          id: 'conn-3-4',
          source: 'condition-3',
          target: 'approval-3-low',
          condition: {
            field: 'amount',
            operator: 'lte',
            value: 10000,
          },
        },
        {
          id: 'conn-3-5',
          source: 'approval-3-high',
          target: 'end-3',
        },
        {
          id: 'conn-3-6',
          source: 'approval-3-low',
          target: 'end-3',
        },
      ],
      triggers: [{ type: 'manual' }],
    },
    metadata: {
      estimatedExecutionTime: 86400, // 24 hours
      requiredFields: ['formId', 'amount', 'category'],
      supportedLanguages: ['he', 'en', 'ar'],
    },
  },

  // TODO: Add more system templates:
  // - Document Generation Workflow
  // - WhatsApp Notification Workflow
  // - Multi-Step Data Collection
  // - Time-Based Reminder Workflow
  // - Auto-Escalation Workflow
  // - Webhook Integration Workflow
  // - Parallel Approval Workflow
];
