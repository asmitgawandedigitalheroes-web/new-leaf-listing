import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import { AuditLog, AuditFilters, AuditAction } from '../types/audit.types';

export const auditService = {
  /**
   * Write a new audit log entry.
   * @param userId - the user performing the action
   * @param action - the audit action (e.g. 'listing.approved')
   * @param entityType - the type of entity affected (e.g. 'listing')
   * @param entityId - the ID of the affected entity, or null
   * @param metadata - arbitrary additional context
   */
  log: async (
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string | null = null,
    metadata: Record<string, any> | null = null
  ) => {
    return adminApi.request<AuditLog>(
      supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          timestamp: new Date().toISOString(),
          metadata,
        })
        .select()
        .single() as any
    );
  },

  /**
   * Fetch audit logs with optional filters and pagination.
   * @param filters - filter criteria
   * @param page - 1-based page number (default 1)
   * @param pageSize - records per page (default 50)
   */
  getAuditLogs: async (filters: AuditFilters = {}, page = 1, pageSize = 50) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('audit_logs')
      .select('*, user:profiles!user_id(full_name, email, role)', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
    if (filters.entity_id) query = query.eq('entity_id', filters.entity_id);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.date_from) query = query.gte('timestamp', filters.date_from);
    if (filters.date_to) query = query.lte('timestamp', filters.date_to);

    const { data, error, count } = await query;
    return { data: data as AuditLog[] | null, error, count };
  },

  /**
   * Get the full history for a specific entity (e.g. all events for listing X).
   */
  getAuditLogsForEntity: async (entityType: string, entityId: string) => {
    return adminApi.request<AuditLog[]>(
      supabase
        .from('audit_logs')
        .select('*, user:profiles!user_id(full_name, email, role)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('timestamp', { ascending: false }) as any
    );
  },

  /**
   * Get all audit activity for a specific user.
   */
  getAuditLogsForUser: async (userId: string) => {
    return adminApi.request<AuditLog[]>(
      supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false }) as any
    );
  },

  /**
   * Get the most recent N audit log entries for the admin dashboard feed.
   * @param limit - number of records to return (default 20)
   */
  getRecentActivity: async (limit = 20) => {
    return adminApi.request<AuditLog[]>(
      supabase
        .from('audit_logs')
        .select('*, user:profiles!user_id(full_name, email, role)')
        .order('timestamp', { ascending: false })
        .limit(limit) as any
    );
  },
};
