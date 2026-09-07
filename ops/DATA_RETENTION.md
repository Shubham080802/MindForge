# Data retention and deletion

- Account profile, sessions, messages, materials, and extracted text remain until the learner deletes the session or account.
- Session deletion cascades to its messages and attached materials. Account deletion cascades to all account-owned study data.
- Expired verification and password-reset tokens are removed daily by the retention endpoint.
- Audit events are retained for `AUDIT_RETENTION_DAYS` (default 365, minimum 30), then deleted by scheduled maintenance.
- Platform, database, email, Redis, and AI-provider logs follow the separately configured provider retention periods. Operators must align those periods with the published Privacy Policy.
- Backup expiry follows the managed database policy. A deletion can persist in encrypted backups until those backups expire; restored backups must replay deletion obligations before serving traffic.
