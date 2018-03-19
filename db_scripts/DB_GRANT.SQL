GRANT EXECUTE ON FUNCTION "drumblequiz"."AnswerRelatedToQuestion"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."CheckIfMoreThanFour"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."CheckIfQuestionStillActive"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."InstanceTime"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."NewAnswerReplacesOld"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."QuestionBelongsToAQuiz"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."UserBelongsToRoom"() TO <UserAccount> WITH GRANT OPTION;

GRANT EXECUTE ON FUNCTION "drumblequiz"."UserCanCreateQuiz"() TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."AnswerInstance_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."Answer_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."QuestionInstance_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."Question_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."Quiz_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON SEQUENCE "drumblequiz"."UserInstance_Id_seq" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."Question" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."Answer" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."User" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."Quiz" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."QuizQuestion" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."Room" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."UserInstance" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."QuestionInstance" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz"."AnswerInstance" TO <UserAccount> WITH GRANT OPTION;

GRANT ALL ON TABLE "drumblequiz".active_questions_per_room TO <UserAccount> WITH GRANT OPTION;