create function set_updated_at() returns trigger language plpgsql as $$
  begin
    new.updated_at = now()::timestamptz(0);
    return new;
  end;
$$;

create table "users" (
  "id" text primary key default uuidv7() not null,
  "created_at" timestamptz default now()::timestamptz(0) not null,
  "updated_at" timestamptz default now()::timestamptz(0) not null,
  "email" text not null unique,
  "password_hash" text not null,
  "name" text not null check (length(name) > 0 and length(name) <= 100)
);
create trigger "users_set_updated_at" before update on "users" for each row execute procedure set_updated_at();