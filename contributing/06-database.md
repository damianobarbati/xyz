# Database

Run the following prior to any command listed here to load envs:
```sh
export $(grep -v '^#' .env | xargs)
```

## Cheatsheet

Create and apply a migration:
```sh
pnpm -F api db:migrate:make feature_xyz 
pnpm -F api db:migrate
```

Create and apply seeding to import dataset:
```sh
pnpm -F api db:seed:make 1-users
pnpm -F api db:seed
```

Connect to the database:
```sh
docker exec -ti ${DATABASE_NAME:?}-db psql ${DB_URI:?}
```

Connect to cache:
```sh
docker exec -ti ${DATABASE_NAME:?}-cache cache-cli -a ${CACHE_PASSWORD?:}
```

Import schema:
```sh
cat packages/api/src/database/schema.sql | docker exec -i ${DATABASE_NAME:?}-db psql -v ON_ERROR_STOP=1 ${DB_URI:?}
```

Import dump:
```sh
# clear current db
docker exec -ti ${DATABASE_NAME:?}-db psql ${DB_URI:?} -c 'drop schema public cascade; create schema public;'

# if dumped in plain SQL
cat packages/api/src/database/seeds/dataset.sql | docker exec -i ${DATABASE_NAME:?}-db psql -v ON_ERROR_STOP=1 ${DB_URI:?}
# if dumped compressed with `pg_dump -Fc`
docker exec -i ${DATABASE_NAME:?}-db pg_restore --no-owner --disable-triggers -d ${DB_URI:?} < packages/api/src/database/seeds/dataset.sql 
```

Export dump (add `--data-only` for data only):
```sh
# in pain SQL
docker exec -ti ${DATABASE_NAME:?}-db pg_dump --no-owner --no-privileges --disable-triggers -d ${DB_URI:?} > dump.sql
# compressed
docker exec -ti ${DATABASE_NAME:?}-db pg_dump --no-owner --no-privileges --disable-triggers -Fc -d ${DB_URI:?} > dump.dump
```
