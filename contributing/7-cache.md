# Database

Run the following prior to any command listed here to load envs:
```sh
export $(grep -v '^#' .env | xargs)
```

## Cheatsheet

Connect to the cache:
```sh
docker exec -ti <app-cache> redis-cli -a ${CACHE_PASS?:}
```

Clear cache:
```sh
TBD.
```

## Caching strategy

TBD.
