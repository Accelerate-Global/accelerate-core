import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminUserRecord,
  appRoleLabel,
  formatAdminDateTime,
} from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { ConfirmSubmitButton } from "@/features/admin/ui/confirm-submit-button";
import { updateUserRoleAction } from "@/features/admin/users/actions";
import type { AdminUsersPageData } from "@/features/admin/users/server";
import { routes } from "@/lib/routes";

const roleBadgeClassName = {
  admin: "border-orange-200 bg-orange-50 text-orange-700",
  user: "border-blue-200 bg-blue-50 text-blue-700",
} as const;

const UserRoleAction = ({
  actingUserId,
  totalAdminCount,
  user,
}: {
  actingUserId: string;
  totalAdminCount: number;
  user: AdminUserRecord;
}) => {
  if (user.appRole === "admin") {
    if (user.userId === actingUserId || totalAdminCount <= 1) {
      return (
        <p className="text-muted-foreground text-sm">Required admin coverage</p>
      );
    }

    return (
      <form action={updateUserRoleAction} className="flex justify-end">
        <input name="userId" type="hidden" value={user.userId} />
        <input name="nextRole" type="hidden" value="user" />
        <ConfirmSubmitButton
          confirmLabel="Remove admin"
          idleLabel="Make user"
          variant="destructive"
        />
      </form>
    );
  }

  return (
    <form action={updateUserRoleAction} className="flex justify-end">
      <input name="userId" type="hidden" value={user.userId} />
      <input name="nextRole" type="hidden" value="admin" />
      <Button size="sm" type="submit" variant="outline">
        Promote to admin
      </Button>
    </form>
  );
};

export const AdminUsersPageView = ({
  actingUserId,
  authMetadataAvailable,
  query,
  roleFilter,
  totalAdminCount,
  users,
}: AdminUsersPageData) => {
  return (
    <AdminModuleShell
      description="Inspect app roles, profile context, and workspace membership without mixing admin operations into the product shell."
      route={routes.adminUsers}
      title="Users"
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>User directory</CardTitle>
            <CardDescription>
              Profiles stay authoritative here. Auth-admin email and sign-in
              data is additive when available.
            </CardDescription>
          </div>
          <form className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_10rem_auto]">
            <label className="grid gap-2" htmlFor="admin-users-search">
              <span className="font-medium text-sm">Search</span>
              <Input
                defaultValue={query}
                id="admin-users-search"
                name="q"
                placeholder="Name, email, or workspace"
              />
            </label>
            <label className="grid gap-2" htmlFor="admin-users-role">
              <span className="font-medium text-sm">Role</span>
              <Select
                defaultValue={roleFilter}
                id="admin-users-role"
                name="role"
              >
                <option value="all">All roles</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
              </Select>
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                <Search aria-hidden="true" />
                Apply
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          {authMetadataAvailable ? null : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
              Auth-admin enrichment is currently unavailable. The page is still
              rendering from profile and workspace data.
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Workspace context</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {user.displayName ?? "Unnamed user"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {user.email ?? "Email unavailable"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {user.userId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleBadgeClassName[user.appRole]}>
                      {appRoleLabel[user.appRole]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.memberships.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No workspace memberships
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.memberships.map((membership) => (
                          <Badge
                            key={`${user.userId}-${membership.id}`}
                            variant="outline"
                          >
                            {membership.name} · {membership.role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatAdminDateTime(user.createdAt)}</TableCell>
                  <TableCell>
                    {formatAdminDateTime(user.lastSignInAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRoleAction
                      actingUserId={actingUserId}
                      totalAdminCount={totalAdminCount}
                      user={user}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
