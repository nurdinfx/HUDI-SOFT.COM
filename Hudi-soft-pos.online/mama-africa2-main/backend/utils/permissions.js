// backend/utils/permissions.js
/**
 * Role default permissions for HUDI-SOFT POS
 * 
 * Default Rules:
 * Admin: Allowed (Equity & Finance), Allowed (AI Assistant)
 * Manager: Allowed (Equity & Finance), Allowed (AI Assistant)
 * Accountant: Allowed (Equity & Finance), Allowed (AI Assistant)
 * Owner: Allowed (Equity & Finance), Allowed (AI Assistant)
 * Cashier: Denied by default, Denied by default
 * Waiter: Denied by default, Denied by default
 * Chef / Kitchen: Denied by default, Denied by default
 */

export const ROLE_DEFAULT_PERMISSIONS = {
  admin: { equityFinance: true, aiAssistant: true },
  manager: { equityFinance: true, aiAssistant: true },
  accountant: { equityFinance: true, aiAssistant: true },
  owner: { equityFinance: true, aiAssistant: true },
  cashier: { equityFinance: false, aiAssistant: false },
  waiter: { equityFinance: false, aiAssistant: false },
  chef: { equityFinance: false, aiAssistant: false },
  kitchen: { equityFinance: false, aiAssistant: false }
};

/**
 * Resolves effective permissions by combining role defaults with explicit user-level overrides.
 * Overrides take precedence if defined (true/false).
 */
export const getEffectivePermissions = (user) => {
  if (!user) {
    return { equityFinance: false, aiAssistant: false };
  }

  const role = (user.role || 'cashier').toLowerCase();
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || { equityFinance: false, aiAssistant: false };
  const custom = user.permissions || {};

  return {
    equityFinance: custom.equityFinance !== undefined && custom.equityFinance !== null
      ? Boolean(custom.equityFinance)
      : Boolean(defaults.equityFinance),
    aiAssistant: custom.aiAssistant !== undefined && custom.aiAssistant !== null
      ? Boolean(custom.aiAssistant)
      : Boolean(defaults.aiAssistant)
  };
};
