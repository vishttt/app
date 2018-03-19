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

        AddQuestion: function(title, question, time, answer1, answer1IsTrue, answer2, answer2IsTrue, answer3, answer3IsTrue, answer4, answer5IsTrue)
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

        AddAnswer: function(Id, answer, answerIsTrue)
        {
            let error = false;

            if ((Id || Id === 0) && typeof answer && typeof answerIsTrue != null)
            {
                dbclient.query(`SELECT * FROM "${schema}"."Answer" WHERE "QuestionId"=$1`,
                    [Id]).then(res =>
                    {
                        if (res.rows.length < 4)
                        {
                            dbclient.query(`INSERT INTO "${schema}"."Answer"("QuestionId", "Content", "IsCorrect") VALUES ($1, $2, $3)`,
                                [Id, answer4, answerIsTrue]).catch(e => {console.error(e.stack); error = true;});
                        }
                    }).catch(e => {console.error(e.stack); error = true;});
            }
            if (error)
            {
                return "Something went wrong";
            }
            return "Answer successfuly added";
        },

    }

})();
