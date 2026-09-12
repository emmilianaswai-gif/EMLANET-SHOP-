export const SUPER_ADMIN_ROLE = "super_admin";

export const STAFF_ROLES = [SUPER_ADMIN_ROLE, "admin", "manager", "employee", "cashier", "clerk"];

export const isStaffRole = (role) => STAFF_ROLES.includes((role || "").toLowerCase());

export const isSuperAdmin = (role) => (role || "").toLowerCase() === SUPER_ADMIN_ROLE;

// Super admin sits at the top of the hierarchy and inherits every admin power.
export const isAdminOrAbove = (role) => {
  const r = (role || "").toLowerCase();
  return r === SUPER_ADMIN_ROLE || r === "admin";
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  cashier: "Cashier",
  clerk: "Clerk",
  customer: "Customer",
};

export const roleLabel = (role) => ROLE_LABELS[(role || "").toLowerCase()] || role || "Customer";
