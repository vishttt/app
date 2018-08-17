// env will be stored in an .env file, edit it with the correct db credentials
require('dotenv').config();

// Check if debug is set
const DEBUG = process.env.DEBUG ? true : false;

// f you timezone
process.env.TZ = 'Europe/Brussels';

const mysql = require('mysql');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
// get config from env, check .env (or .env.example)
const dbConfig = {
  host:  process.env.DB_MYSQL_HOST,
  user: process.env.DB_MYSQL_USER,
  password: process.env.DB_MYSQL_PASS,
  database: process.env.DB_MYSQL_DB
};
const dbclient = mysql.createConnection(dbConfig);

const Queries = require('./queries0.js');
Queries.SetDbClient(dbclient);

var exphbs = require('express-handlebars');

const port = process.env.PORT || 3000;

const mail = require('./mailer').mail;

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



// seperate router for api
const apiRouter = require('./api');
app.use('/api', apiRouter);

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
  return res.render('login', {
    hideUser: true,
    redirectTo: req.path
  });
};

const canUserCreateQuiz = (req, res, next) => {
  if (req.session.canCreateQuiz) return next();
  // if not show login, and save path
  return res.render('error', {
    hideUser: true,
    message: 'You do not have permission to manage quizes'
  });
};

// when we get a request on / send the index.html page
app.get('/', (req, res) => {
  if (req.session.room && req.session.userEnterQuiz) {
    res.render('room', {
      roomid: req.session.room
    });
  } else {
    res.render('enterroom', {
      canCreateQuiz: req.session.canCreateQuiz
    });
  }
});

app.get('/now', (req, res) => {
    const query = dbclient.query(`select now()`).then((r) => {
      res.send({ serverTime: new Date(), dbTime: r.rows[0].now.toString()});
    });
});

app.get('/login', (req, res) => {
  res.render('login', { hideUser: true });
});
app.get('/login/:loginHash', (req, res) => {
  const loginHash = req.params.loginHash;
  if (loginHash.length < 10) {
    return res.render('login', {
      hideUser: true,
      message: 'invalid login hash'
    });
  }

   Queries.GetUserByLoginHash(loginHash,function(err,rows){

            if(err){
              return res.render('login', {
                hideUser: true,
                message: 'invalid login hash'
              });
            }
            else{
              var r=rows[0];
              if(!r){
                return res.render('login', {
                  hideUser: true,
                  message: 'invalid login hash'
                });
              }
              if (r.CanCreateQuiz) {
                // this user can create and manage quizes
                req.session.canCreateQuiz = true;
              }
              req.session.user = r.Id;
              return res.redirect('/');
            }
        }



   );



});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const userid = email.split('@')[0];
  const domain = email.split('@')[1];

  if (!email || email.length < 4) {
    return res.render('login', {
      hideUser: true,
      message: 'invalid login'
    });
  }

  // in debug mode just login
  if (DEBUG) {
    req.session.user = email.split('@')[0];
    return res.redirect(req.body.redirectTo ? req.body.redirectTo : '/');
  }

  // only allow ucll to login
  if (false) {
    if (domain != 'student.ucll.be' && domain != 'ucll.be') {
      return res.render('login', {
        hideUser: true,
        message: 'please use an ucll email address'
      });
    }
  }

  // create a random login hash
  const loginHash = require('crypto')
    .createHash('md5')
    .update(Math.random().toString())
    .digest('hex');
  Queries.GetUserByEmail(email).then((user) => {
    let updateUserHashPromis;
    if (!user) {
      updateUserHashPromis = Queries.AddUser(userid, email, false, userid, loginHash);
    } else {
      updateUserHashPromis = Queries.EditUserLoginHash(email, loginHash);
    }
    updateUserHashPromis.then((r) => {
      mail(email, 'Login to DrumbleQuiz', `
      Login to drumblequiz using next url:
      ${req.protocol}://${req.get('host')}/login/${loginHash} Raw hash: ${loginHash}
      `, `
      Login to drumblequiz using next url:
      <a href="${req.protocol}://${req.get('host')}/login/${loginHash}">
      ${req.protocol}://${req.get('host')}/login/${loginHash}
      </a>`);
      return res.render('login', {
        hideUser: true,
        message: 'check your email for a login url'
      });
    });
  });
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
        Queries.IsRoomAnonymous(roomid).then(isAnonymous => {
          // For anonymous
          if(req.session.user === undefined && isAnonymous){
            Queries.CreateUserInstance(roomid, displayName).then(userInstanceId => {
              req.session.userEnterQuiz = true;
              req.session.userInstanceId = userInstanceId;
              io.emit('room-' + roomid, displayName);
              res.redirect('/');
            });
          } else if(req.session.user === undefined){
            return res.render('setdisplayname', {
              message: 'Quiz is not anonymous. Please log in'
            });
          } else {
            // Not anonymous
            Queries.CreateUserInstanceWithId(roomid, displayName, req.session.user).then(userInstanceId => {
              req.session.userEnterQuiz = true;
              req.session.userInstanceId = userInstanceId;
              io.emit('room-' + roomid, displayName);
              res.redirect('/');
            });
          }});
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

