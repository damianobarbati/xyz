-- no-log: this line is to prevent slow query logging, since we know it's very slow
drop materialized view if exists users_permissions;
create materialized view users_permissions as (select * from permissions2);
alter materialized view users_permissions set (autovacuum_enabled = false, toast.autovacuum_enabled = false);
create index if not exists idx_users_permissions_subject on users_permissions (subject);
create index if not exists idx_users_permissions_subject_is_group on users_permissions (subject_is_group);
create index if not exists idx_users_permissions_operation on users_permissions (operation);
create index if not exists idx_users_permissions_resource on users_permissions (resource);
create index if not exists idx_users_permissions_resource_is_owner on users_permissions (resource_is_owner);
create index if not exists idx_users_permissions_combo on users_permissions(subject, operation, resource, resource_is_owner);
create index if not exists idx_users_permissions_covering on users_permissions(subject, operation) include (resource, resource_is_owner);
create index if not exists idx_users_permissions_resource_operation on users_permissions(resource, operation);
