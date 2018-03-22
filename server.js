// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config();

const { Client } = require('pg');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
const Queries = require('./queries.js');

var exphbs = require('express-handlebars');

const schema = process.env.DB_SCHEMA;
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set handlebars as view engine
app.engine(
  'handlebars',
  exphbs({
    defaultLayout: 'main',
    helpers: {
      raw: options => options.fn(this)
    }
  })
);
app.set('view engine', 'handlebars');

// other static files are served from the public folder
app.use(express.static(path.join(__dirname, '/public')));

const session = require('express-session')({
  secret: 'my-secret',
  resave: true,
  saveUninitialized: true
});
const sharedsession = require('express-socket.io-session');

// use sessions for express
app.use(session);

// Share session with io sockets
io.use(sharedsession(session));

// connect to the PostgreSQL server
const dbclient = new Client({
  connectionString: process.env.DB_URI,
  ssl: { rejectUnauthorized: true }
});
dbclient.connect();
Queries.SetDbClient(dbclient);

// listen on all watchers
const query = dbclient.query('LISTEN watchers');

// when a notification comes up show in console
dbclient.on('notification', msg => {
  console.log('notification from db', msg.payload);
  io.emit('message', msg.payload);
});

// always pass current user to templates
app.use(function(req, res, next) {
  // set session user as locals,
  // it get's used in views/layouts/main.handlebars
  res.locals.user = req.session.user;
  next();
});
// middleware function for authentication-only pages
const isAuthenticated = (req, res, next) => {
  // check if user is logged in
  if (req.session.user) return next();

  // if not show login, and save path
  res.render('login', {
    hideUser: true,
    redirectTo: req.path
  });
};

// when we get a request on / send the index.html page
app.get('/', (req, res) => {
  if (req.session.room) {
    res.render('room', {
      roomid: req.session.room
    });
  } else {
    res.render('enterroom');
  }
});

app.get('/login', (req, res) => {
  res.render('login', { hideUser: true });
});
app.post('/login', (req, res) => {
  if (req.body.username && req.body.username.length > 0) {
    req.session.user = req.body.username;

    // if we're coming from an other page, redirect
    if (req.body.redirectTo) res.redirect(req.body.redirectTo);
    else res.redirect('/');
  } else {
    res.render('login', {
      hideUser: true,
      message: 'invalid login'
    });
  }
});
// logout the user
app.get('/logout', (req, res) => {
  // destroy session, and when done redirect
  req.session.destroy(() => res.redirect('/'));
});

app.post('/enterroom', (req, res) => {
  const roomid = req.body.roomid;
  Queries.IsRoomActive(roomid).then(isActive => {
    if (isActive) {
      req.session.room = roomid;
      if (req.body.displayName) {
        const displayName = req.body.displayName;
        Queries.CreateUserInstance(roomid, displayName).then(userInstanceId => {
          req.session.userInstanceId = userInstanceId;
          io.emit('room-' + roomid, displayName);
          res.redirect('/');
        });
      } else {
        res.render('setdisplayname', {
          roomid: roomid
        });
      }
    } else {
      res.redirect('/');
    }
  });
});
app.post('/leave', (req, res) => {
  req.session.room = false;
  res.redirect('/');
});

app.get('/manage', isAuthenticated, (req, res) => {
  Queries.GetAllQuizzes(req.session.user).then(r => {
    var sessionmessage = req.session.managequizeserror;
    req.session.managequizeserror = '';
    res.render('managequizes', {
      quizes: r.rows,
      message: sessionmessage
    });
  });
});
app.get('/create', isAuthenticated, (req, res) => {
  res.render('editquiz', {});
});
app.post('/edit', isAuthenticated, (req, res) => {
  const quiz = JSON.parse(req.body.data);
  Queries.CreateQuiz(quiz.title, !!quiz.IsAnonymous, req.session.user).then(
    quizId => {
      quiz.question.forEach((question, index) => {
        Queries.AddQuestion(
          question.Title,
          question.Content,
          question.Time,
          quizId,
          index,
          [
            {
              answer: question.AnswerA,
              answerIsTrue: !!question.AnswerAIsValid
            },
            {
              answer: question.AnswerB,
              answerIsTrue: !!question.AnswerBIsValid
            },
            {
              answer: question.AnswerC,
              answerIsTrue: !!question.AnswerCIsValid
            },
            {
              answer: question.AnswerD,
              answerIsTrue: !!question.AnswerDIsValid
            }
          ].filter(a => a.answer && a.answer.length > 0)
        );
      });
    }
  );
  res.redirect('/manage');
});

