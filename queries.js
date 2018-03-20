(function() {

require('dotenv').config()
const schema = process.env.DB_SCHEMA
let dbclient;

//Exports
    module.exports =
    {
        SetDbClient: function(client)
        {
            dbclient = client;
        },

        AddQuestion: function(title, question, time, answer1, answer1IsTrue, answer2, answer2IsTrue, answer3, answer3IsTrue, answer4, answer4IsTrue)
        {
            let error = false;
            dbclient.query('BEGIN').catch(e =>{ console.error(e.stack); error = true;});
            let questionId;
            if (  title  &&  question  &&  time  )
            {
                dbclient.query(
                    `INSERT INTO "${schema}"."Question"("Title", "Content", "Time") VALUES ($1, $2, $3) RETURNING "Id"`,
                    [title, question, time]).then(res => {
                        if (answer1 && answer1IsTrue != null)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [res.rows[0].Id, answer1, answer1IsTrue]).catch(e => {console.error(e.stack); error = true;});
                        }
                        if ( answer2 && answer2IsTrue != null)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [res.rows[0].Id, answer2, answer2IsTrue]).catch(e => {console.error(e.stack); error = true;});
                        }
                        if (answer3 && answer3IsTrue != null)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [res.rows[0].Id, answer3, answer3IsTrue]).catch(e => {console.error(e.stack); error = true;});
                        }
                        if (answer4 && answer4IsTrue != null)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [res.rows[0].Id, answer4, answer4IsTrue]).catch(e => {console.error(e.stack); error = true;});
                        }
                      }).catch(e => {console.error(e.stack); error = true;});
                // Add question <> quiz relation
            }
            dbclient.query('COMMIT').catch(e => {console.error(e.stack); error = true;});

            if (error)
            {
                return "Something went wrong";
            }
            return "Question successfuly added";
        },

        EditQuestion: function(Id, title, question, time)
        {
              let error = false;
              if ( Id || Id === 0)
              {
                  if (title )
                  {
                      dbclient.query(
                          `UPDATE "${schema}"."Question" SET "Title"=$1 WHERE "Id"=$2`,
                          [title, Id]).catch(e => {console.error(e.stack); error = true;});
                  }
                  if (question)
                  {
                      dbclient.query(
                          `UPDATE "${schema}"."Question" SET "Content"=$1 WHERE "Id"=$2`,
                          [question, Id]).catch(e => {console.error(e.stack); error = true;});
                  }
                  if (time || time === 0)
                  {
                      dbclient.query(
                          `UPDATE "${schema}"."Question" SET "Time"=$1 WHERE "Id"=$2`,
                          [time, Id]).catch(e => {console.error(e.stack); error = true;});
                  }
              }

              if (error)
              {
                  return "Something went wrong";
              }
              return "Question successfuly updated";
        },

        EditAnswer: function(mId, title, answer, answerIsTrue)
        {
            let error = false;

            if (Id || Id === 0)
            {
                if (title)
                {
                    dbclient.query(
                        `UPDATE "${schema}"."Answer" SET "Content"=$1 WHERE "Id"=$2`,
                        [answer, Id]).catch(e => {console.error(e.stack); error = true;});
                }
                if (answerIsTrue != null)
                {
                    dbclient.query(
                        `UPDATE "${schema}"."Answer" SET "IsCorrect"=$1 WHERE "Id"=$2`,
                        [answerIsTrue, Id]).catch(e => {console.error(e.stack); error = true;});
                }
            }

            if (error)
            {
                return "Something went wrong";
            }
            return "Answer successfuly updated";
        },

        DeleteAnswer: function(Id)
        {
            let error = false;

            if (Id || Id === 0)
            {
                dbclient.query(`DELETE FROM "${schema}"."Answer" WHERE "Id"=$1`,
                    [Id]).catch(e => {console.error(e.stack); error = true;});
            }
            if (error)
            {
                return "Something went wrong";
            }
            return "Answer successfuly deleted";
        },

        AddAnswer: async function(Id, answer, answerIsTrue)
        {

            if (Id || Id === 0)
            {
                dbclient.query(`SELECT * FROM "${schema}"."Answer" WHERE "QuestionId"=$1`,
                    [Id]).then(res =>
                    {
                        if (res.rows.length < 4)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [Id, answer4, answerIsTrue]).catch(e => {console.error(e.stack);});
                        }
                    }).catch(e => {console.error(e.stack); error = true;});
            }
        },

        IsRoomActive: async function(Id)
        {
            if ((Id || Id === 0) )
            {
                return await dbclient.query(`SELECT subq1.expected > subq2.ended OR (subq2 IS NULL AND subq1.expected > 0) OR subq1 IS NULL as active
                                             FROM (SELECT rm."Id" as roomid, count(*) as expected
                                           	 FROM "${schema}"."Room" as rm,
                                          	 "${schema}"."QuizQuestion" as qq
                                          	 WHERE rm."QuizId" = qq."QuizId"
                                          	 GROUP BY rm."Id") AS subq1
                                          	 LEFT JOIN (SELECT ended."RoomId" as roomid, sum(ended.count) AS ended
                                          	 FROM "${schema}".room_ended_questions AS ended
                                          	 GROUP BY ended."RoomId") AS subq2 ON subq2.roomid = subq1.roomid
                                          	 WHERE subq1.roomid = $1`,
                                [Id]).then(res => {
                  if (typeof res.rows[0].active !== 'undefined' && res.rows[0].active === true)
                  {
                      return true;
                  }
                  return false;
                }).catch(e => {console.error(e.stack);});
            }
        },

         IsRoomAnonymous: async function(Id)
        {
            if ((Id || Id === 0) )
            {
              return await dbclient.query(`SELECT "quiz"."IsAnonymous" as "anonymous"
                            	FROM "${schema}"."Room" AS "room",
                            	"${schema}"."Quiz" AS "quiz"
                            	WHERE "room"."QuizId" = "quiz"."Id"
                            	AND "room"."Id" = $1`,
                              [Id]).then(res => {
                if (typeof res.rows[0].anonymous !== 'undefined' && res.rows[0].anonymous === true)
                {
                    return true;
                }
                else
                {
                    return false;
                }
              }).catch(e => {console.error(e.stack);});
            }
        },

        GetRoomResults: async function(Id)
        {
            return dbclient.query(`SELECT room_users.userid, room_users.dispn, count (correct) AS score
                            FROM 	(SELECT room."Id" as roomid, useri."Id" as userid, useri."DisplayName" as dispn
                        		FROM
                        		"${schema}"."Room" AS room,
                        		"${schema}"."UserInstance" as useri
                        		WHERE useri."RoomId" = room."Id"
                        		GROUP BY room."Id", useri."Id") room_users

                            LEFT JOIN		(SELECT answi."UserInstanceId" as cuserid
                        		FROM "${schema}"."Answer" as answer
                        		LEFT JOIN "${schema}"."AnswerInstance" as answi ON answi."AnswerId" = answer."Id"
                        		WHERE answi."QuestionInstanceId" IN (SELECT questi."Id" as qiid
                        		FROM "${schema}"."Room" AS roomsbq,
                        		"${schema}"."QuestionInstance" AS questi
                        		WHERE questi."RoomId" = roomsbq."Id"
                        		AND roomsbq."Id" = $1)
                        		AND answer."IsCorrect" = true) as correct
                            ON room_users.userid = correct.cuserid
                            WHERE room_users.roomid = $1
                            GROUP BY room_users.userid, room_users.dispn`,
                          [Id]).then( (res) =>
                        {
                            return res;
                        }).catch(e => {console.error(e.stack);});
        },

        RoomExists : async function(Id)
        {
            return await dbclient.query(`SELECT room."Id" IS NOT NULL AS exists
                                      	 FROM "${schema}"."Room" AS room
                                      	 WHERE room."Id" = $1`,
                                         [Id]).then(res =>
                  {
                    if (typeof res.rows[0].exists !== 'undefined' && res.rows[0].exists === true)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                  }).catch(e => {console.error(e.stack);});
        },

        QuizExists : async function(Id)
        {
            return await dbclient.query(`SELECT quiz."Id" IS NOT NULL AS exists
                                         FROM "${schema}"."Quiz" AS quiz
                                         WHERE quiz."Id" = $1`,
                                         [Id]).then(res =>
                  {
                    if (typeof res.rows[0].exists !== 'undefined' && res.rows[0].exists === true)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                  }).catch(e => {console.error(e.stack);});
        },

        CreateRoom: async function(roomId, quizId)
        {
              return module.exports.RoomExists().then((result) =>
              {
                  module.exports.QuizExists().then((result2) =>
                  {
                      if (result !== true && result2 === true )
                      {
                          dbclient.query(`INSERT INTO "${schema}"."Room"(
                                          "Id", "QuizId")
                                          VALUES ($1, $2)`,
                                          [roomId, quizId])
                                          .catch(e => {console.error(e.stack);});
                          return true;
                      }
                      else
                      {
                          return false;
                      }
                  })
              })
        },

        CreateQuestionInstance: async function(roomId) // Check
        {
            //jquery
            // return question
            return {question: "q", ans1: "1", ans2: "2", ans3: "3", ans4: "4"};
        },

        GetQuestionInstance: async function(roomId)
        {
            //jquery
            // return question
            return {question: "q", ans1: "1", ans2: "2", ans3: "3", ans4: "4"};
        },

        GetLastQuestionId: async function(roomId)
        {
            //jquery
            // return question
            return 5;
        },

        StopQuestionTime: async function(questionInstanceId)
        {
            // qjuery
        },

        GetPlayerRanking: async function(Id)
        {

            //qjuery
            return 2;
        },

        CreateUserInstance: async function(roomId, nickname)
        {
            //query
            // return instance ID
            return 11;
        },

        GetRemainingQuestionCount: async function(roomId)
        {

          //qjuery
          // return question count that haven't been started
          return  2;
        },

        GetLastQuestionStatistics: async function(roomId)
        {
            //qjuery
            // return LastQuestionStats
            return {question: {}, ans1Count: 2, ans2Count: 5, ans3Count: 6, ans4Count: 1,};

        },

        GetConnectedUsers: async function(roomId)
        {
            //qjuery
            // return user listen
            return {users: {}};
        },

        GetAllQuizzes: async function(userId)
        {
          //qjuery
          // return quizzes list
          return {};
        },

        GetQuizInfo: async function(quizId)
        {
            // jquery
            return {};
        },

        CreateQuiz: async function()
        {
            // jquery
            return 3; // return quiz Id
        },

        DeleteQuiz: async function(Id)
        {
            // jquery
            return true; 
        },

        UpdateQuiz: async function(/*... million info*/)
        {
            // jquery
            return true;
        },

        GetCorrectAnswer: async function(questionInstanceId)
        {
            // jquery
            return true; // return correct answer Id, text
        },

    }

})();
