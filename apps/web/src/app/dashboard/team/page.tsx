import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { InviteUserDialog } from "@/components/team/invite-user-dialog";
import { UserStatusBadge } from "@/components/team/user-status-badge";
import { UserStatusActions } from "@/components/team/user-status-actions";
import { CreateRoleDialog } from "@/components/team/create-role-dialog";
import { EditRolePermissionsDialog } from "@/components/team/edit-role-permissions-dialog";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  mfa_enabled: boolean;
  last_login_at: string | null;
  role_names: string[];
}

interface Role {
  id: string;
  name: string;
}

interface RoleWithPermissions {
  id: string;
  name: string;
  permissionCodes: string[];
  isEditable: boolean;
}

interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export default async function TeamPage() {
  const { data: users, forbidden } = await fetchOrForbidden(() => api.get<StaffUser[]>("/users"));
  const { data: roles } = await fetchOrForbidden(() => api.get<Role[]>("/users/roles"));
  const { data: rolesWithPermissions, forbidden: rolesManageForbidden } = await fetchOrForbidden(() =>
    api.get<RoleWithPermissions[]>("/roles"),
  );
  const { data: permissions } = await fetchOrForbidden(() => api.get<Permission[]>("/permissions"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${users?.length ?? 0} staff accounts`}</p>
        </div>
        {!forbidden && <InviteUserDialog roles={roles ?? []} />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view staff accounts." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>MFA</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No staff accounts yet.
                    </TableCell>
                  </TableRow>
                )}
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role_names.length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.role_names.map((role) => (
                            <Badge key={role} variant="outline">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{user.mfa_enabled ? "Enabled" : "—"}</TableCell>
                    <TableCell>{user.last_login_at ? formatDate(user.last_login_at) : "Never"}</TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      {(user.status === "active" || user.status === "suspended") && (
                        <UserStatusActions userId={user.id} status={user.status} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!rolesManageForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Roles &amp; permissions</CardTitle>
            </div>
            <CreateRoleDialog permissions={permissions ?? []} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesWithPermissions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No roles yet.
                    </TableCell>
                  </TableRow>
                )}
                {rolesWithPermissions?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.permissionCodes.length} permission{role.permissionCodes.length === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell>
                      {role.isEditable ? (
                        <EditRolePermissionsDialog
                          roleId={role.id}
                          roleName={role.name}
                          currentPermissionCodes={role.permissionCodes}
                          permissions={permissions ?? []}
                        />
                      ) : (
                        <Badge variant="outline">System role</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
