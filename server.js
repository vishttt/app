const { Client } = require('pg')

// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

// connect to the PostgreSQL server
const client = new Client({
    connectionString: process.env.DB_URI,
})
client.connect()

// when a notification comes up show in console
client.on('notification', (msg) => {
    console.log(msg)
});

// listen on all watchers
const query = client.query('LISTEN watchers')