# Drumble Quiz

## Setup
*In order to setup locally, to run and/or develop follow next steps*

### NodeJS
Download and install NodeJS locally for your platform: [nodejs.org](https://nodejs.org)

Open a terminal and verify it's working by typing `node --version` and `npm --version`. Both should return a version (nodejs v9.3.0, npm 5.7.1 at the time of writing this)

### Postgresql (optinal if using remote server)
You can use a remote postgresql instalation (school one)

*Otherwise*:

Install postgresql locally: [postgresql.org](https://www.postgresql.org)

### Config
Copy paste the `.env.example` to `.env`. 

Yes there is a dot in front of the filename, use notepad++ or sublime-text to open the `.env.example` and save it as `.env`.

The settings in the `.env` file should be altered to match your setup.

**DATABASE** and **MAILGUN** sections are used for running the server, the **DEVELOPMENT** is only to sync and setup the database using the bash scripts `setup.sh` and `sync_db.sh`.

### setup.sh (and sync_db.sh)
*(this step can also be done manually, if setup.sh works, skip to running)*

On Linux, OSX (or Windows with ubuntu shell) you can run the bash scripts to setup the project and sync the database from remote to locally.

Make them executable `chmod +x ./*.sh`.

Run setup using `./setup.sh`

### Manually, aka what setup.sh does
Import the [database.sql](./database.sql) file into your database, make sure correct permissions are given.

Open your terminal and navigate to project root (where the package.json file is) and type `npm install` to install all dependencies.

### Running
In order to run the project just navigate in your terminal to project root (where the package.json file is) and run `node server.js`.

This will launch the interface on [localhost:3000](http://localhost:3000).

## Production
For production it's advised to have a webserver in front of the nodejs process. And easy way to achieve that is using [Caddy-server](https://caddyserver.com/), an example config is [provided](./Caddyserver) .


## Own remarks
Yeah, migrations would be nice, but time was limited.

Mailgun was used because it's quick, easy and reliable. Changing to any other method would be very doable.

## Extras
Exporting this markdown readme to textile (redmine format):
`pandoc README.md -t textile -o README.textile`