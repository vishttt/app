CREATE FUNCTION "drumblequiz"."AnswerRelatedToQuestion"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
DECLARE q_id bigint;
DECLARE a_id bigint;
BEGIN
SELECT "QuestionId" INTO q_id
	FROM "drumblequiz"."QuestionInstance"
	WHERE "Id" = new."QuestionInstanceId";
	
SELECT "Id" INTO a_id
	FROM "drumblequiz"."Answer" AS an
	WHERE "Id" = new."AnswerId"
	AND "QuestionId" = q_id;
		
IF a_id IS NULL THEN 
	RAISE EXCEPTION 'Chosen answer does not belong to a question';
END IF;
RETURN new;
END

$BODY$;

CREATE FUNCTION "drumblequiz"."CheckIfMoreThanFour"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
DECLARE numberOfAnswers integer;
BEGIN
SELECT count(*) INTO numberOfAnswers
	FROM "drumblequiz"."Answer" AS answer
	WHERE "QuestionId" = new."QuestionId";
		
IF numberOfAnswers > 4 THEN 
	RAISE EXCEPTION 'Cannot add more than 4 answers to the same question';
END IF;
RETURN new;
END

$BODY$;

CREATE FUNCTION "drumblequiz"."CheckIfQuestionStillActive"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
DECLARE q_id bigint;
DECLARE qTime integer;
DECLARE qStarted TimeStamp(0);
DECLARE aStarted TimeStamp(0);
DECLARE qStartedS bigint;
DECLARE aStartedS bigint;
BEGIN
SELECT "Duration" INTO qTime
	FROM "drumblequiz"."QuestionInstance"
	WHERE "Id" = new."QuestionInstanceId"; 
	
SELECT "TimeStamp" INTO qStarted
	FROM "drumblequiz"."QuestionInstance"
	WHERE "Id" = new."QuestionInstanceId";
	
SELECT "TimeStamp" INTO aStarted
	FROM "drumblequiz"."AnswerInstance"
	WHERE "Id" = new."Id";
	
SELECT EXTRACT(EPOCH FROM aStarted) INTO aStartedS;

SELECT EXTRACT(EPOCH FROM qStarted) INTO qStartedS;
		
IF aStartedS - qStartedS > qTime OR aStartedS - qStartedS < -2 THEN 
	RAISE EXCEPTION 'Question instance is not active';
END IF;
RETURN new;
END

$BODY$;

CREATE FUNCTION "drumblequiz"."InstanceTime"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$

DECLARE qTime integer;
DECLARE 
BEGIN

SELECT "Time" INTO qTime
	FROM "drumblequiz"."Question"
	WHERE "Id" = new."QuestionId"; 

new."Duration" = qTime;
RETURN NEW; 
END

$BODY$;

CREATE FUNCTION "drumblequiz"."NewAnswerReplacesOld"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
BEGIN
DELETE FROM "drumblequiz"."AnswerInstance"
WHERE 
	"UserInstanceId" = new."UserInstanceId" AND
	"QuestionInstanceId" = new."QuestionInstanceId" AND
	"Id" <> new."Id";
	RETURN NEW; 
END

$BODY$;

CREATE FUNCTION "drumblequiz"."QuestionBelongsToAQuiz"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
DECLARE quizId integer;
DECLARE orderNum integer;
BEGIN
SELECT "QuizId" INTO quizId
	FROM "drumblequiz"."Room"
	WHERE "Id" = new."RoomId";
	
SELECT "OrderNr" INTO orderNum
	FROM "drumblequiz"."QuizQuestion"
	WHERE "QuizId" = quizId
	AND "QuestionId" = new."QuestionId";
	
IF orderNum IS NULL THEN 
	RAISE EXCEPTION 'Question does not belong to a quiz';
END IF;
RETURN new;
END

$BODY$;

CREATE FUNCTION "drumblequiz"."UserBelongsToRoom"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$
DECLARE q_RoomId varchar;
DECLARE u_RoomId varchar;
BEGIN
SELECT "RoomId" INTO q_RoomId
	FROM "drumblequiz"."QuestionInstance"
	WHERE "Id" = new."QuestionInstanceId";
	
SELECT "RoomId" INTO u_RoomId
	FROM "drumblequiz"."UserInstance"
	WHERE "Id" = new."UserInstanceId";
		
IF u_RoomId <> q_RoomId THEN 
	RAISE EXCEPTION 'User is not in correct room';
END IF;
RETURN new;
END

$BODY$;

CREATE FUNCTION "drumblequiz"."UserCanCreateQuiz"()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF 
AS $BODY$

DECLARE canCreate boolean;
BEGIN
SELECT "CanCreateQuiz" INTO canCreate
	FROM "drumblequiz"."User"
	WHERE "Id" = new."OwnerUserId";
	