app.get('/manage', isAuthenticated, canUserCreateQuiz, (req, res) => {
  Queries.GetAllQuizzes(req.session.user).then(r => {
    var sessionmessage = req.session.managequizeserror;
    req.session.managequizeserror = '';
    res.render('managequizes', {
      quizes: r.rows,
      message: sessionmessage
    });
  });
});

function compareScore(a,b) {
  if (b.score < a.score)
    return -1;
  if (b.score > a.score)
    return 1;
  return 0;
}

app.get('/victory', isAuthenticated, (req, res) => {
  Queries.GetRoomResults(req.session.room).then(r => {
    r.sort(compareScore);
    if (r.length > 2)
    {
      res.render('victory', {
        place1: r[0].display,
        score1: r[0].score,
        place2: r[1].display,
        score2: r[1].score,
        place3: r[2].display,
        score3: r[2].score,
      });
    }
    else if (r.length > 1)
    {
      res.render('victory', {
        place1: r[0].display,
        score1: r[0].score,
        place2: r[1].display,
        score2: r[1].score,
        place3: "",
        score3: "",
      });
    }
    else if (r.length > 0)
    {
      res.render('victory', {
        place1: r[0].display,
        score1: r[0].score,
        place2: "",
        score2: "",
        place3: "",
        score3: "",
      });
    }
    else
    {
      res.render('victory', {
        place1: "",
        score1: "",
        place2: "",
        score2: "",
        place3: "",
        score3: "",
      });
    }

  });
});
app.get('/create', isAuthenticated, canUserCreateQuiz, (req, res) => {
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
  console.log('New connection from ' + socket.handshake.address.address + ':' + socket.handshake.address.port);
  // user is logged in
  var roomid = socket.handshake.session.room || "";
  // user is logged in, in room socket.handshake.session.room
  var userid = socket.handshake.session.user || "";
  // user instance id
  var userInstanceId = socket.handshake.session.userInstanceId || "";

  var phone = false;

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
      if (result == (-1))
      {
        socket.emit('showScore');
        io.emit('showFinalScore', {roomId: roomid});
      }
      else
      {
      sleep(1000).then( a => {
          Queries.GetCurrentAnswers(roomid).then(questionInstance => {
            const questionInstanceId = questionInstance[0].QuestionInstanceId;
            Queries.GetCorrectAnswers(questionInstanceId).then(correct => {
              socket.emit('correct', correct.rows);
            });
            io.emit('serverTime', {roomId: roomid, time: new Date()});
            io.emit('room-' + roomid + '-questions', questionInstance);
            io.emit('roomQuestions', {roomId: roomid, qi:questionInstance});
            socket.emit('time', questionInstance[0].endtime);
          });
          Queries.GetLastQuestionInstance(roomid).then(result => {
            socket.emit('question', result);
          });
      });
        }
    });
  });

  socket.on('getCorrectAnswer', qInstId => {
    Queries.GetCorrectAnswers(qInstId).then(correct => {
      socket.emit('correct', correct.rows);
    });
  });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  socket.on('GetCurrentQuestion', msg => {
    Queries.GetQuestionInstance(GetCurrentRoomId()).then(result => {
      socket.emit('CurrentQuestion', { question: result });
    });
  });

  socket.on('GetPlayerRanking', msg => {
    Queries.GetPlayerRanking(userInstanceId).then(result => {
      socket.emit('currentRanking', { place: result });
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

  // Phone functions
  socket.on('phone', () => {
    phone = true;
  });

  socket.on('doesRoomExist', msg => {
    console.log('GOT');
    Queries.RoomExists(msg.roomName).then( result => {
      if (result)
      {
        Queries.IsRoomActive(msg.roomName).then(isActive => {
          if (isActive)
          {
              Queries.IsRoomAnonymous(msg.roomName).then(isAnonymous => {
                  socket.emit('roomExist', {status: "OK", annonymous: isAnonymous, id: msg.roomName});
              });
          }
          else
          {
            socket.emit('roomExist', {status: "inactive", annonymous: false});
          }
        });
      }
      else
      {
        socket.emit('roomExist', {status: "notExists", annonymous: false});
      }
    });
  });

  socket.on("LogInn", msg => {
    Queries.GetUserByLoginHash(msg.hash).then(r => {
        if (r) {
          socket.emit("logInInfo", {success: true, id:r.Id});
        }
        else
        {
          socket.emit("logInInfo", {success: false, id:""});
        }
    });
  });

  socket.on('joinRoom', msg => {
    if (userInstanceId != "")
    {
        Queries.GetConnectedUsers(msg.roomName).then(connectedUsers => {
          if (connectedUsers.indexOf(userInstanceId) > -1)
          {
              socket.emit('roomJoined', {status: true, error: ""});
          }
          else
          {
              Queries.IsRoomActive(msg.roomName).then(isActive => {
                if (isActive)
                {
                    Queries.IsRoomAnonymous(msg.roomName).then(isAnonymous => {
                      if (isAnonymous && msg.userId == "")
                      {
                          Queries.CreateUserInstance(msg.roomName, msg.displayName).then(uInstanceId => {
                            userInstanceId = uInstanceId;
                            io.emit('room-' + msg.roomName, msg.displayName);
                            socket.emit('roomJoined', {status: true, error: ""});
                          });
                      }
                      else if (msg.userId == "")
                      {
                          socket.emit('roomJoined', {status: false, error: "room not annonymous"});
                      }
                      else
                      {
                          Queries.CreateUserInstanceWithId(msg.roomName, msg.displayName, msg.userId).then(uInstanceId => {
                            userInstanceId = uInstanceId;
                            io.emit('room-' + msg.roomName, msg.displayName);
                            socket.emit('roomJoined', {status: true, error: ""});
                          });
                      }
                  });
                }
                else
                {
                    socket.emit('roomJoined', {status: false, error: "room no longer exists"});
                }
              });
          }
        });
    }
    else
    {
        Queries.IsRoomActive(msg.roomName).then(isActive => {
          if (isActive)
          {
              Queries.IsRoomAnonymous(msg.roomName).then(isAnonymous => {
                if (isAnonymous && msg.userId == "")
                {
                    Queries.CreateUserInstance(msg.roomName, msg.displayName).then(uInstanceId => {
                      userInstanceId = uInstanceId;
                      io.emit('room-' + msg.roomName, msg.displayName);
                      socket.emit('roomJoined', {status: true, error: ""});
                    });
                }
                else if (msg.userId == "")
                {
                    socket.emit('roomJoined', {status: false, error: "room not annonymous"});
                }
                else
                {
                    Queries.CreateUserInstanceWithId(msg.roomName, msg.displayName, msg.userId).then(uInstanceId => {
                      userInstanceId = uInstanceId;
                      io.emit('room-' + msg.roomName, msg.displayName);
                      socket.emit('roomJoined', {status: true, error: ""});
                    });
                }
            });
          }
          else
          {
              socket.emit('roomJoined', {status: false, error: "room no longer exists"});
          }
        });
  }
  });

  socket.on('register', msg => {
    const email = msg.email;
    const userid = email.split('@')[0];
    const domain = email.split('@')[1];

    if (!email || email.length < 4) {
        socket.emit('registerResponse', false);
    }
    else
    {
      const loginHash = require('crypto')
        .createHash('md5')
        .update(Math.random().toString())
        .digest('hex');

      Queries.GetUserByEmail(email).then((user) => {
        let updateUserHashPromis;
        if (!user) {
          updateUserHashPromis = Queries.AddUser(userid, email, false, userid, loginHash);
        } else {
          updateUserHashPromis = Queries.EditUserLoginHash(email, loginHash);
        }
        updateUserHashPromis.then((r) => {
          mail(email, 'Login to DrumbleQuiz', `
          Login to drumblequiz using next url:
          http://${process.env.SERVER_IP}/login/${loginHash} Raw hash: ${loginHash}
          `, `
          Login to drumblequiz using next url:
          <a href="http://${process.env.SERVER_IP}/login/${loginHash}">
          http://${process.env.SERVER_IP}/login/${loginHash}
          </a>`);
          socket.emit('registerResponse', true);
        });
      });
    }
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
  console.log('Open at: http://localhost:' + port);
});
