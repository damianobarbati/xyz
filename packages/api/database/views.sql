drop view if exists users2 cascade;
create or replace view users2 as (
  select u.* from users as u
);