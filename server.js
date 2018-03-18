// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

const { Client } = require('pg')
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const io = require('socket.io')(http)
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
        // user is logged in, in room socket.handshake.session.room
    }
    socket.on('message', (msg) => {
        const query = client.query('insert into foo (name) values ($1)', [msg])
    })
    socket.on('addQuestion', (msg) => {
        // Add question
        client.query('BEGIN');
        let questionId;
        client.query(
            'INSERT INTO "r0729373-drumblequiz"."Question"("Title", "Content", "Time") VALUES ($1, $2, $3) RETURNING "Id"',
            [msg.title, msg.question, msg.time]).then(res => {

                client.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                    [res.rows[0].Id, msg.answer1, msg.answer1IsTrue]).catch(e => console.error(e.stack));

                client.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                    [res.rows[0].Id, msg.answer2, msg.answer2IsTrue]).catch(e => console.error(e.stack));

                client.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                    [res.rows[0].Id, msg.answer3, msg.answer3IsTrue]).catch(e => console.error(e.stack));

                client.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                    [res.rows[0].Id, msg.answer4, msg.answer4IsTrue]).catch(e => console.error(e.stack));

              }).catch(e => console.error(e.stack));
        client.query('COMMIT');
    })
});

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port)
});
