// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

const { Client } = require('pg')
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const port = process.env.PORT || 3000

const session = require('express-session')({
    secret: 'my-secret',
        resave: true,
        saveUninitialized: true
    }
)
const sharedsession = require('express-socket.io-session')

// use sessions for express
app.use(session)

// Share session with io sockets
io.use(sharedsession(session))

// connect to the PostgreSQL server
const client = new Client({
    connectionString: process.env.DB_URI,
    ssl: { rejectUnauthorized: true }
})
client.connect()

// listen on all watchers
const query = client.query('LISTEN watchers')

// when a notification comes up show in console
client.on('notification', (msg) => {
    console.log(msg.payload)
    io.emit('message', msg.payload);
});

// when we get a request on / send the index.html page
app.get('/', (req, res) => {
    if (req.session.user) {
        // user is logged in
        res.sendFile(__dirname + '/public/answer.html');
    } else {
        // not logged in
        res.sendFile(__dirname + '/public/login.html');
    }
});

app.post('/', (req, res) => {
    console.log('login', req)
});

// other static files are served from the public folder
app.use(express.static(path.join(__dirname, '/public')));


// when a new client connects to the socket
io.on('connection', (socket) => {
    socket.on('message', (msg) => {
        const query = client.query('insert into foo (name) values ($1)', [msg])
  });
});

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port);
});