IF canCreate = false OR canCreate IS NULL THEN 
	RAISE EXCEPTION 'This user has no permission to quiz';
END IF;
RETURN new;
END

$BODY$;

CREATE SEQUENCE "drumblequiz"."AnswerInstance_Id_seq"
    INCREMENT 1
    START 53
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE "drumblequiz"."Answer_Id_seq"
    INCREMENT 1
    START 41
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE "drumblequiz"."QuestionInstance_Id_seq"
    INCREMENT 1
    START 16
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE "drumblequiz"."Question_Id_seq"
    INCREMENT 1
    START 20
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE "drumblequiz"."Quiz_Id_seq"
    INCREMENT 1
    START 3
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE "drumblequiz"."UserInstance_Id_seq"
    INCREMENT 1
    START 2
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE "drumblequiz"."Question"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."Question_Id_seq"'::regclass),
    "Title" character varying(30) COLLATE pg_catalog."default",
    "Content" text COLLATE pg_catalog."default" NOT NULL,
    "Time" integer,
    CONSTRAINT "QuestionId" PRIMARY KEY ("Id")
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE TABLE "drumblequiz"."Answer"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."Answer_Id_seq"'::regclass),
    "QuestionId" integer NOT NULL DEFAULT nextval('"drumblequiz"."Answer_QuestionId_seq"'::regclass),
    "Content" text COLLATE pg_catalog."default" NOT NULL,
    "IsCorrect" boolean NOT NULL,
    CONSTRAINT "AnswerId" PRIMARY KEY ("Id"),
    CONSTRAINT "QuestionId" FOREIGN KEY ("QuestionId")
        REFERENCES "drumblequiz"."Question" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE INDEX "fki_QuestionId"
    ON "drumblequiz"."Answer" USING btree
    ("QuestionId")
    TABLESPACE pg_default;

CREATE CONSTRAINT TRIGGER "InsertCheck"
    AFTER INSERT
    ON "drumblequiz"."Answer"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."CheckIfMoreThanFour"();

