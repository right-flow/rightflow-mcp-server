/**
 * Workflow namespace - approval chains, conditions, templates
 * Used by workflow and automation features
 */
export interface WorkflowTranslations {
  // Approval Chain
  approval: {
    chainSettings: string;
    overallTimeout: string;
    hours: string;
    onTimeout: string;
    timeout: {
      fail: string;
      escalate: string;
      autoApprove: string;
    };
    addLevel: string;
    level: string;
    approvalType: string;
    approvalTypeAny: string;
    approvalTypeAll: string;
    approvalTypeAllDescription: string;
    approvalTypeAnyDescription: string;
    approvers: string;
    addApprover: string;
    timeoutLevel: string;
    escalation: {
      title: string;
      timeoutHours: string;
      escalateTo: string;
    };
    addEscalation: string;
    removeEscalation: string;
    approverType: {
      user: string;
      role: string;
      dynamic: string;
    };
    selectUser: string;
    selectRole: string;
  };

  // Workflow Template
  template: {
    gallery: string;
    searchPlaceholder: string;
    allCategories: string;
    category: {
      all: string;
      approval: string;
      dataCollection: string;
      dataCollectionKebab: string;
      automation: string;
      conditional: string;
      integration: string;
      notification: string;
      custom: string;
    };
    sortBy: string;
    sort: {
      usageDesc: string;
      usageAsc: string;
      dateDesc: string;
      dateAsc: string;
      nameAsc: string;
      nameDesc: string;
      mostUsed: string;
      leastUsed: string;
      newest: string;
      oldest: string;
      nameAZ: string;
      nameZA: string;
    };
    viewGrid: string;
    viewList: string;
    used: string;
    times: string;
    useTemplate: string;
    exportTemplate: string;
    deleteTemplate: string;
    importTemplate: string;
    search: string;
    noTemplates: string;
    noResults: string;
    empty: string;
    system: string;
    storageUsed: string;
    storageWarning: string;
  };

  // Workflow Condition (Builder)
  condition: {
    rootGroup: string;
    nestedGroup: string;
    addCondition: string;
    addGroup: string;
    operator: {
      eq: string;
      ne: string;
      gt: string;
      lt: string;
      gte: string;
      lte: string;
      contains: string;
      exists: string;
      in: string;
      notIn: string;
    };
    selectField: string;
    enterValue: string;
  };
}
