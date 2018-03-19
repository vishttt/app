DROP VIEW "drumblequiz".active_questions_per_room CASCADE;

DROP INDEX "drumblequiz"."fki_AnswerId" CASCADE;

DROP INDEX "drumblequiz"."fki_StudentId" CASCADE;

DROP INDEX "drumblequiz".fki_ads CASCADE;

DROP TRIGGER "CheckIfQInstanceActive" ON "drumblequiz"."AnswerInstance" CASCADE;

DROP TRIGGER "DoesAnswerBelongToQuestion" ON "drumblequiz"."AnswerInstance" CASCADE;

DROP TRIGGER "DoesUserBelongToARoom" ON "drumblequiz"."AnswerInstance" CASCADE;

DROP TRIGGER "NewAnswerReplaceOld" ON "drumblequiz"."AnswerInstance" CASCADE;

DROP TRIGGER "GetDurationBeforeInsert" ON "drumblequiz"."QuestionInstance" CASCADE;

DROP TRIGGER "QuestionBelongsToAQuiz" ON "drumblequiz"."QuestionInstance" CASCADE;

DROP INDEX "drumblequiz"."fki_RoomId" CASCADE;

DROP INDEX "drumblequiz"."fki_UserId" CASCADE;

DROP INDEX "drumblequiz"."fki_QuizId" CASCADE;

DROP INDEX "drumblequiz"."fki_Owner" CASCADE;

DROP TRIGGER "CreatePermission" ON "drumblequiz"."Quiz" CASCADE;

DROP INDEX "drumblequiz"."fki_QuestionId" CASCADE;

DROP TRIGGER "InsertCheck" ON "drumblequiz"."Answer" CASCADE;

DROP TABLE "drumblequiz"."AnswerInstance" CASCADE;

DROP TABLE "drumblequiz"."QuestionInstance" CASCADE;

DROP TABLE "drumblequiz"."UserInstance" CASCADE;

DROP TABLE "drumblequiz"."Room" CASCADE;

DROP TABLE "drumblequiz"."QuizQuestion" CASCADE;

DROP TABLE "drumblequiz"."Quiz" CASCADE;

DROP TABLE "drumblequiz"."User" CASCADE;

DROP TABLE "drumblequiz"."Answer" CASCADE;

DROP TABLE "drumblequiz"."Question" CASCADE;

DROP SEQUENCE "drumblequiz"."AnswerInstance_Id_seq" CASCADE;

DROP SEQUENCE "drumblequiz"."Answer_Id_seq" CASCADE;

DROP SEQUENCE "drumblequiz"."Question_Id_seq" CASCADE;

DROP SEQUENCE "drumblequiz"."QuestionInstance_Id_seq" CASCADE;

DROP SEQUENCE "drumblequiz"."UserInstance_Id_seq" CASCADE;

DROP SEQUENCE "drumblequiz"."QuizInstance_Id_seq" CASCADE;

DROP FUNCTION "drumblequiz"."AnswerRelatedToQuestion"() CASCADE;

DROP FUNCTION "drumblequiz"."CheckIfMoreThanFour"() CASCADE;

DROP FUNCTION "drumblequiz"."CheckIfQuestionStillActive"() CASCADE;

DROP FUNCTION "drumblequiz"."InstanceTime"() CASCADE;

DROP FUNCTION "drumblequiz"."NewAnswerReplacesOld"() CASCADE;

DROP FUNCTION "drumblequiz"."QuestionBelongsToAQuiz"() CASCADE;

DROP FUNCTION "drumblequiz"."UserBelongsToRoom"() CASCADE;

DROP FUNCTION "drumblequiz"."UserCanCreateQuiz"() CASCADE;