#!/usr/bin/env sh
# import settings from .env file, see .env.example for how to setup
source ./.env

# setup all npm packages (you can certainly use yarn instead if you wish)
npm install

# import into local postgresql server
echo "Importing db from $FILE to $DB_URI"
psql $DB_URI < $FILE >/dev/null
