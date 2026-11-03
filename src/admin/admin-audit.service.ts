import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: unknown;
}

/**
 * Append-only trail of admin changes. Never throws: an audit failure must not
 * undo or block the operation the user asked for.
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly dataSource: DataSource) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO "admin_audit_log"
           ("id", "actorId", "actorEmail", "action", "entity", "entityId", "payload")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          entry.actorId ?? null,
          entry.actorEmail ?? null,
          entry.action,
          entry.entity,
          entry.entityId ?? null,
          entry.payload ? JSON.stringify(entry.payload) : null,
        ],
      );
    } catch {
      // Swallowed on purpose (see class doc).
    }
  }
}
