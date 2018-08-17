(function() {
  require('dotenv').config();

  let dbclient;

  //Exports
  module.exports = {
    SetDbClient: function(client) {
      dbclient = client;
    },

    GetUserByEmail: async (email) => {
      var sql = `SELECT "Id", "CanCreateQuiz" FROM "User" WHERE email = '${email}'`;
        dbclient.query(sql, function(err, results) {
          if (err) throw err;
          return results.rows[0];
        });
    },

    GetUserByLoginHash:function(loginHash,callback) {
      var sql = "SELECT Id, CanCreateQuiz FROM User WHERE loginHash = ?";
      return  dbclient.query(sql,[loginHash], callback);
    },
    AddUser: async (Id, email, canCreateQuiz, username, loginHash) => {
      var sql = `INSERT INTO "User" ("Id", "email", "CanCreateQuiz", "loginHash") VALUES ('${Id}', '${email}', '${canCreateQuiz}', '${loginHash}')`;
        dbclient.query(sql, function(err, results) {
          if (err) throw err;
          return results.rows[0];
        });

    },
    EditUserLoginHash: async (email, loginHash) => {
      var sql = `UPDATE "User" SET "loginHash" = '${loginHash}' WHERE "email" = '${email}' `;
        dbclient.query(sql, function(err, results) {
          if (err) throw err;
          return results.rows[0];
        });
    },
    AddQuestion: async function(
      title,
      question,
      time,
      quizId,
      orderNr,
      questionArray
    ) {
      return dbclient.query('BEGIN').then(async () => {
        return dbclient
          .query(
            `INSERT INTO "Question"("Title", "Content", "Time") VALUES ($1, $2, $3) RETURNING "Id"`,
            [title, question, time]
          )
          .then(async res => {
            for (var i = 0; i < questionArray.length; i++) {
              await dbclient
                .query(
                  `INSERT INTO "Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                  [
                    res.rows[0].Id,
                    questionArray[i].answer,
                    questionArray[i].answerIsTrue
                  ]
                )
                .catch(e => {
                  console.error(e.stack);
                });
            }

            return dbclient
              .query(
                `INSERT INTO "QuizQuestion"("QuestionId", "QuizId", "OrderNr") VALUES ($1, $2, $3) RETURNING "OrderNr"`,
                [res.rows[0].Id, quizId, orderNr]
              )
              .then(result => {
                dbclient.query('COMMIT').catch(e => {
                  console.error(e.stack);
                });
                return res.rows[0].Id;
              });
          });
      });
    },

    EditQuestion: async function(Id, title, question, time) {
      return dbclient
        .query(
          `UPDATE "Question" SET "Title"=$1, "Content"=$2, "Time"=$3 WHERE "Id"=$4`,
          [title, question, time, Id]
        )
        .then(res => {
          return true;
        });
    },

    EditAnswer: async function(Id, answer, answerIsTrue) {
      return dbclient
        .query(
          `UPDATE "Answer" SET "Content"=$1, "IsCorrect"=$2 WHERE "Id"=$3`,
          [answer, answerIsTrue, Id]
        )
        .then(res => {
          return true;
        });
    },

    DeleteAnswer: async function(Id) {
      return dbclient
        .query(`DELETE FROM "Answer" WHERE "Id"=$1`, [Id])
        .catch(e => {
          console.error(e.stack);
        })
        .then(res => {
          return true;
        });
    },

    AddAnswer: async function(Id, answer, answerIsTrue) {
      return dbclient
        .query(`SELECT * FROM "Answer" WHERE "QuestionId"=$1`, [Id])
        .then(res => {
          if (res.rows.length < 4) {
            return dbclient
              .query(
                `INSERT INTO "Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3) RETURNING "Id"`,
                [Id, answer, answerIsTrue]
              )
              .then(result => {
                return result.rows[0].Id;
              });
          }
        });
    },

    IsRoomActive: async function(Id) {
      return dbclient
        .query(
          `SELECT subq1.expected > subq2.ended OR (subq2 IS NULL AND subq1.expected > 0) OR subq1 IS NULL as active
                                         FROM (SELECT rm."Id" as roomid, count(*) as expected
                                       	 FROM "Room" as rm,
                                      	 "QuizQuestion" as qq
                                      	 WHERE rm."QuizId" = qq."QuizId"
                                      	 GROUP BY rm."Id") AS subq1
                                      	 LEFT JOIN (SELECT ended."RoomId" as roomid, sum(ended.count) AS ended
                                      	 FROM room_ended_questions AS ended
                                      	 GROUP BY ended."RoomId") AS subq2 ON subq2.roomid = subq1.roomid
                                      	 WHERE subq1.roomid = $1`,
          [Id]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].active !== 'undefined' &&
            res.rows[0].active === true
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    IsRoomAnonymous: async function(Id) {
      return dbclient
        .query(
          `SELECT "quiz"."IsAnonymous" as "anonymous"
                          	FROM "Room" AS "room",
                          	"Quiz" AS "quiz"
                          	WHERE "room"."QuizId" = "quiz"."Id"
                          	AND "room"."Id" = $1`,
          [Id]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].anonymous !== 'undefined' &&
            res.rows[0].anonymous === true
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    GetRoomResults: async function(Id) {
      return dbclient
        .query(
          `SELECT userid, display, score FROM user_scores WHERE roomid = $1`,
          [Id]
        )
        .then(res => {
          return res.rows;
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    RoomExists: async function(Id) {
      return dbclient
        .query(
          `SELECT room."Id" IS NOT NULL AS exists FROM "Room" AS room WHERE room."Id" = $1`,
          [Id]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].exists !== 'undefined' &&
            res.rows[0].exists === true
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    QuizExists: async function(Id) {
      return dbclient
        .query(
          `SELECT quiz."Id" IS NOT NULL AS exists FROM "Quiz" AS quiz WHERE quiz."Id" = $1`,
          [Id]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].exists !== 'undefined' &&
            res.rows[0].exists === true
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    CreateRoom: async function(roomId, quizId) {
      return module.exports.RoomExists(roomId).then(result => {
        return module.exports.QuizExists(quizId).then(result2 => {
          if (result === false && result2 === true) {
            dbclient
              .query(
                `INSERT INTO "Room"( "Id", "QuizId") VALUES ($1, $2)`,
                [roomId, quizId]
              )
              .catch(e => {
                console.error(e.stack);
              });
            return true;
          } else {
            return false;
          }
        });
      });
    },

    CreateQuestionInstance: async function(
      roomId // Check
    ) {
      return dbclient
        .query(
          `WITH nextq AS (SELECT room."Id" as room_id, qq."QuestionId" AS next_question_id
                                	 FROM "Room" AS room
                                	 ,"QuizQuestion" AS qq
                                	 WHERE room."Id" = $1
                                	 AND room."QuizId" = qq."QuizId"
                                 	ORDER BY qq."OrderNr" ASC
                                 	LIMIT 1 OFFSET (SELECT COALESCE(SUM(req."count"), 0)
                                	FROM "Room" AS rm
                                	LEFT JOIN room_ended_questions AS req ON rm."Id" = req."RoomId"
                                	WHERE rm."Id" = $1
                                	GROUP BY rm."Id"))
                                  INSERT INTO "QuestionInstance" ("QuestionId", "TimeStamp", "RoomId", "Duration")
                                	SELECT next_question_id, now(), room_id, NULL
                                	FROM nextq RETURNING "Id"`,
          [roomId]
        )
        .then(res => {
          if (res.rows === undefined || res.rows.length == 0)
          {
            return (-1);
          }
          else
          {
            return res.rows[0].Id;
          }
        });
    },

    GetLastQuestionInstance: async function(roomId) {
      return module.exports.GetLastQuestionId(roomId).then(questionId => {
        return dbclient
          .query(
            `SELECT question."Content" AS question,  answer."Content" AS answer, answer."Id" as answerid
                                   	 FROM "QuestionInstance" AS qi,
                                   	 "Question" AS question,
                                  	 "Answer" AS answer
                                  	 WHERE qi."Id" = $1
                                  	 AND qi."QuestionId" = question."Id"
                                  	 AND answer."QuestionId" = qi."QuestionId"`,
            [questionId]
          )
          .then(res => {
            return res.rows;
          });
      });
    },

    GetLastQuestionId: async function(roomId) {
      return dbclient
        .query(
          `SELECT "Id" AS last_question_id
                                  FROM "QuestionInstance"
                                  WHERE "RoomId" = $1
                                  ORDER BY "TimeStamp" DESC
                                  FETCH FIRST ROW ONLY`,
          [roomId]
        )
        .then(res => {
          return res.rows[0].last_question_id;
        });
    },

    StopQuestionTime: async function(questionInstanceId) {
      dbclient
        .query(
          `UPDATE "QuestionInstance" SET "Duration"=1 WHERE "Id"=$1`,
          [questionInstanceId]
        )
        .then(res => {
          return true;
        });
    },

    GetPlayerRanking: async function(Id) {
      return dbclient
        .query(
          `SELECT COALESCE(COUNT(*) + 1,1) AS place
                            FROM "UserInstance" AS useri,
                            (SELECT uinst."Id" AS userid, scores.display, scores.score
                            FROM user_scores AS scores,
                            "UserInstance" AS uinst
                            WHERE scores.roomid = uinst."RoomId") AS room_scores,
                            user_scores AS user_score
                            WHERE room_scores.userid = useri."Id"
                            AND user_score.userid = useri."Id"
                            AND room_scores.score > user_score.score
                            AND useri."Id" = $1`,
          [Id]
        )
        .then(res => {
          return res.rows[0].place;
        });
    },

    CreateUserInstance: async function(roomId, nickname) {
      return dbclient
        .query(
          `INSERT INTO "UserInstance"( "DisplayName", "RoomId") VALUES ($1, $2) RETURNING "Id"`,
          [nickname, roomId]
        )
        .then(res => {
          return res.rows[0].Id;
        });
    },

    CreateUserInstanceWithId: async function(roomId, nickname, Id) {
      return dbclient
        .query(
          `INSERT INTO "UserInstance"( "DisplayName", "UserId", "RoomId") VALUES ($1, $2, $3) RETURNING "Id"`,
          [nickname, Id, roomId]
        )
        .then(res => {
          return res.rows[0].Id;
        });
    },

    GetRemainingQuestionCount: async function(roomId) {
      return dbclient
        .query(
          `SELECT ecount - ccount AS remaining
                            FROM
                            (SELECT COALESCE(COUNT(*), 0) as ccount
                            FROM "QuestionInstance" AS qi
                            WHERE qi."RoomId" = $1
                            GROUP BY qi."RoomId") AS created,
                            (SELECT COALESCE(COUNT(*), 0) as ecount
                            FROM "QuizQuestion" AS qq,
                            "Room" AS room
                            WHERE room."Id" = $1
                            AND room."QuizId" = qq."QuizId") AS expected`,
          [roomId]
        )
        .then(res => {
          return res.rows[0].remaining;
        });
    },

    GetLastQuestionStatistics: async function(roomId) {
      return module.exports.GetLastQuestionId(roomId).then(res => {
        return dbclient
          .query(
            `SELECT answer."Id" AS answer_id, COALESCE(votes.count, 0) AS answer_count
                                       FROM "QuestionInstance" AS qi,
                                       "Answer" AS answer
                                       LEFT JOIN 	(	SELECT count(*) as count, "QuestionInstanceId" AS qiid, "AnswerId" AS ansid
                                       FROM "AnswerInstance"
                                       GROUP BY "QuestionInstanceId", "AnswerId"
                                       ) AS votes ON votes.ansid = answer."Id"
                                       WHERE qi."QuestionId" = answer."QuestionId"
                                       AND COALESCE(votes.qiid, qi."Id") = qi."Id"
                                       AND qi."Id" = $1`,
            [res]
          )
          .then(res2 => {
            return res2;
          });
      });
    },

    GetConnectedUsers: async function(roomId) {
      return dbclient
        .query(
          `SELECT "Id" as id, "DisplayName" as display FROM "UserInstance" WHERE "UserInstance"."RoomId" = $1`,
          [roomId]
        )
        .then(res => {
          return res.rows;
        });
    },

    GetCurrentAnswers: async (roomId) => {
      return dbclient.query(
        `select
        questioninstanceid "QuestionInstanceId",
        a."Id" "AnswerId",
        a."Content" "Answer",
        aqpr.endtime
        from active_questions_per_room aqpr
        inner join "QuestionInstance" qi
        on (qi."Id" = aqpr.questioninstanceid)
        inner join "Answer" a
        on (qi."QuestionId" = a."QuestionId")
        where aqpr."RoomId" = $1`,
        [roomId]).then(res => {
          const currentAnswers = res.rows;
          if (currentAnswers.length > 0) {
            // and send them to the user if there are any
            return currentAnswers;
          }
        }
      );
    },

    GetAllQuizzes: async function(userId) {
      return dbclient
        .query(
          `SELECT "Id", "Name", "IsAnonymous" FROM "Quiz" WHERE "Quiz"."OwnerUserId" = $1`,
          [userId]
        )
        .then(res => {
          return res;
        });
    },

    GetQuizInfo: async function(quizId) {
      return dbclient
        .query(
          `SELECT "Name" as name, "IsAnonymous" AS anonimity FROM "Quiz" WHERE "Id" = $1`,
          [quizId]
        )
        .then(res => {
          return res;
        });
    },

    GetQuizQuestions: async function(quizId) {
      return dbclient
        .query(
          `SELECT q."Id" AS id, q."Title" AS title, q."Content" AS content, qq."OrderNr" as order,
                                  q."Time" AS time FROM "QuizQuestion" AS qq,
                                  "Question" AS q
                                  WHERE qq."QuizId" = $1
                                  AND qq."QuestionId" = q."Id"
                                  GROUP BY q."Id", q."Title", q."Content", q."Time", qq."OrderNr"`,
          [quizId]
        )
        .then(res => {
          return res;
        });
    },

    GetQuizAnswers: async function(questionId) {
      return dbclient
        .query(
          `SELECT a."Id" AS id, a."QuestionId" as question, a."Content" as content, a."IsCorrect" as correct
                                   FROM "Answer" AS a,
                                   "QuizQuestion" AS qq
                                   WHERE qq."QuizId" = $1
                                   AND qq."QuestionId" = a."QuestionId"
                                   GROUP BY a."Id", a."QuestionId", a."Content", a."IsCorrect"`,
          [questionId]
        )
        .then(res => {
          return res;
        });
    },

    CreateEmptyQuiz: async function(userId) {
      return dbclient
        .query(
          `INSERT INTO "Quiz"("OwnerUserId")
                                   VALUES ($1)
                                   RETURNING "Id"`,
          [userId]
        )
        .then(res => {
          return res.rows[0].Id;
        });
    },

    CreateQuiz: async function(name, isAnonymous, userId) {
      return dbclient
        .query(
          `INSERT INTO "Quiz"("Name", "IsAnonymous", "OwnerUserId")
                                   VALUES ($1, $2, $3)
                                   RETURNING "Id"`,
          [name, isAnonymous, userId]
        )
        .then(res => {
          return res.rows[0].Id;
        });
    },

    DeleteQuiz: async function(Id) {
      return dbclient
        .query(
          `DELETE FROM "Quiz"
	                                 WHERE "Id" = $1`,
          [Id]
        )
        .then(res => {
          return true;
        });
    },

    UpdateQuiz: async function(Id, name, isAnonymous) {
      return dbclient
        .query(
          `UPDATE "Quiz"
                                   SET "Name"=$2, "IsAnonymous"=$3
                                   WHERE "Id"=$1`,
          [Id, name, isAnonymous]
        )
        .then(res => {
          return true;
        });
    },

    GetCorrectAnswers: async function(questionInstanceId) {
      return dbclient
        .query(
          `SELECT answer."Id" AS answer_id, answer."Content" AS content
                                   FROM "QuestionInstance" as qiid,
                                   "Answer" as answer
                                   WHERE qiid."QuestionId" = answer."QuestionId"
                                   AND answer."IsCorrect" = true
                                   AND qiid."Id" = $1`,
          [questionInstanceId]
        )
        .then(res => {
          return res;
        });
    },

    DeleteUserInstance: async function(userInstanceId) {
      return dbclient
        .query(
          `DELETE FROM "UserInstance"
                                	 WHERE "Id" = $1`,
          [userInstanceId]
        )
        .then(res => {
          return true;
        });
    },

    CreateAnswerInstanceOnActiveQuestion: async function(
      roomId,
      userInstanceId,
      answerId
    ) {
      return dbclient
        .query(
          `INSERT INTO "AnswerInstance"("QuestionInstanceId", "AnswerId", "UserInstanceId")
                                	 SELECT COALESCE(aqpr.qiid,0) , $3 , $1
                                	 FROM "Room" as room,
                                	 (SELECT aqpr."RoomId", aqpr.questioninstanceid as qiid
                                	 FROM active_questions_per_room AS aqpr) AS aqpr
                                	 WHERE room."Id" = $2
                                   AND room."Id" = aqpr."RoomId"
                                	 RETURNING "Id"`,
          [userInstanceId, roomId, answerId]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].Id !== 'undefined'
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    },

    UserHasQuiz: async function(userId, quizId) {
      return dbclient
        .query(
          `SELECT true AS hasquiz
                                   FROM "Quiz"
                                   WHERE "OwnerUserId" = $1
                                   AND "Id" = $2`,
          [userId, quizId]
        )
        .then(res => {
          if (
            typeof res.rows[0] !== 'undefined' &&
            typeof res.rows[0].hasquiz !== 'undefined'
          ) {
            return true;
          } else {
            return false;
          }
        })
        .catch(e => {
          console.error(e.stack);
        });
    }
  };
})();
