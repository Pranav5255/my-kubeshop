# Urumi Store Provisioning - Implementation Spec

## Phase 1: Core Fixes (Critical Path)

### 1.1 Environment-Based Configuration
**Goal:** Backend reads BASE_DOMAIN and NODE_ENV to switch between local/prod automatically.

**Tasks:**
- [ ] Add .env file support to backend
- [ ] Read BASE_DOMAIN from env (default: 127.0.0.1)
- [ ] Read NODE_ENV (default: development)
- [ ] Pass domain to Helm install dynamically
- [ ] Update provisioner to use env-based domain

**Files to modify:**
- backend/src/index.ts
- backend/src/provisioner/woocommerce.ts
- backend/.env.example

---

### 1.2 Ingress & Domain Handling
**Goal:** Ingress properly configured for nip.io domains, works locally and in prod.

**Tasks:**
- [ ] Fix Helm chart ingress template to use dynamic hostname
- [ ] Ensure ingress controller is properly targeted
- [ ] Test nip.io resolution locally
- [ ] Document domain strategy

**Files to modify:**
- charts/woocommerce/templates/ingress.yaml (create if missing)
- charts/woocommerce/values.yaml

---

### 1.3 Error Handling & Status Reporting
**Goal:** Better error messages, failure reasons, and recovery.

**Tasks:**
- [ ] Add error tracking to provisioner
- [ ] Store failure reasons in status
- [ ] Return detailed error messages in API
- [ ] Add retry logic for transient failures
- [ ] Frontend displays error reasons

**Files to modify:**
- backend/src/types.ts (add error field)
- backend/src/provisioner/woocommerce.ts
- frontend/src/App.tsx

---

## Phase 2: Stand-Out Features (Impressive)

### 2.1 Audit Logging & Activity Trail
**Goal:** Track who created/deleted what and when. Display in dashboard.

**Tasks:**
- [ ] Create audit log storage (in-memory or file-based)
- [ ] Log all store operations (create, delete, status changes)
- [ ] Add /stores/:name/activity endpoint
- [ ] Display activity timeline in dashboard
- [ ] Include timestamps and operation details

**Files to create:**
- backend/src/audit.ts

**Files to modify:**
- backend/src/index.ts
- backend/src/provisioner/woocommerce.ts
- frontend/src/App.tsx

---

### 2.2 VPS Production Deployment
**Goal:** Document and test deployment on k3s VPS with Helm values override.

**Tasks:**
- [ ] Create production deployment guide
- [ ] Test on GCP e2-medium with k3s
- [ ] Verify values-prod.yaml works
- [ ] Document domain/ingress/storage changes
- [ ] Show before/after Helm values

**Files to create:**
- PRODUCTION_DEPLOYMENT.md (if needed for reference, but no markdown unless asked)

---

### 2.3 Idempotency & Recovery
**Goal:** Store creation is safe to retry. Provisioning survives restarts.

**Tasks:**
- [ ] Check if store already exists before provisioning
- [ ] Implement idempotent Helm install
- [ ] Add status persistence (store state file)
- [ ] Handle mid-provisioning restarts gracefully
- [ ] Add reconciliation logic

**Files to modify:**
- backend/src/provisioner/woocommerce.ts
- backend/src/index.ts

---

### 2.4 Per-User Quotas & Abuse Prevention
**Goal:** Limit stores per user, add timeouts, prevent resource exhaustion.

**Tasks:**
- [ ] Add user concept to API (simple: IP-based or header-based)
- [ ] Implement per-user store limit (e.g., max 5 stores)
- [ ] Add provisioning timeout (e.g., 10 minutes)
- [ ] Return quota info in API responses
- [ ] Display quota in dashboard

**Files to create:**
- backend/src/quota.ts

**Files to modify:**
- backend/src/index.ts
- backend/src/types.ts
- frontend/src/App.tsx

---

### 2.5 Horizontal Scaling & Concurrency
**Goal:** Backend can handle multiple concurrent provisioning requests safely.

**Tasks:**
- [ ] Add concurrency queue for provisioning
- [ ] Limit concurrent Helm installs (e.g., max 3)
- [ ] Add queue status endpoint
- [ ] Document scaling strategy
- [ ] Test with 5+ concurrent store creations

**Files to create:**
- backend/src/queue.ts

**Files to modify:**
- backend/src/index.ts
- backend/src/provisioner/woocommerce.ts

---

### 2.6 Observability & Metrics
**Goal:** Track provisioning metrics, success rates, duration.

**Tasks:**
- [ ] Add metrics collection (stores created, failed, avg duration)
- [ ] Create /metrics endpoint
- [ ] Display metrics in dashboard
- [ ] Track provisioning duration per store
- [ ] Show success/failure rates

**Files to create:**
- backend/src/metrics.ts

**Files to modify:**
- backend/src/index.ts
- backend/src/provisioner/woocommerce.ts
- frontend/src/App.tsx

---

## Phase 3: Testing & Validation

### 3.1 End-to-End Order Flow
**Goal:** Verify complete order placement works.

**Tasks:**
- [ ] Spin up local cluster
- [ ] Create store via dashboard
- [ ] Add product to cart
- [ ] Complete checkout with COD
- [ ] Verify order in admin
- [ ] Document exact steps

---

### 3.2 Cleanup Verification
**Goal:** Ensure all resources are properly deleted.

**Tasks:**
- [ ] Delete store via dashboard
- [ ] Verify namespace gone
- [ ] Verify PVCs deleted
- [ ] Verify Helm release gone
- [ ] Check for orphaned resources

---

### 3.3 Multi-Store Isolation
**Goal:** Verify stores don't interfere with each other.

**Tasks:**
- [ ] Create 3 stores concurrently
- [ ] Verify each has unique URL
- [ ] Verify each has isolated database
- [ ] Verify network policies work
- [ ] Verify resource quotas enforced

---

## Implementation Priority

**Must Do (Critical):**
1. Phase 1.1 - Environment config
2. Phase 1.2 - Ingress/domain
3. Phase 1.3 - Error handling
4. Phase 3.1 - E2E order flow test

**Should Do (Impressive):**
5. Phase 2.1 - Audit logging
6. Phase 2.4 - Quotas
7. Phase 2.5 - Concurrency queue
8. Phase 2.6 - Metrics

**Nice to Have:**
9. Phase 2.2 - VPS deployment
10. Phase 2.3 - Idempotency

---

## Success Criteria

- ✅ Backend reads BASE_DOMAIN from env
- ✅ Ingress works with nip.io domains
- ✅ Error messages are clear and actionable
- ✅ Audit log shows all operations
- ✅ Per-user quotas enforced
- ✅ Concurrent provisioning works (3+ stores)
- ✅ Metrics endpoint returns data
- ✅ E2E order flow works end-to-end
- ✅ All resources cleaned up on delete
- ✅ Dashboard displays all new features
