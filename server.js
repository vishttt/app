// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

const { Client } = require('pg')
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const io = require('socket.io')(http)

const schema = process.env.DB_SCHEMA
const port = process.env.PORT || 3000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

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
const dbclient = new Client({
    connectionString: process.env.DB_URI,
    ssl: { rejectUnauthorized: true }
})
dbclient.connect()

// listen on all watchers
const query = dbclient.query('LISTEN watchers')

// when a notification comes up show in console
dbclient.on('notification', (msg) => {
    console.log(msg.payload)
    io.emit('message', msg.payload);
});

// when we get a request on / send the index.html page
app.get('/', (req, res) => {
    if (req.session.user) {
        // user is logged in
        if (req.session.user.substr(0,1) === 'u')
            return res.sendFile(__dirname + '/public/editquestion.html')
        else
            return res.sendFile(__dirname + '/public/answer.html')
    } else {
        // not logged in
        return res.sendFile(__dirname + '/public/login.html')
    }
});

app.post('/', (req, res) => {
    // if rnumber or roomnumber empty redirect back
    if (req.body.rnumber.length == 0 || req.body.roomnumber.length == 0)
        return res.redirect('/');

    // user logged in, set details as session
    req.session.user = req.body.rnumber
    req.session.room = req.body.roomnumber
    // and redirect to home page
    res.redirect('/');
});

// other static files are served from the public folder
app.use(express.static(path.join(__dirname, '/public')))


// when a new client connects to the socket
io.on('connection', (socket) => {
    if (socket.handshake.session.user) {
        const roomid = socket.handshake.session.room
        // user is logged in, in room socket.handshake.session.room
        dbclient.query(`select 
        questioninstanceid "QuestionInstanceId", 
        a."Id" "AnswerId",
        a."Content" "Answer",
        aqpr.endtime
        from "${schema}".active_questions_per_room aqpr
        inner join "${schema}"."Answer" a
        on (aqpr.questioninstanceid = a."QuestionId")
        where "RoomId" = $1`, [roomid], (err, res) => {
            const currentAnswers = res.rows
            if (currentAnswers.length > 0) {
                console.log(currentAnswers)
                socket.send(currentAnswers)
            }
        })

        socket.on('select', (answer) => {
            console.log('selected', answer)
            //const query = dbclient.query('insert into foo (name) values ($1)', [msg])
        })
    }
    socket.on('message', (msg) => {
        const query = dbclient.query('insert into foo (name) values ($1)', [msg])
    })
});

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port)
});