CREATE TABLE "drumblequiz"."User"
(
    "Id" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    "CanCreateQuiz" boolean NOT NULL,
    "Username" character varying(30) COLLATE pg_catalog."default",
    CONSTRAINT "UserId" PRIMARY KEY ("Id")
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE TABLE "drumblequiz"."Quiz"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."Quiz_Id_seq"'::regclass),
    "Name" character varying(50) COLLATE pg_catalog."default",
    "IsAnonymous" boolean,
    "OwnerUserId" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT "Owner" FOREIGN KEY ("OwnerUserId")
        REFERENCES "drumblequiz"."User" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE INDEX "fki_Owner"
    ON "drumblequiz"."Quiz" USING btree
    ("OwnerUserId" COLLATE pg_catalog."default")
    TABLESPACE pg_default;

CREATE CONSTRAINT TRIGGER "CreatePermission"
    AFTER INSERT OR UPDATE OF "OwnerUserId"
    ON "drumblequiz"."Quiz"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."UserCanCreateQuiz"();
	
CREATE TABLE "drumblequiz"."QuizQuestion"
(
    "QuestionId" integer NOT NULL,
    "QuizId" integer NOT NULL,
    "OrderNr" integer NOT NULL,
    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("QuestionId", "QuizId", "OrderNr"),
    CONSTRAINT "QuestionId" FOREIGN KEY ("QuestionId")
        REFERENCES "drumblequiz"."Question" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT "QuizId" FOREIGN KEY ("QuizId")
        REFERENCES "drumblequiz"."Quiz" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE TABLE "drumblequiz"."Room"
(
    "Id" character varying(10) COLLATE pg_catalog."default" NOT NULL,
    "QuizId" integer NOT NULL,
    CONSTRAINT "RoomId" PRIMARY KEY ("Id"),
    CONSTRAINT "QuizId" FOREIGN KEY ("QuizId")
        REFERENCES "drumblequiz"."Quiz" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE INDEX "fki_QuizId"
    ON "drumblequiz"."Room" USING btree
    ("QuizId")
    TABLESPACE pg_default;

CREATE TABLE "drumblequiz"."UserInstance"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."UserInstance_Id_seq"'::regclass),
    "DisplayName" character varying(30) COLLATE pg_catalog."default" NOT NULL,
    "UserId" character varying(50) COLLATE pg_catalog."default",
    "RoomId" character varying(10) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "UserInstanceId" PRIMARY KEY ("Id"),
    CONSTRAINT "RoomId" FOREIGN KEY ("RoomId")
        REFERENCES "drumblequiz"."Room" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "UserId" FOREIGN KEY ("UserId")
        REFERENCES "drumblequiz"."User" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE INDEX "fki_RoomId"
    ON "drumblequiz"."UserInstance" USING btree
    ("RoomId" COLLATE pg_catalog."default")
    TABLESPACE pg_default;

CREATE INDEX "fki_UserId"
    ON "drumblequiz"."UserInstance" USING btree
    ("UserId" COLLATE pg_catalog."default")
    TABLESPACE pg_default;

CREATE TABLE "drumblequiz"."QuestionInstance"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."QuestionInstance_Id_seq"'::regclass),
    "QuestionId" integer NOT NULL,
    "TimeStamp" timestamp(1) without time zone NOT NULL DEFAULT now(),
    "RoomId" character varying(10) COLLATE pg_catalog."default",
    "Duration" integer,
    CONSTRAINT "QuestionInstanceId" PRIMARY KEY ("Id"),
    CONSTRAINT "QuestionId" FOREIGN KEY ("Id")
        REFERENCES "drumblequiz"."Question" ("Id") MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT "RoomId" FOREIGN KEY ("RoomId")
        REFERENCES "drumblequiz"."Room" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE TRIGGER "GetDurationBeforeInsert"
    BEFORE INSERT
    ON "drumblequiz"."QuestionInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."InstanceTime"();

CREATE CONSTRAINT TRIGGER "QuestionBelongsToAQuiz"
    AFTER INSERT OR UPDATE OF "QuestionId", "RoomId"
    ON "drumblequiz"."QuestionInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."QuestionBelongsToAQuiz"();
	
CREATE TABLE "drumblequiz"."AnswerInstance"
(
    "Id" integer NOT NULL DEFAULT nextval('"drumblequiz"."AnswerInstance_Id_seq"'::regclass),
    "QuestionInstanceId" integer NOT NULL,
    "TimeStamp" timestamp(1) without time zone DEFAULT now(),
    "AnswerId" integer NOT NULL,
    "UserInstanceId" integer NOT NULL,
    CONSTRAINT "AnswerInstanceId" PRIMARY KEY ("Id"),
    CONSTRAINT "AnswerId" FOREIGN KEY ("AnswerId")
        REFERENCES "drumblequiz"."Answer" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT "QuestionInstanceId" FOREIGN KEY ("QuestionInstanceId")
        REFERENCES "drumblequiz"."QuestionInstance" ("Id") MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT "userInstanceId" FOREIGN KEY ("UserInstanceId")
        REFERENCES "drumblequiz"."UserInstance" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

CREATE INDEX "fki_AnswerId"
    ON "drumblequiz"."AnswerInstance" USING btree
    ("AnswerId")
    TABLESPACE pg_default;

CREATE INDEX "fki_StudentId"
    ON "drumblequiz"."AnswerInstance" USING btree
    ("UserInstanceId")
    TABLESPACE pg_default;

CREATE INDEX fki_ads
    ON "drumblequiz"."AnswerInstance" USING btree
    ("QuestionInstanceId")
    TABLESPACE pg_default;

CREATE CONSTRAINT TRIGGER "CheckIfQInstanceActive"
    AFTER INSERT OR UPDATE OF "TimeStamp"
    ON "drumblequiz"."AnswerInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."CheckIfQuestionStillActive"();

CREATE CONSTRAINT TRIGGER "DoesAnswerBelongToQuestion"
    AFTER INSERT OR UPDATE OF "QuestionInstanceId", "AnswerId"
    ON "drumblequiz"."AnswerInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."AnswerRelatedToQuestion"();

CREATE CONSTRAINT TRIGGER "DoesUserBelongToARoom"
    AFTER INSERT OR UPDATE OF "QuestionInstanceId", "UserInstanceId"
    ON "drumblequiz"."AnswerInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."UserBelongsToRoom"();

CREATE CONSTRAINT TRIGGER "NewAnswerReplaceOld"
    AFTER INSERT OR UPDATE 
    ON "drumblequiz"."AnswerInstance"
    FOR EACH ROW
    EXECUTE PROCEDURE "drumblequiz"."NewAnswerReplacesOld"();
	
CREATE OR REPLACE VIEW "drumblequiz".active_questions_per_room AS
 SELECT subq.questioninstanceid,
    subq.starttime,
    subq.duration,
    subq.endtime,
    subq."RoomId",
    now() AS now
   FROM ( SELECT qi."Id" AS questioninstanceid,
            qi."TimeStamp" AS starttime,
            q."Time" AS duration,
            qi."TimeStamp" + q."Time"::double precision * '00:00:01'::interval AS endtime,
            qi."RoomId"
           FROM "drumblequiz"."QuestionInstance" qi
             LEFT JOIN "drumblequiz"."Question" q ON qi."QuestionId" = q."Id") subq
  WHERE now() >= subq.starttime AND now() <= subq.endtime;