app.post('/quiz', isAuthenticated, (req, res) => {
  if (typeof req.body.selectedquiz === 'undefined') {
    req.session.managequizeserror = 'please select a quiz';
    return res.redirect('manage');
  }

  if (req.body.roomid == '') {
    req.session.managequizeserror = 'please enter a room id';
    return res.redirect('manage');
  }

  Queries.UserHasQuiz(req.session.user, req.body.selectedquiz).then(r => {
    if (!r) {
      req.session.managequizeserror = 'User cannot post this query!';
      return res.redirect('manage');
    }
    Queries.CreateRoom(req.body.roomid, req.body.selectedquiz).then(r => {
      if (!r) {
        req.session.managequizeserror = 'Try different room name';
        return res.redirect('manage');
      }
      req.session.room = req.body.roomid;
      return res.redirect('/quiz/' + req.body.roomid);
    });
  });
});
app.get('/quiz/:roomId', isAuthenticated, (req, res) => {
  const roomId = req.params.roomId;
  return res.render('roomstart', {
    roomid: roomId
  });
});

// when a new client connects to the socket
io.on('connection', socket => {
  // user is logged in
  const roomid = socket.handshake.session.room;
  // user is logged in, in room socket.handshake.session.room
  const userid = socket.handshake.session.user;
  // user instance id
  const userInstanceId = socket.handshake.session.userInstanceId;

  if (userInstanceId) {
    Queries.GetConnectedUsers(roomid).then(connectedUsers => {
      socket.emit('connectedUsers', connectedUsers);
    });
  }

  socket.on('select', answer => {
    // when a user selects an answer
    const query = dbclient.query(
      `insert into "${schema}"."AnswerInstance" ("QuestionInstanceId", "AnswerId", "UserInstanceId") values ($1, $2, $3)`,
      [answer.QuestionInstanceId, answer.AnswerId, userInstanceId]
    );
  });

  socket.on('message', msg => {
    const query = dbclient.query('insert into foo (name) values ($1)', [msg]);
  });

  socket.on('addQuestion', msg => {
    let response = Queries.AddQuestion(
      msg.title,
      msg.question,
      msg.time,
      msg.quizId,
      msg.orderId,
      [
        { answer: msg.answer1, answerIsTrue: msg.answer1IsTrue },
        { answer: msg.answer2, answerIsTrue: msg.answer2IsTrue },
        { answer: msg.answer3, answerIsTrue: msg.answer3IsTrue },
        { answer: msg.answer4, answerIsTrue: msg.answer4IsTrue }
      ]
    );
  });

  socket.on('editQuestion', msg => {
    let response = Queries.EditQuestion(
      msg.Id,
      msg.title,
      msg.question,
      msg.time
    );
  });

  socket.on('editAnswer', msg => {
    let response = Queries.EditAnswer(
      msg.Id,
      msg.title,
      msg.answer,
      msg.answerIsTrue
    );
  });

  socket.on('deleteAnswer', msg => {
    let response = Queries.DeleteAnswer(msg.Id);
  });

  socket.on('addAnswer', msg => {
    let response = Queries.AddAnswer(msg.Id, msg.answer, msg.answerIsTrue);
  });

  socket.on('JoinRoom', msg => {
    Queries.IsRoomActive(msg.Id).then(result => {
      if (result === true) {
        SetCurrentRoomId(msg.Id);
        Queries.IsRoomAnonymous(msg.Id).then(result2 => {
          if (result2 === true) {
            socket.emit('LoadEnterNamePage', { roomId: GetCurrentRoomId() });
          } else {
            if (IsUserLoggedIn() === true) {
              socket.emit('LoadEnterNamePage', { roomId: GetCurrentRoomId() });
            } else {
              socket.emit('LoadLogInPage', {});
            }
          }
        });
      }
    });
  });

  socket.on('GetRoomId', msg => {
    socket.emit('CurrentRoomId', { roomId: GetCurrentRoomId() });
  });

  socket.on('GetRoomResults', msg => {
    Queries.GetRoomResults(GetCurrentRoomId()).then(result => {
      socket.emit('RoomResults', {
        userinstancesId: GetCurrentUserInstanceId(),
        results: result
      });
    });
  });

  socket.on('GetLastQuestionStats', msg => {
    Queries.GetLastQuestionStatistics(roomid).then(result => {
      socket.emit('LastQuestionStats', { stats: result.rows });
    });
  });

  socket.on('CreateRoom', msg => {
    Queries.CreateRoom(msg.roomId, msg.quizId).then(result => {
      if (result === true) {
        SetCurrentRoomId(msg.roomId);
        socket.emit('LoadStartQuizPage', {});
      } else {
        socket.emit('Error', { message: 'Room ID already exists' });
      }
    });
  });

  socket.on('StopQuestionTime', msg => {
    Queries.GetLastQuestionId(GetCurrentRoomId()).then(result => {
      Queries.StopQuestionTime(result).then(result2 => {
        socket.emit('QuestionStopped', { question: result });
      });
    });
  });

  socket.on('StartQuiz', msg => {
    Queries.CreateQuestionInstance(roomid).then(result => {
      Queries.GetCurrentAnswers(roomid).then(questionInstance => {
        const questionInstanceId = questionInstance[0].QuestionInstanceId
        Queries.GetCorrectAnswers(questionInstanceId).then(correct => {
          socket.emit('correct', correct.rows);
        })
        io.emit('room-' + roomid + '-questions', questionInstance);
        socket.emit('time', questionInstance[0].endtime)
      })
      Queries.GetLastQuestionInstance(roomid).then(result => {
        socket.emit('question', result);
      })
    });
  });

  socket.on('GetCurrentQuestion', msg => {
    Queries.GetQuestionInstance(GetCurrentRoomId()).then(result => {
      socket.emit('CurrentQuestion', { question: result });
    });
  });

  socket.on('GetCurrentRanking', msg => {
    Queries.GetCurrentRanking(GetCurrentUserInstanceId()).then(result => {
      socket.emit('CurrentRanking', { place: result });
    });
  });

  socket.on('CreateUserInstance', msg => {
    Queries.CreateUserInstance(GetCurrentRoomId(), msg.nickname).then(
      result => {
        SetCurrentUserInstanceId(result);
        socket.emit('LoadWaintForGamePage', { roomId: GetCurrentRoomId() });
      }
    );
  });

  socket.on('QuestionsRemaining', msg => {
    Queries.GetRemainingQuestionCount(GetCurrentRoomId()).then(result => {
      socket.emit('LoadWaintForGamePage', { amount: result });
    });
  });

  socket.on('CurrentlyConnectedUsers', msg => {
    Queries.GetConnectedUsers(GetCurrentRoomId()).then(result => {
      socket.emit('CurrentlyConnectedUsers', { Users: result });
    });
  });

  socket.on('LogOut', msg => {
    LogOutUser();
    socket.emit('LoggedOutSuccessfully', {});
  });

  socket.on('IsLoggedIn', msg => {
    socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
  });

  socket.on('LogIn', msg => {
    Queries.DoesAccountExist(msg.ID, msg.PSW).then(result => {
      if (result === true) {
        LogInUser(msg.ID);
      }
      socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
    });
  });

  socket.on('CanEditQuizzes', msg => {
    if (IsUserLoggedIn() === true) {
      Queries.CanEditQuizzes(GetLoggedUserId()).then(result => {
        if (result === true) {
          socket.emit('EditQuizzesStatus', { status: true });
        }
      });
    } else {
      socket.emit('LoggedStatus', { status: IsUserLoggedIn() });
    }
  });

  socket.on('GetAllQuizzes', msg => {
    if (IsUserLoggedIn() === true) {
      Queries.GetAllQuizzes(GetLoggedUserId()).then(result => {
        socket.emit('QuizList', { quizList: result });
      });
    }
  });

  socket.on('AskForQuiz', msg => {
    Queries.GetQuizInfo(msg.Id).then(result => {
      socket.emit('QuizInfo', { quizInfo: result });
    });
  });

  socket.on('CreateQuiz', msg => {
    Queries.CreateEmptyQuiz(GetLoggedUserId()).then(result => {
      socket.emit('QuizCreated', { Id: result });
    });
  });

  socket.on('DeleteQuiz', msg => {
    Queries.DeleteQuiz(msg.Id).then(result => {
      socket.emit('QuizDeleted', {});
    });
  });

  socket.on('AskForAnswer', msg => {
    Queries.GetCurrentQuestion(roomid).then(result => {
      Queries.GetCorrectAnswer(result.Id).then(result2 => {
        socket.emit('CorrectAnswer', { answer: result2 });
      });
    });
  });

  socket.on('UpdateQuiz', msg => {
    Queries.UpdateQuiz(msg.Id, msg.name, msg.isAnonymous).then(result => {
      socket.emit('QuizUpdated', {});
    });
  });
});

function SetCurrentRoomId(Id) {
  // TO DO set user's roomID
}

function GetCurrentRoomId() {
  // TO DO get user's roomID
  return 'M9SKLBS';
}

function SetCurrentUserInstanceId(Id) {
  // TO DO set userinstancesId
}

function GetCurrentUserInstanceId() {
  // TO DO get UserinstancesID
  return 5;
}

function IsUserLoggedIn() {
  // TO DO check if user logged in
  return true;
}

function LogInUser(Id) {
  // log in user
}

function LogOutUser() {
  // log out user
}

function GetLoggedUserId() {
  return 11;
}

// listen on the port, by default 3000
http.listen(port, () => {
  console.log('listening on *:' + port);
});
