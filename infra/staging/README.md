# SD-008 Azure staging infrastructure

This directory is the local, non-production infrastructure contract for SD-008. It does not
authorize an Azure deployment.

`main.bicep` targets an already approved resource group and composes the network, identities,
PostgreSQL, Key Vault, Log Analytics, Container Apps jobs, authenticated application, probes,
and exact-digest release metadata. The example parameter file contains placeholders only and
must never receive real credentials. The approved hosted workflow supplies four masked secure
parameters at deployment time; Bicep places them directly into Key Vault without emitting them
as outputs.

The database bootstrap job receives only the administrator URL and the two role passwords. The
migration job receives only the migration URL. The application identity receives only the
runtime URL and Entra ingress secret. PostgreSQL public access and Key Vault public access remain
disabled.

Local validation:

```powershell
az bicep build --file infra/staging/main.bicep --stdout > $null
```

An Azure `what-if`, resource creation, job invocation, traffic change, rollback, or teardown is
a separately approved mutation and is outside local implementation authority.
