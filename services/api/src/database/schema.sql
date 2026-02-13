-- add support for UUID
create extension if not exists "pgcrypto";

-- asu (array sort unique): sort array and remove duplicates
create function asu (anyarray) returns anyarray language sql as $$
  select array(select distinct $1[s.i] from generate_series(array_lower($1,1), array_upper($1,1)) as s(i) order by 1);
$$;

-- set updated_at=now() when updating row
create function set_updated_at() returns trigger language plpgsql as $$
  begin
    new.updated_at = now()::timestamptz(0);
    return new;
  end;
$$;

create or replace function next_id() returns text as $$
declare
  ts_sec bigint;
  seq bigint;
  id_num bigint;
  res text := '';
  chars text := '0123456789abcdefghijklmnopqrstuvwxyz';
  epoch_offset bigint := 1735689600;
begin
  -- 1. generate 45bit id
  ts_sec := (floor(extract(epoch from clock_timestamp())) - epoch_offset)::bigint & 2147483647;
  seq := nextval('id_seq') & 16383;
  id_num := (ts_sec << 14) | seq;

  -- 2. convert to Base36
  while id_num > 0 loop
      res := substr(chars, (id_num % 36)::integer + 1, 1) || res;
      id_num := id_num / 36;
  end loop;

  -- 3. left-pad for fixed length and lexicographic sorting
  return lpad(res, 9, '0');
end;
$$ language plpgsql;

create sequence id_seq;

create table "users" (
  "id" text primary key default next_id() not null,
  "created_at" timestamptz default now()::timestamptz(0) not null,
  "updated_at" timestamptz default now()::timestamptz(0) not null,
  "email" text not null unique,
  "password_hash" text not null,
  "name" text not null check (length(name) > 0 and length(name) <= 100)
);
create trigger "users_set_updated_at" before update on "users" for each row execute procedure set_updated_at();
