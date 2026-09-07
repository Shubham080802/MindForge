# Incident response

1. **Detect and declare:** assign an incident lead, record start time and affected surfaces, and preserve structured application/provider logs.
2. **Contain:** disable affected credentials or providers, block abusive identities at the edge, or place the application in maintenance mode. Do not destroy evidence.
3. **Assess:** identify exposed data, affected accounts, duration, and whether legal or contractual notification clocks apply.
4. **Recover:** rotate compromised secrets, deploy a reviewed fix, validate `/api/health`, run the staging browser flow, and restore traffic gradually.
5. **Communicate:** use the configured support channel and appropriate status channel. Be factual about impact and uncertainty.
6. **Learn:** publish an internal timeline, root cause, detection gap, and owned follow-up actions with deadlines.

Security reports should be acknowledged promptly. Production operators must replace the example support address before launch and define named on-call ownership.
