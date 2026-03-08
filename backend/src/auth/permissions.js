export const PERM_CATALOG = [
  { group: "Users", items: ["users.view", "users.update", "users.role.manage"] },
  { group: "Products", items: ["products.view", "products.create", "products.update", "products.delete", "products.toggle"] },
  { group: "Orders", items: ["orders.view", "orders.update_status", "orders.refund"] },
  { group: "Finance", items: ["finance.view", "finance.export", "ledger.view", "ledger.create", "ledger.delete"] },
  { group: "Network", items: ["network.view_all", "network.unilevel.view", "network.matrix.view"] },
  { group: "Logs", items: ["logs.view"] },
  { group: "Settings", items: ["settings.view", "settings.update"] },
];

export const ROLE_BASE_PERMS = {
  user: ["products.view", "orders.view"],
  admin: [
    "users.view",
    "products.view",
    "products.create",
    "products.update",
    "products.toggle",
    "orders.view",
    "orders.update_status",
    "finance.view",
    "ledger.view",
  ],
  superadmin: ["*"],
};

export function allCatalogPerms() {
  return PERM_CATALOG.flatMap((g) => g.items);
}