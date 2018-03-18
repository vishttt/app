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
        // user is logged in
        const roomid = socket.handshake.session.room
        // user is logged in, in room socket.handshake.session.room
        const userid = socket.handshake.session.user

        // select the current active question, and the answers for that question
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
                // and send them to the user if there are any
                socket.send(currentAnswers)
            }
        })

        socket.on('select', (answer) => {
            // when a user selects an answer
            const query = dbclient.query(`insert into "${schema}"."AnswerInstance" ("QuestionInstanceId", "AnswerId", "StudentId") values ($1, $2, $3)`, [
                answer.QuestionInstanceId,
                answer.AnswerId,
                userid
            ])
        })
    }
    socket.on('message', (msg) => {
        const query = dbclient.query('insert into foo (name) values ($1)', [msg])
    })

    socket.on('addQuestion', (msg) => {
        // Add question
        dbclient.query('BEGIN');
        let questionId;
        if (msg.title && msg.question && msg.time )
        {
            dbclient.query(
                'INSERT INTO "r0729373-drumblequiz"."Question"("Title", "Content", "Time") VALUES ($1, $2, $3) RETURNING "Id"',
                [msg.title, msg.question, msg.time]).then(res => {
                    if (msg.answer1 && msg.answer1IsTrue != null )
                    {
                        dbclient.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                            [res.rows[0].Id, msg.answer1, msg.answer1IsTrue]).catch(e => console.error(e.stack));
                    }
                    if (msg.answer2 && msg.answer2IsTrue != null )
                    {
                        dbclient.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                            [res.rows[0].Id, msg.answer2, msg.answer2IsTrue]).catch(e => console.error(e.stack));
                    }
                    if (msg.answer3 && msg.answer3IsTrue != null )
                    {
                        dbclient.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                            [res.rows[0].Id, msg.answer3, msg.answer3IsTrue]).catch(e => console.error(e.stack));
                    }
                    if (msg.answer4 && msg.answer4IsTrue != null)
                    {
                        dbclient.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                            [res.rows[0].Id, msg.answer4, msg.answer4IsTrue]).catch(e => console.error(e.stack));
                    }
                  }).catch(e => console.error(e.stack));
        }
        dbclient.query('COMMIT');
    });

    socket.on('editQuestion', (msg) => {

        if (msg.Id)
        {
            if (msg.title)
            {
                dbclient.query(
                    'UPDATE "r0729373-drumblequiz"."Question" SET "Title"=$1 WHERE "Id"=$2',
                    [msg.title, msg.Id]).catch(e => console.error(e.stack));
            }
            if (msg.question)
            {
                dbclient.query(
                    'UPDATE "r0729373-drumblequiz"."Question" SET "Content"=$1 WHERE "Id"=$2',
                    [msg.question, msg.Id]).catch(e => console.error(e.stack));
            }
            if (msg.time)
            {
                dbclient.query(
                    'UPDATE "r0729373-drumblequiz"."Question" SET "Time"=$1 WHERE "Id"=$2',
                    [msg.time, msg.Id]).catch(e => console.error(e.stack));
            }
        }
    });

    socket.on('editAnswer', (msg) => {

        if (msg.Id)
        {
            if (msg.title)
            {
                dbclient.query(
                    'UPDATE "r0729373-drumblequiz"."Answer" SET "Content"=$1 WHERE "Id"=$2',
                    [msg.answer, msg.Id]).catch(e => console.error(e.stack));
            }
            if (msg.answerIsTrue != null)
            {
                dbclient.query(
                    'UPDATE "r0729373-drumblequiz"."Answer" SET "IsCorrect"=$1 WHERE "Id"=$2',
                    [msg.answerIsTrue, msg.Id]).catch(e => console.error(e.stack));
            }
        }
    });

    socket.on('deleteAnswer', (msg) => {
        if (msg.Id)
        {
            dbclient.query('DELETE FROM "r0729373-drumblequiz"."Answer" WHERE "Id"=$1',
                [msg.Id]).catch(e => console.error(e.stack));
        }
    });

    socket.on('addAnswer', (msg) => {
        if (msg.Id && msg.answer && msg.answerIsTrue != null)
        {
            dbclient.query('SELECT * FROM "r0729373-drumblequiz"."Answer" WHERE "QuestionId"=$1',
                [msg.Id]).then(res =>
                {
                    if (res.rows.length < 4)
                    {
                        dbclient.query('INSERT INTO "r0729373-drumblequiz"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)',
                            [msg.Id, msg.answer4, msg.answerIsTrue]).catch(e => console.error(e.stack));
                    }
                }).catch(e => console.error(e.stack));
        }
    });

});

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port)
});
