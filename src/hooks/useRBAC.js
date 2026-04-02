import { useAuth } from '../context/AuthContext';

/**
 * Permission matrix.
 * 'admin' is the wildcard role — all permissions granted.
 * Permissions follow the format: 'resource.action'
 */
const PERMISSIONS = {
  admin: ['*'],

  director: [
    'listings.view',
    'listings.approve',
    'listings.reject',
    'leads.view',
    'leads.assign',
    'leads.update',
    'commissions.view',
    'commissions.approve',
    'users.view',
    'users.manage_realtors',
    'territory.view',
    'reports.view',
  ],

  realtor: [
    'listings.view',
    'listings.create',
    'listings.edit_own',
    'listings.upgrade',
    'leads.view_own',
    'leads.contact',
    'commissions.view_own',
    'profile.edit',
  ],
};

/**
 * RBAC hook for NLVListings.
 *
 * @returns {{
 *   can: (permission: string) => boolean,
 *   canAny: (permissions: string[]) => boolean,
 *   canAll: (permissions: string[]) => boolean,
 *   is: (roleOrRoles: string | string[]) => boolean,
 *   role: string | null,
 *   permissions: string[],
 * }}
 *
 * @example
 * const { can, is } = useRBAC();
 * can('listings.create')  // true for realtor, admin
 * is('admin')             // true if current user is admin
 * canAny(['leads.assign', 'leads.view_own'])  // true if any match
 * canAll(['listings.view', 'listings.approve']) // true if all match
 */
export function useRBAC() {
  const { role } = useAuth();

  /** Get the full permission list for the current role */
  const userPermissions = PERMISSIONS[role] ?? [];

  /**
   * Check if the current user has a specific permission.
   * Admins always return true via the wildcard '*'.
   * @param {string} permission - e.g. 'listings.create'
   * @returns {boolean}
   */
  const can = (permission) => {
    if (!role) return false;
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  };

  /**
   * Returns true if the user has ANY of the given permissions.
   * @param {string[]} permissions
   * @returns {boolean}
   */
  const canAny = (permissions) => {
    return permissions.some((p) => can(p));
  };

  /**
   * Returns true if the user has ALL of the given permissions.
   * @param {string[]} permissions
   * @returns {boolean}
   */
  const canAll = (permissions) => {
    return permissions.every((p) => can(p));
  };

  /**
   * Check if the current user matches a role or array of roles.
   * @param {string | string[]} roleOrRoles
   * @returns {boolean}
   */
  const is = (roleOrRoles) => {
    if (!role) return false;
    if (Array.isArray(roleOrRoles)) return roleOrRoles.includes(role);
    return role === roleOrRoles;
  };

  return {
    can,
    canAny,
    canAll,
    is,
    role,
    permissions: userPermissions,
  };
}

export default useRBAC;
