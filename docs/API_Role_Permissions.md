Role & Permission Management API

Purpose

This document describes the backend endpoints and UI guidance for managing roles and permissions in the admin panel.

Entities

- Role: named role assigned to users (e.g. `admin`, `teacher`, `user`).
- Permission: an API path identifier string (e.g. `/course`, `/user/profile`).
- RolePermission: association between Role and Permission with allowed HTTP `methods` (comma-separated string like `GET,POST,PUT`).

Endpoints (backend)

- GET /roles
  - List all roles with their permissions.
  - Response: array of roles; each role contains `rolePermissions` where each item includes `permission` and `methods`.

- GET /roles/:id
  - Get a single role with its permissions.

- POST /roles
  - Create a role
  - Body: `{ name: string }`
  - Response: created role object

- PUT /roles/:id
  - Update a role's name
  - Body: `{ name?: string }`
  - Response: updated role with permissions

- POST /roles/:id/permissions
  - Assign a permission to a role (create permission if needed)
  - Body: either `{ permissionId: string, methods: string }` or `{ api: string, methods: string }` (if `api` is provided and not exists, it will be created)
  - `methods` format: comma-separated HTTP methods, e.g. `GET,POST`.
  - Response: created or updated `rolePermission` record

- PUT /roles/:id/permissions/:permissionId
  - Update the allowed `methods` for an existing role-permission
  - Body: `{ methods: string }`

- DELETE /roles/:id/permissions/:permissionId
  - Remove a permission from a role

- GET /permissions
  - List all permissions (each includes roles attached)

- POST /permissions
  - Create a permission
  - Body: `{ api: string }`

Frontend UI guidance (Admin Panel)

Overview

- Page: Roles
  - Table of roles: columns `name`, `createdAt`, `actions` (`edit`, `manage permissions`).
  - Clicking `manage permissions` opens a modal or side panel showing the permission list for that role.

Role form (create / edit)

- Fields:
  - `name` (text)
- Create: call `POST /roles` with `{ name }`.
- Edit: call `PUT /roles/:id` with modified name.

Manage Permissions UI

- Show role's current permissions as a list/table with columns: `permission.api`, `methods`, `actions` (`edit methods`, `remove`).
- Add permission section (inline in modal):
  - Input: `API path` (text) OR select from existing permissions dropdown.
  - Input: `Methods` (multi-select or tag input for `GET,POST,PUT,DELETE`)
  - Button `Assign` → calls `POST /roles/:id/permissions` with `{ api, methods }` or `{ permissionId, methods }`.
- Edit methods:
  - Inline edit the `methods` value and save → `PUT /roles/:id/permissions/:permissionId` with `{ methods }`.
- Remove permission:
  - Click remove → confirm → `DELETE /roles/:id/permissions/:permissionId`.

Validation and UX notes

- Methods should be shown as chips/tags (GET, POST, PUT, DELETE).
- When adding a new API path via text input, show a short warning that this will create a new permission record in the system.
- Show success toasts and handle errors well (e.g., role name conflicts).
- Ensure only admin users can access this page.

Quick API examples

- Assign permission by api:

```javascript
await axios.post(`/roles/${roleId}/permissions`, { api: '/course', methods: 'GET,POST' });
```

- Update methods:

```javascript
await axios.put(`/roles/${roleId}/permissions/${permissionId}`, { methods: 'GET,POST,PUT' });
```

- Remove permission:

```javascript
await axios.delete(`/roles/${roleId}/permissions/${permissionId}`);
```

Next steps

- Add UI components: RoleList, RoleForm, RolePermissionsModal.
- Add client-side validation for `methods` input (only allow known HTTP verbs).
- Optionally, add search/filter by permission API across roles.

File: docs/API_Role_Permissions.md
