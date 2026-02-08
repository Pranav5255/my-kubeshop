# System Design & Architecture

## 1. Architectural Pattern: The "Provisioning Strategy"
We use the **Strategy Pattern** to handle multiple store types. The API does not know strictly about "WooCommerce" or "Medusa"; it knows about `IStoreProvisioner`.

### Interfaces
```typescript
interface StoreProvisioner {
  provision(config: StoreConfig): Promise<ProvisionResult>;
  getHealth(storeId: string): Promise<StoreStatus>;
  deprovision(storeId: string): Promise<void>;
}
```
- `WooCommerceProvisioner`: Implements the logic using `helm install` with the WooCommerce chart.

- `MedusaProvisioner`: Implements the logic using a mock/stub (returns successful "fake" provisioning logs) to satisfy the "Architecture must be extensible" requirement.

## 2. Isolation Strategy (Multi-Tenancy)
- **Namespace Per Tenant**: Every store gets its own Namespace (e.g., store-abc12).

- **Network Policies**:
    - **Default**: Deny All Ingress/Egress.
    - **Allow**: Ingress Controller -> Pod (Port 80).
    - **Allow**: WordPress Pod <-> MariaDB Pod (Internal).
    - **Allow**: WordPress Pod -> DNS (UDP 53).
    - **Allow**: WordPress Pod -> Public Internet (for plugin updates/WooCommerce setup).

- **Resource Quotas & Limits**:
    - **ResourceQuota**: Hard limit on total CPU/RAM per namespace (e.g., 2 CPU, 2Gi RAM).
    - **LimitRange**: Default requests/limits for every container to prevent "noisy neighbors".

- **Security Context**:
    - Run containers as non-root where possible (Bitnami images support this).
    - RBAC: Provisioner uses a ServiceAccount with restricted ClusterRole (create NS, manageable resources only).

## 3. Data Persistence & Cleanup
- **Storage**: Dynamic Provisioning using the default StorageClass (standard on GCP, local-path on k3d).

- **The "PVC Trap"**: `helm uninstall` does NOT delete Persistent Volume Claims (PVCs).

- **Cleanup Logic**: The deprovision method in the backend must:

    - Run `helm uninstall`.

    - Query `kubectl get pvc -n <namespace>`.

    - Explicitly delete those PVCs.

    - Delete the Namespace.

## 4. Local vs. Production Parity
We achieve "Local-to-Prod" portability via Helm Values, NOT code changes.

- `values-local.yaml`: Sets `ingress.host` to 127.0.0.1.nip.io. Disables heavy resource limits.

- `values-prod.yaml`: Sets ingress.host to <GCP_IP>.nip.io. Enforces strict resource limits (RAM) to fit on e2-medium.

- **Backend Config**: The API reads process.env.BASE_DOMAIN to determine which domain suffix to inject into Helm.