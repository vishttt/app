#!/usr/bin/env sh
# import settings from .env file, see .env.example for how to setup
source ./.env

# import db from remote server
echo "Importing from $DB_URI_REMOTE to $FILE"
pg_dump --no-owner --no-acl --schema-only --file $FILE $DB_URI_REMOTE

# drop current db
psql --dbname=postgres -c "drop database $DB_LOCAL_DATABASE"

# import new one
psql --dbname=postgres -c "create database $DB_LOCAL_DATABASE"

# import into local postgresql server
echo "Importing db from $FILE to $DB_URI_LOCAL"
psql $DB_URI_LOCAL < $FILE >/dev/null
