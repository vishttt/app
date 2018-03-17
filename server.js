// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

const { Client } = require('pg')
const app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// connect to the PostgreSQL server
const client = new Client({
    connectionString: process.env.DB_URI,
    ssl : {
        rejectUnauthorized : true
    }
})
client.connect()

// when a notification comes up show in console
client.on('notification', (msg) => {
    console.log(msg.payload)
    io.emit('message', msg.payload);
});

// listen on all watchers
const query = client.query('LISTEN watchers')

// when we get a request on / send the index.html page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// when a new client connects to the socket
io.on('connection', (socket) => {
    socket.on('message', (msg) => {
        const query = client.query('insert into foo (name)values($1)', [msg])
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});