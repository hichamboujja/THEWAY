import DataTable from '../ui/DataTable.jsx';

export default function RolePermissionMatrix({ roles = [], loading }) {
  const rows = Array.isArray(roles.roles) ? roles.roles.map((role) => {
    const roleLinks = (roles.rolePermissions || []).filter((link) => link.id_role === role.id_role);
    const permissionIds = new Set(roleLinks.map((link) => link.id_permission));
    const permissions = (roles.permissions || []).filter((permission) => permissionIds.has(permission.id_permission));
    return { ...role, permissions };
  }) : roles;
  return (
    <DataTable
      loading={loading}
      rows={rows}
      columns={[
        { key: 'code', header: 'Role', render: (row) => row.code || row.role || row.name },
        { key: 'label', header: 'Libelle' },
        { key: 'permissions', header: 'Permissions', render: (row) => (row.permissions || []).map((item) => item.code || item).join(', ') },
        { key: 'total', header: 'Total', render: (row) => (row.permissions || []).length }
      ]}
      emptyMessage="Aucun role disponible."
    />
  );
}
