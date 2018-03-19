ALTER FUNCTION "drumblequiz"."AnswerRelatedToQuestion"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."CheckIfMoreThanFour"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."CheckIfQuestionStillActive"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."InstanceTime"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."NewAnswerReplacesOld"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."QuestionBelongsToAQuiz"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."UserBelongsToRoom"()
    OWNER TO <OwnerAccount>;

ALTER FUNCTION "drumblequiz"."UserCanCreateQuiz"()
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."AnswerInstance_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."Answer_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."QuestionInstance_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."Question_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."Quiz_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER SEQUENCE "drumblequiz"."UserInstance_Id_seq"
    OWNER TO <OwnerAccount>;

ALTER TABLE "drumblequiz"."Question"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."Answer"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."User"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."Quiz"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."QuizQuestion"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."Room"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."UserInstance"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."QuestionInstance"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz"."AnswerInstance"
    OWNER to <OwnerAccount>;

ALTER TABLE "drumblequiz".active_questions_per_room
    OWNER TO <OwnerAccount>;

