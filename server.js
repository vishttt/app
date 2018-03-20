// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config()

const { Client } = require('pg')
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const io = require('socket.io')(http)
const Queries = require('./queries.js')

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
Queries.SetDbClient(dbclient);

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
        let response = Queries.AddQuestion(msg.title, msg.question, msg.time, msg.quizId, msg.orderId,
           [{answer: msg.answer1, answerIsTrue: msg.answer1IsTrue},
           {answer: msg.answer2, answerIsTrue: msg.answer2IsTrue},
           {answer: msg.answer3, answerIsTrue: msg.answer3IsTrue},
           {answer: msg.answer4, answerIsTrue: msg.answer4IsTrue}]);
        console.log(response);
    });

    socket.on('editQuestion', (msg) => {
        let response = Queries.EditQuestion(msg.Id, msg.title, msg.question, msg.time );
        console.log(response);
    });

    socket.on('editAnswer', (msg) => {
        let response = Queries.EditAnswer(msg.Id, msg.title, msg.answer, msg.answerIsTrue);
        console.log(response);
    });

    socket.on('deleteAnswer', (msg) => {
        let response = Queries.DeleteAnswer(msg.Id);
        console.log(response);
    });

    socket.on('addAnswer', (msg) => {
        let response = Queries.AddAnswer(msg.Id, msg.answer, msg.answerIsTrue);
        console.log(response);
    });

    socket.on('JoinRoom', (msg) => {
      Queries.IsRoomActive(msg.Id).then( (result) =>
      {
          if ( result === true)
          {
              SetCurrentRoomId(msg.Id);
              Queries.IsRoomAnonymous(msg.Id).then( (result2) =>
              {
                  if (result2 === true)
                  {
                      socket.emit('LoadEnterNamePage', {roomId: GetCurrentRoomId()});
                  }
                  else
                  {
                      if (IsUserLoggedIn() === true)
                      {
                          socket.emit('LoadEnterNamePage', {roomId: GetCurrentRoomId()});
                      }
                      else
                      {
                          socket.emit('LoadLogInPage', {});
                      }
                  }
              })
          }
      });
    });

    socket.on('GetRoomId', (msg) =>
    {
        socket.emit('CurrentRoomId', {roomId: GetCurrentRoomId()});
    });

    socket.on('GetRoomResults', (msg) =>
    {
        Queries.GetRoomResults(GetCurrentRoomId()).then( (result) =>
        {
            console.log(result.rows);
            socket.emit('RoomResults', {userinstancesId: GetCurrentUserInstanceId(),
                                        results: result });
        });
    });

    socket.on('GetLastQuestionStats', (msg) =>
    {
        Queries.GetLastQuestionStatistics(GetCurrentRoomId()).then( (result) =>
        {
            socket.emit('LastQuestionStats', { stats: result});
        });
    });

    socket.on('CreateRoom', (msg) =>
    {
        Queries.CreateRoom(msg.roomId, msg.quizId).then( (result) =>
        {
            if ( result === true)
            {
                SetCurrentRoomId(msg.roomId);
                socket.emit('LoadStartQuizPage', {});
            }
            else
            {
                socket.emit('Error', {message: "Room ID already exists"});
            }
        });
    });

    socket.on('StopQuestionTime', (msg) =>
    {
        Queries.GetLastQuestionId(GetCurrentRoomId()).then( (result) =>
      {
          Queries.StopQuestionTime(result).then( (result2) =>
          {
              socket.emit('QuestionStopped', {question: result });
          });
      })
    });

    socket.on('StartQuiz', (msg) =>
    {
        Queries.CreateQuestionInstance(GetCurrentRoomId()).then( (result) =>
        {
            socket.emit('LoadShowQuestionPage', {question: result });
        });
    });

    socket.on('GetCurrentQuestion', (msg) =>
    {
        Queries.GetQuestionInstance(GetCurrentRoomId()).then( (result) =>
        {
            socket.emit('CurrentQuestion', {question: result });
        });
    });

    socket.on('GetCurrentRanking', (msg) =>
    {
        Queries.GetCurrentRanking(GetCurrentUserInstanceId()).then( (result) =>
        {
            socket.emit('CurrentRanking', {place: result });
        });
    });

    socket.on('CreateUserInstance', (msg) =>
    {
        Queries.CreateUserInstance(GetCurrentRoomId(), msg.nickname).then( (result) =>
        {
            SetCurrentUserInstanceId(result);
            socket.emit('LoadWaintForGamePage', { roomId: GetCurrentRoomId() });
        });
    });

    socket.on('QuestionsRemaining', (msg) =>
    {
        Queries.GetRemainingQuestionCount(GetCurrentRoomId()).then( (result) =>
        {
            socket.emit('LoadWaintForGamePage', { amount: result });
        });
    });

    socket.on('CurrentlyConnectedUsers', (msg) =>
    {
        Queries.GetConnectedUsers(GetCurrentRoomId()).then( (result) =>
        {
            socket.emit('CurrentlyConnectedUsers', { Users: result });
        });
    });

    socket.on('LogOut', (msg) =>
    {
        LogOutUser();
        socket.emit('LoggedOutSuccessfully', {  });
    });

    socket.on('IsLoggedIn', (msg) =>
    {
        socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
    });

    socket.on('LogIn', (msg) =>
    {
        Queries.DoesAccountExist(msg.ID, msg.PSW).then( (result) =>
        {
            if (result === true)
            {
                LogInUser(msg.ID);
            }
            socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
        });
    });

    socket.on('CanEditQuizzes', (msg) =>
    {
        if (IsUserLoggedIn() === true)
        {
          Queries.CanEditQuizzes(GetLoggedUserId()).then( (result) =>
          {
              if (result === true)
              {
                  socket.emit('EditQuizzesStatus', { status: true });
              }
          });
        }
        else
        {
            socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
        }
    });

    socket.on('GetAllQuizzes', (msg) =>
    {
        if (IsUserLoggedIn() === true)
        {
            Queries.GetAllQuizzes(GetLoggedUserId()).then( (result) =>
            {
                socket.emit('QuizList', { quizList: result });
            });
        }
    });

    socket.on('AskForQuiz', (msg) =>
    {
        Queries.GetQuizInfo(msg.Id).then( (result) =>
        {
            socket.emit('QuizInfo', { quizInfo: result });
        });
    });

    socket.on('CreateQuiz', (msg) =>
    {
        Queries.CreateEmptyQuiz(GetLoggedUserId()).then( (result) =>
        {
            socket.emit('QuizCreated', { Id: result });
        });
    });

    socket.on('DeleteQuiz', (msg) =>
    {
        Queries.DeleteQuiz(msg.Id).then( (result) =>
        {
            socket.emit('QuizDeleted', { });
        });
    });

    socket.on('AskForAnswer', (msg) =>
    {
        Queries.GetCurrentQuestion(GetRoomId()).then( (result) =>
        {
            Queries.GetCorrectAnswer(result.Id).then( (result2) =>
            {
                socket.emit('CorrectAnswer', { answer: result2 });
            });
        });
    });

    socket.on('UpdateQuiz', (msg) =>
    {
        Queries.UpdateQuiz(msg.Id,msg.name, msg.isAnonymous).then( (result) =>
        {
            socket.emit('QuizUpdated', { });
        });
    });

    // For testing purposes
    socket.on('TestFunction', (msg) =>
    {
      /*
      Queries.AddQuestion('testQ', 'whatisTest', 20, 'quizId', 1, [{answer: 'dunno', answerIsTrue: false}, {answer: 'yukno', answerIsTrue: true} ]).then( (result) =>
      {
          console.log(result);
      });

      Queries.EditQuestion(Id, 'newTitle', 'lalala', 15).then( (result) =>
      {
          console.log(result);
      });

      Queries.UpdateQuiz().then( (result) =>
      {
          console.log(result);
      });

      Queries.UpdateQuiz().then( (result) =>
      {
          console.log(result);
      });

      Queries.UpdateQuiz().then( (result) =>
      {
          console.log(result);
      });

      Queries.UpdateQuiz().then( (result) =>
      {
          console.log(result);
      });
*/























    });

});

function SetCurrentRoomId(Id)
{
    // TO DO set user's roomID
}

function GetCurrentRoomId()
{
    // TO DO get user's roomID
    return "M9SKLBS";
}

function SetCurrentUserInstanceId(Id)
{
    // TO DO set userinstancesId
}

function GetCurrentUserInstanceId()
{
    // TO DO get UserinstancesID
    return 5;
}

function IsUserLoggedIn()
{
    // TO DO check if user logged in
    return true;
}

function LogInUser(Id)
{
    // log in user
}

function LogOutUser()
{
    // log out user
}

function GetLoggedUserId()
{
    return 11;
}

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port)
});
