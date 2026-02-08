# Implementation Specification (Step-by-Step)

## Phase 1: The Helm Chart (Infrastructure)
**Goal:** A chart that deploys a functioning store with one command.
1. Create `charts/woocommerce`.
2. Add `bitnami/wordpress` and `bitnami/mariadb` dependencies.
3. **Automation Hook:** Create a ConfigMap `wp-setup-script` containing a bash script:
   - Wait for MySQL.
   - `wp core install ...`
   - `wp plugin install woocommerce --activate`
   - `wp theme install storefront --activate`
   - `wp option update woocommerce_store_address ...`
4. Mount and execute this script in the WordPress container (via `lifecycle.postStart` or `command` override).
5. Define `values-local.yaml` and `values-prod.yaml`.

## Phase 2: The Backend (Core Logic)
**Goal:** An API that wraps the Helm CLI.
1. **Setup:** Express server with `IStoreProvisioner` interface.
2. **WooCommerce Implementation:**
   - Function `provision(name: string)`:
     - Generates random DB password.
     - Runs: `helm install <name> ./charts/woocommerce --create-namespace --namespace <name> --set ...`
   - Function `getStatus(name: string)`:
     - Checks if Pods in namespace `<name>` have status `Running` AND `Ready`.
3. **Medusa Implementation (Stub):**
   - Returns mock success after a 2-second delay.
4. **Cleanup Logic:**
   - Implement `deleteStore(name)` which performs the "Helm Uninstall + PVC Delete + Namespace Delete" sequence.

## Phase 3: The API Layer
- `GET /stores`: List all namespaces with label `app=urumi-store`.
- `POST /stores`: Body `{ name, type: 'woocommerce'|'medusa' }`. Triggers provisioning.
- `DELETE /stores/:name`: Triggers cleanup.

## Phase 4: The Frontend
- **Dashboard:** Grid view of stores.
- **Create Modal:** Input for Store Name + Dropdown for Type (Woo/Medusa).
- **Polling:** Every 3s, fetch store status.
- **UX:** Show "Provisioning..." until the backend reports "Ready".

## Phase 5: Production Deployment
1. Provision GCP `e2-medium`.
2. Install k3s + Helm.
3. **Stand Out:** Clone repo to VPS. Run backend.
4. Verify `values-prod.yaml` handles the Static IP correctly.