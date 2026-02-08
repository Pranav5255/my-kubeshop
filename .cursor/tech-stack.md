# Technology Stack & Tooling Strategy

## 1. Infrastructure (Kubernetes Native)
- **Local Cluster:** k3d (preferred over Kind for better Ingress parity with VPS) or Kind.
- **Production Cluster:** k3s on Ubuntu 22.04 (GCP e2-medium).
- **Orchestration:** Helm v3 (Required). No Kustomize.
- **Ingress Controller:** Nginx Ingress Controller.
- **DNS Strategy:** `nip.io` (Wildcard DNS).
  - Local: `*.127.0.0.1.nip.io`
  - Prod: `*.<VPS_PUBLIC_IP>.nip.io`

## 2. Backend (The Orchestrator)
- **Runtime:** Node.js (v20+) + TypeScript.
- **Framework:** Express.js.
- **Kubernetes Interaction:**
  - **Provisioning:** `execa` (v5 or v9) to execute raw `helm install` commands (stateless, robust).
  - **Querying/Status:** `@kubernetes/client-node` to query Pod status and Namespace labels.
- **Validation:** `zod` for API request validation.
- **Utilities:** `shelljs` or `fs-extra` for temp file handling.

## 3. Frontend (Dashboard)
- **Framework:** React + Vite.
- **Styling:** Tailwind CSS + ShadcnUI (optional) or Headless UI.
- **State:** React Query (TanStack Query) for polling store status.
- **HTTP Client:** Axios.

## 4. Workloads (The Stores)
- **Engine A (Implemented):** WooCommerce.
  - Base Image: `bitnami/wordpress`.
  - Database: `bitnami/mariadb` (Helm Dependency).
  - **Automation:** `wp-cli` running in a `postStart` hook to install plugins/themes automatically.
- **Engine B (Stubbed):** MedusaJS.
  - Implemented as a mock to demonstrate architectural polymorphism.