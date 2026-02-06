# BUG FIX: QuotaStatus Type Mismatch

**Date**: 2026-02-05
**Severity**: HIGH - Type Safety Issue
**Status**: PARTIALLY FIXED - Frontend types updated, backend implementation needed

## Problem Summary

The `QuotaStatus` interface in the frontend did not match the actual usage requirements of UI components, causing type safety issues and potential runtime errors.

## Root Cause

**Frontend Components Expected** (from QuotaStatusCard.tsx, UpgradePromptBanner.tsx):
```typescript
{
  formsUsed: number,
  formsLimit: number,
  submissionsThisMonth: number,
  submissionsLimit: number,
  storageUsedMB: number,
  storageLimitMB: number
}
```

**Frontend Type Definition Had** (frontend/src/api/types/usage.ts):
```typescript
{
  totalSubmissions: number,
  quotaLimit: number,
  // Missing: forms, storage fields
}
```

**Backend Returns** (backend/src/services/billing/QuotaEnforcementService.ts:173-202):
```typescript
{
  totalSubmissions: number,
  quotaLimit: number,
  remaining: number,
  percentUsed: number,
  isExceeded: boolean,
  overageAmount: number,
  canIncurOverage: boolean,
  planName: string,
  subscriptionStatus: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
}
```

## What Was Fixed

### ✅ Frontend Type Definition Updated

**File**: `frontend/src/api/types/usage.ts`

Added the following fields to `QuotaStatus` interface:
```typescript
export interface QuotaStatus {
  // Submission quota fields (existing)
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  overageAmount: number;
  canIncurOverage: boolean;

  // Plan and subscription info (existing)
  planName: string;
  subscriptionStatus: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;

  // Forms quota (NEW - required by UI components)
  formsUsed: number;
  formsLimit: number;

  // Submissions quota (NEW - required by UI components - duplicates above for clarity)
  submissionsThisMonth: number;
  submissionsLimit: number;

  // Storage quota (NEW - required by UI components)
  storageUsedMB: number;
  storageLimitMB: number;
}
```

**Note**: `submissionsThisMonth` and `submissionsLimit` duplicate `totalSubmissions` and `quotaLimit` for semantic clarity in UI components.

## What Still Needs to Be Done

### ⚠️ Backend Implementation Required

The backend `QuotaEnforcementService.getQuotaStatus()` method needs to be updated to return the additional fields:

**File to Modify**: `backend/src/services/billing/QuotaEnforcementService.ts`

**Method**: `getQuotaStatus(orgId: string): Promise<QuotaStatus>`

**Required Changes**:
1. Query current form count for the organization
2. Get storage usage statistics
3. Add these fields to the return object:
   ```typescript
   return {
     // ... existing fields ...

     // Add forms quota
     formsUsed: currentFormCount,
     formsLimit: subscription.plan?.maxForms || 3,

     // Add submissions quota (aliases for clarity)
     submissionsThisMonth: usage.totalSubmissions,
     submissionsLimit: usage.quotaLimit,

     // Add storage quota
     storageUsedMB: storageStats.usedMB,
     storageLimitMB: subscription.plan?.maxStorageMB || 100,
   };
   ```

**Additional Services Needed**:
- Form counting service/method (query forms table)
- Storage calculation service/method (aggregate form file sizes)

### Backend Type Definition Update

**File to Modify**: `backend/src/types/billing.ts`

Update the `QuotaStatus` interface (lines 146-159) to match the frontend:
```typescript
export interface QuotaStatus {
  submissions: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  forms: {
    current: number;
    limit: number;
    canCreate: boolean;
  };
  canSubmit: boolean;

  // OR use flat structure to match frontend exactly:
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  overageAmount: number;
  canIncurOverage: boolean;
  planName: string;
  subscriptionStatus: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  formsUsed: number;
  formsLimit: number;
  submissionsThisMonth: number;
  submissionsLimit: number;
  storageUsedMB: number;
  storageLimitMB: number;
}
```

**NOTE**: There's a conflict - backend/billing.ts has a different nested structure. Need to decide on canonical structure.

### Tests to Update

1. **Backend Tests**:
   - `backend/src/services/billing/QuotaEnforcementService.test.ts` (lines 438-550)
   - Update mock `QuotaStatus` objects to include new fields

2. **Frontend Tests** (already correct):
   - `frontend/src/components/billing/usage/QuotaStatusCard.test.tsx` ✅
   - `frontend/src/components/billing/enforcement/UpgradePromptBanner.test.tsx` ✅

## Affected Files

### Modified
- ✅ `frontend/src/api/types/usage.ts` - Type definition updated

### Needs Modification
- ⚠️ `backend/src/services/billing/QuotaEnforcementService.ts` - Implementation needed
- ⚠️ `backend/src/types/billing.ts` - Type definition needs alignment
- ⚠️ `backend/src/services/billing/QuotaEnforcementService.test.ts` - Tests need updating

### Dependent Components (should work after backend fix)
- `frontend/src/components/billing/usage/QuotaStatusCard.tsx` (line 69)
- `frontend/src/components/billing/enforcement/UpgradePromptBanner.tsx` (line 35)
- `frontend/src/components/billing/usage/UsageDashboard.tsx` (line 134)

## Testing Plan

1. **Unit Tests**:
   - Update backend `QuotaEnforcementService.test.ts` with new fields
   - Verify all test mocks include new fields
   - Run: `cd backend && npm test`

2. **Integration Tests**:
   - Test `/api/v1/billing/usage/:orgId/quota-status` endpoint
   - Verify response includes all fields
   - Verify correct calculations for forms, submissions, storage

3. **Frontend Component Tests**:
   - Verify `QuotaStatusCard.test.tsx` passes (should already pass)
   - Verify `UpgradePromptBanner.test.tsx` passes (should already pass)
   - Run: `cd frontend && npm test`

4. **Manual Testing**:
   - Navigate to Usage Dashboard
   - Verify all three quota progress bars display correctly
   - Verify quota status badge (Healthy/Warning/Critical)
   - Verify upgrade prompts appear at correct thresholds

## Migration Notes

**Breaking Change**: YES - Backend API contract changes

**API Version Impact**: This is a breaking change to the `/api/v1/billing/usage/:orgId/quota-status` endpoint response structure.

**Rollout Strategy**:
1. Update backend to return ALL fields (old + new)
2. Deploy backend first
3. Deploy frontend with updated types
4. This maintains backward compatibility

## Related Files

- **PRD**: `Documents/Development-Implementation/PRDs/PRD-Self-Service-Subscriptions.md`
- **Backend Billing Schema**: `backend/migrations/005_subscription_billing_schema.sql`
- **Frontend Context**: `frontend/src/contexts/UsageContext.tsx`

## Git Commit

```bash
git add frontend/src/api/types/usage.ts
git commit -m "fix(types): Add missing quota fields to QuotaStatus interface

- Add formsUsed, formsLimit for forms quota tracking
- Add submissionsThisMonth, submissionsLimit for submissions (semantic aliases)
- Add storageUsedMB, storageLimitMB for storage quota tracking
- Aligns frontend types with component usage requirements
- Backend implementation still needed to populate these fields

Related components: QuotaStatusCard, UpgradePromptBanner, UsageDashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Next Steps

1. **Immediate**: Update backend `QuotaEnforcementService.getQuotaStatus()` implementation
2. **Before Deploy**: Update backend tests with new fields
3. **Before Deploy**: Verify end-to-end flow works with real data
4. **Post-Deploy**: Monitor for any runtime errors in production
