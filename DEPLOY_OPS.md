# Deployment Operations — Helicarrier

This project is deployed on **Helicarrier**. Opencode is connected to the Helicarrier MCP server (`helicarrier`) and can read and change live deployment state.

If the `helicarrier` tools are unavailable, the connection is not authenticated. Do not guess deployment state. Tell the user to run:

```bash
opencode mcp auth helicarrier
```

## Session start health check

At the start of every session, before doing feature work, run a deployment health check:

1. `list_projects` — confirm the expected project exists.
2. `list_environments` then `get_project` with the correct `env`. Services are returned **one environment at a time**. `serviceCount` is the true total; the `services` array on `list_projects` is only an 8-item preview with no ids, so never treat it as the service list.
3. For each service: latest deployment status, instance count/health, and last deploy time.
4. For anything unhealthy, failed, or recently redeployed: `get_deployment_logs` (use `after` to follow a build without re-reading the whole log) and `get_metrics` with a `range` (`1h`, `6h`, `24h`, `7d`).

Report findings in this shape:

```text
Deployment health
- <service> (<env>): <status> — <one line of evidence>

Issues found
- <service>: <symptom> → <likely cause> → <proposed fix>

Needs your approval
- <destructive action you want to take>
```

Keep it short. If everything is healthy, say so in one line and move on.

## What the agent may and may not do

The OAuth grant scope controls what tools exist. If only read-only tools are offered, that is expected — report the finding and ask the user to reconnect with full access at https://app.helicarrier.xyz/settings if a change is needed.

Ask for explicit confirmation before any destructive or outward-facing action:

- `deploy_service`, `deploy_upload`
- rollback to a previous deployment
- `scale_service`, stopping a service
- deleting a service or database
- adding, changing, or removing environment variables
- adding a custom domain
- provisioning a database

Read-only calls (list, get, logs, metrics) do not need confirmation.

## Fixing an issue

When the owner reports a problem or a health check surfaces one:

1. Diagnose from evidence first — logs and metrics — before proposing a change. Quote the relevant log lines.
2. Distinguish the failure layer: build failure, runtime crash loop, configuration/environment problem, dependency problem (database, DNS, egress), or capacity.
3. Propose the smallest change that resolves the cause.
4. Get approval, then apply it through Helicarrier.
5. Re-check status, logs, and metrics to confirm the fix took effect. Do not report success without verification.
6. If the fix belongs in the repository rather than in platform config — a build error, a missing dependency, a Next.js config problem — edit the code locally, run `npm run lint`, `npm run typecheck`, and `npm test`, and let the normal deploy pipeline pick it up. Do not paper over a code defect with a platform-level environment-variable patch.
7. Report what was changed, whether it worked, and what remains.

Never change money, payment, authorization, or secret values as part of incident response. If the fix would require a credential change, stop and hand that to the owner.