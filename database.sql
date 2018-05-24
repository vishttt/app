--
-- PostgreSQL database dump
--

-- Dumped from database version 10.1
-- Dumped by pg_dump version 10.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drumblequiz; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drumblequiz;


--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: AnswerRelatedToQuestion(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."AnswerRelatedToQuestion"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE q_id bigint;
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
$$;


--
-- Name: CheckIfCanCreateAnotherQuestion(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."CheckIfCanCreateAnotherQuestion"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE qi_id integer;
BEGIN

SELECT questioninstanceid INTO qi_id
FROM "drumblequiz".active_questions_per_room as aqpr
WHERE aqpr."RoomId" = new."RoomId"
AND aqpr.questioninstanceid != new."Id";

IF qi_id IS NOT NULL THEN 
	RAISE EXCEPTION 'Another Question Instance is active';
END IF;
RETURN new;
END

$$;


--
-- Name: CheckIfMoreThanFour(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."CheckIfMoreThanFour"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE numberOfAnswers integer;
BEGIN
SELECT count(*) INTO numberOfAnswers
	FROM "drumblequiz"."Answer" AS answer
	WHERE "QuestionId" = new."QuestionId";
		
IF numberOfAnswers > 4 THEN 
	RAISE EXCEPTION 'Cannot add more than 4 answers to the same question';
END IF;
RETURN new;
END


$$;


--
-- Name: CheckIfNextQuestionIsRight(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."CheckIfNextQuestionIsRight"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE questionExpected integer;
BEGIN
SELECT qq."QuestionId" INTO questionExpected
	FROM "drumblequiz"."Room" AS room
	,"drumblequiz"."QuizQuestion" AS qq
	WHERE room."Id" = new."RoomId"
	AND room."QuizId" = qq."QuizId"
	ORDER BY qq."OrderNr" ASC
	LIMIT 1 OFFSET (SELECT COALESCE(SUM(req."count"), 0)
					FROM "drumblequiz"."Room" AS rm
					LEFT JOIN "drumblequiz".room_ended_questions AS req 
					ON rm."Id" = req."RoomId"
					WHERE rm."Id" = new."RoomId"
					GROUP BY rm."Id");
		
IF questionExpected <> new."QuestionId" THEN 
	RAISE EXCEPTION 'Unexpected question';
END IF;
RETURN new;
END


$$;


--
-- Name: CheckIfQuestionStillActive(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."CheckIfQuestionStillActive"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE qi_id integer;
BEGIN

SELECT questioninstanceid INTO qi_id
FROM "drumblequiz".active_questions_per_room as aqpr
WHERE aqpr.questioninstanceid = new."QuestionInstanceId";

IF qi_id IS NULL THEN 
	RAISE EXCEPTION 'Question instance is not active';
END IF;
RETURN new;
END


$$;


--
-- Name: CheckIfQuestionStillActive(QuestionInstance)(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."CheckIfQuestionStillActive(QuestionInstance)"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE qi_id integer;
BEGIN

SELECT questioninstanceid INTO qi_id
FROM "drumblequiz".active_questions_per_room as aqpr
WHERE aqpr.questioninstanceid = new."Id";

IF qi_id IS NULL THEN 
	RAISE EXCEPTION 'Question instance is not active';
END IF;
RETURN new;
END


$$;


--
-- Name: InstanceTime(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."InstanceTime"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE qTime integer;
DECLARE 
BEGIN

SELECT "Time" INTO qTime
	FROM "drumblequiz"."Question"
	WHERE "Id" = new."QuestionId"; 

IF new."Duration" IS NULL THEN
new."Duration" = qTime;
END IF;
RETURN NEW;
END




$$;


--
-- Name: NewAnswerReplacesOld(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."NewAnswerReplacesOld"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
DELETE FROM "drumblequiz"."AnswerInstance"
WHERE 
	"UserInstanceId" = new."UserInstanceId" AND
	"QuestionInstanceId" = new."QuestionInstanceId" AND
	"Id" <> new."Id";
	RETURN NEW; 
END
$$;


--
-- Name: QuestionBelongsToAQuiz(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."QuestionBelongsToAQuiz"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE quizId integer;
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




$$;


--
-- Name: UserBelongsToRoom(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."UserBelongsToRoom"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE q_RoomId varchar;
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


$$;


--
-- Name: UserCanCreateQuiz(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz."UserCanCreateQuiz"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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






$$;


--
-- Name: notify_user_created(); Type: FUNCTION; Schema: drumblequiz; Owner: -
--

CREATE FUNCTION drumblequiz.notify_user_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE
BEGIN
    PERFORM pg_notify('watchers', NEW."RoomId");
      RETURN new;
END
$$;


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: Answer; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."Answer" (
    "Id" integer NOT NULL,
    "QuestionId" integer NOT NULL,
    "Content" text NOT NULL,
    "IsCorrect" boolean NOT NULL
);


--
-- Name: AnswerInstance; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."AnswerInstance" (
    "Id" integer NOT NULL,
    "QuestionInstanceId" integer NOT NULL,
    "TimeStamp" timestamp(1) without time zone DEFAULT (now())::timestamp without time zone,
    "AnswerId" integer NOT NULL,
    "UserInstanceId" integer NOT NULL
);


--
-- Name: AnswerInstance_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."AnswerInstance_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AnswerInstance_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."AnswerInstance_Id_seq" OWNED BY drumblequiz."AnswerInstance"."Id";


--
-- Name: Answer_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."Answer_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Answer_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."Answer_Id_seq" OWNED BY drumblequiz."Answer"."Id";


--
-- Name: Question; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."Question" (
    "Id" integer NOT NULL,
    "Title" character varying(30),
    "Content" text NOT NULL,
    "Time" integer
);


--
-- Name: QuestionInstance; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."QuestionInstance" (
    "Id" integer NOT NULL,
    "QuestionId" integer NOT NULL,
    "TimeStamp" timestamp(1) without time zone DEFAULT (now())::timestamp without time zone NOT NULL,
    "RoomId" character varying(10),
    "Duration" integer
);


--
-- Name: QuestionInstance_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."QuestionInstance_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: QuestionInstance_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."QuestionInstance_Id_seq" OWNED BY drumblequiz."QuestionInstance"."Id";


--
-- Name: Question_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."Question_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Question_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."Question_Id_seq" OWNED BY drumblequiz."Question"."Id";


--
-- Name: Quiz; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."Quiz" (
    "Id" integer NOT NULL,
    "Name" character varying(50),
    "IsAnonymous" boolean,
    "OwnerUserId" character varying(50) NOT NULL
);


--
-- Name: QuizQuestion; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."QuizQuestion" (
    "QuestionId" integer NOT NULL,
    "QuizId" integer NOT NULL,
    "OrderNr" integer NOT NULL
);


--
-- Name: Quiz_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."Quiz_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Quiz_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."Quiz_Id_seq" OWNED BY drumblequiz."Quiz"."Id";


--
-- Name: Room; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."Room" (
    "Id" character varying(10) NOT NULL,
    "QuizId" integer NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."User" (
    "Id" character varying(50) NOT NULL,
    "CanCreateQuiz" boolean NOT NULL,
    "Username" character varying(30),
    "loginHash" character varying,
    email character varying(255)
);


--
-- Name: UserInstance; Type: TABLE; Schema: drumblequiz; Owner: -
--

CREATE TABLE drumblequiz."UserInstance" (
    "Id" integer NOT NULL,
    "DisplayName" character varying(30) NOT NULL,
    "UserId" character varying(50),
    "RoomId" character varying(10) NOT NULL
);


--
-- Name: UserInstance_Id_seq; Type: SEQUENCE; Schema: drumblequiz; Owner: -
--

CREATE SEQUENCE drumblequiz."UserInstance_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserInstance_Id_seq; Type: SEQUENCE OWNED BY; Schema: drumblequiz; Owner: -
--

ALTER SEQUENCE drumblequiz."UserInstance_Id_seq" OWNED BY drumblequiz."UserInstance"."Id";


--
-- Name: active_questions_per_room; Type: VIEW; Schema: drumblequiz; Owner: -
--

CREATE VIEW drumblequiz.active_questions_per_room AS
 SELECT subq.questioninstanceid,
    subq.starttime,
    subq.duration,
    subq.endtime,
    subq."RoomId",
    (now())::timestamp without time zone AS now
   FROM ( SELECT qi."Id" AS questioninstanceid,
            qi."TimeStamp" AS starttime,
            qi."Duration" AS duration,
            (qi."TimeStamp" + ((qi."Duration")::double precision * '00:00:01'::interval)) AS endtime,
            qi."RoomId"
           FROM drumblequiz."QuestionInstance" qi) subq
  WHERE ((((now())::timestamp without time zone >= subq.starttime) AND ((now())::timestamp without time zone <= subq.endtime)) OR (subq.endtime IS NULL));


--
-- Name: room_ended_questions; Type: VIEW; Schema: drumblequiz; Owner: -
--

CREATE VIEW drumblequiz.room_ended_questions WITH (security_barrier='false') AS
 SELECT subq.questionid,
    subq."RoomId",
    count(*) AS count
   FROM ( SELECT qi."QuestionId" AS questionid,
            (qi."TimeStamp" + ((qi."Duration")::double precision * '00:00:01'::interval)) AS endtime,
            qi."RoomId"
           FROM drumblequiz."QuestionInstance" qi) subq
  WHERE ((now())::timestamp without time zone > subq.endtime)
  GROUP BY subq.questionid, subq."RoomId";


--
-- Name: user_scores; Type: VIEW; Schema: drumblequiz; Owner: -
--

CREATE VIEW drumblequiz.user_scores WITH (security_barrier='false') AS
 SELECT room."Id" AS roomid,
    useri."DisplayName" AS display,
    useri."Id" AS userid,
    COALESCE(scorecount.score, (0)::bigint) AS score
   FROM drumblequiz."Room" room,
    (drumblequiz."UserInstance" useri
     LEFT JOIN ( SELECT answi."UserInstanceId",
            count(answi.*) AS score
           FROM drumblequiz."AnswerInstance" answi,
            drumblequiz."Answer" answer
          WHERE ((answi."AnswerId" = answer."Id") AND answer."IsCorrect")
          GROUP BY answi."UserInstanceId") scorecount ON ((scorecount."UserInstanceId" = useri."Id")))
  WHERE ((room."Id")::text = (useri."RoomId")::text);


--
-- Name: Answer Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Answer" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."Answer_Id_seq"'::regclass);


--
-- Name: AnswerInstance Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."AnswerInstance" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."AnswerInstance_Id_seq"'::regclass);


--
-- Name: Question Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Question" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."Question_Id_seq"'::regclass);


--
-- Name: QuestionInstance Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuestionInstance" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."QuestionInstance_Id_seq"'::regclass);


--
-- Name: Quiz Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Quiz" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."Quiz_Id_seq"'::regclass);


--
-- Name: UserInstance Id; Type: DEFAULT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."UserInstance" ALTER COLUMN "Id" SET DEFAULT nextval('drumblequiz."UserInstance_Id_seq"'::regclass);


--
-- Name: Answer AnswerId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Answer"
    ADD CONSTRAINT "AnswerId" PRIMARY KEY ("Id");


--
-- Name: AnswerInstance AnswerInstanceId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."AnswerInstance"
    ADD CONSTRAINT "AnswerInstanceId" PRIMARY KEY ("Id");


--
-- Name: Question QuestionId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Question"
    ADD CONSTRAINT "QuestionId" PRIMARY KEY ("Id");


--
-- Name: QuestionInstance QuestionInstanceId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuestionInstance"
    ADD CONSTRAINT "QuestionInstanceId" PRIMARY KEY ("Id");


--
-- Name: QuizQuestion QuizQuestion_pkey; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("QuestionId", "QuizId");


--
-- Name: Quiz Quiz_pkey; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Quiz"
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY ("Id");


--
-- Name: Room RoomId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Room"
    ADD CONSTRAINT "RoomId" PRIMARY KEY ("Id");


--
-- Name: User UserId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."User"
    ADD CONSTRAINT "UserId" PRIMARY KEY ("Id");


--
-- Name: UserInstance UserInstanceId; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."UserInstance"
    ADD CONSTRAINT "UserInstanceId" PRIMARY KEY ("Id");


--
-- Name: QuizQuestion diff_order_in_quiz; Type: CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuizQuestion"
    ADD CONSTRAINT diff_order_in_quiz UNIQUE ("QuizId", "OrderNr");


--
-- Name: fki_AnswerId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_AnswerId" ON drumblequiz."AnswerInstance" USING btree ("AnswerId");


--
-- Name: fki_Owner; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_Owner" ON drumblequiz."Quiz" USING btree ("OwnerUserId");


--
-- Name: fki_QuestionId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_QuestionId" ON drumblequiz."Answer" USING btree ("QuestionId");


--
-- Name: fki_QuizId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_QuizId" ON drumblequiz."Room" USING btree ("QuizId");


--
-- Name: fki_RoomId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_RoomId" ON drumblequiz."UserInstance" USING btree ("RoomId");


--
-- Name: fki_StudentId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_StudentId" ON drumblequiz."AnswerInstance" USING btree ("UserInstanceId");


--
-- Name: fki_UserId; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX "fki_UserId" ON drumblequiz."UserInstance" USING btree ("UserId");


--
-- Name: fki_ads; Type: INDEX; Schema: drumblequiz; Owner: -
--

CREATE INDEX fki_ads ON drumblequiz."AnswerInstance" USING btree ("QuestionInstanceId");


--
-- Name: QuestionInstance BlockUpdateInactive; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE TRIGGER "BlockUpdateInactive" BEFORE UPDATE ON drumblequiz."QuestionInstance" FOR EACH ROW EXECUTE PROCEDURE drumblequiz."CheckIfQuestionStillActive(QuestionInstance)"();


--
-- Name: AnswerInstance CheckIfQInstanceActive; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "CheckIfQInstanceActive" AFTER INSERT OR UPDATE OF "TimeStamp" ON drumblequiz."AnswerInstance" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."CheckIfQuestionStillActive"();


--
-- Name: Quiz CreatePermission; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "CreatePermission" AFTER INSERT OR UPDATE OF "OwnerUserId" ON drumblequiz."Quiz" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."UserCanCreateQuiz"();


--
-- Name: AnswerInstance DoesAnswerBelongToQuestion; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "DoesAnswerBelongToQuestion" AFTER INSERT OR UPDATE OF "QuestionInstanceId", "AnswerId" ON drumblequiz."AnswerInstance" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."AnswerRelatedToQuestion"();


--
-- Name: AnswerInstance DoesUserBelongToARoom; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "DoesUserBelongToARoom" AFTER INSERT OR UPDATE OF "QuestionInstanceId", "UserInstanceId" ON drumblequiz."AnswerInstance" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."UserBelongsToRoom"();


--
-- Name: QuestionInstance ExpectedQuestion; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE TRIGGER "ExpectedQuestion" AFTER INSERT ON drumblequiz."QuestionInstance" FOR EACH ROW EXECUTE PROCEDURE drumblequiz."CheckIfNextQuestionIsRight"();


--
-- Name: QuestionInstance GetDurationBeforeInsert; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE TRIGGER "GetDurationBeforeInsert" BEFORE INSERT ON drumblequiz."QuestionInstance" FOR EACH ROW EXECUTE PROCEDURE drumblequiz."InstanceTime"();


--
-- Name: Answer InsertCheck; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "InsertCheck" AFTER INSERT ON drumblequiz."Answer" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."CheckIfMoreThanFour"();


--
-- Name: AnswerInstance NewAnswerReplaceOld; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "NewAnswerReplaceOld" AFTER INSERT OR UPDATE ON drumblequiz."AnswerInstance" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."NewAnswerReplacesOld"();


--
-- Name: QuestionInstance NoOtherQuestionsActive; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE TRIGGER "NoOtherQuestionsActive" BEFORE INSERT ON drumblequiz."QuestionInstance" FOR EACH ROW EXECUTE PROCEDURE drumblequiz."CheckIfCanCreateAnotherQuestion"();


--
-- Name: QuestionInstance QuestionBelongsToAQuiz; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE CONSTRAINT TRIGGER "QuestionBelongsToAQuiz" AFTER INSERT OR UPDATE OF "QuestionId", "RoomId" ON drumblequiz."QuestionInstance" NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE PROCEDURE drumblequiz."QuestionBelongsToAQuiz"();


--
-- Name: UserInstance notify_room; Type: TRIGGER; Schema: drumblequiz; Owner: -
--

CREATE TRIGGER notify_room AFTER INSERT OR DELETE ON drumblequiz."UserInstance" FOR EACH ROW EXECUTE PROCEDURE drumblequiz.notify_user_created();


--
-- Name: AnswerInstance AnswerId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."AnswerInstance"
    ADD CONSTRAINT "AnswerId" FOREIGN KEY ("AnswerId") REFERENCES drumblequiz."Answer"("Id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Quiz Owner; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Quiz"
    ADD CONSTRAINT "Owner" FOREIGN KEY ("OwnerUserId") REFERENCES drumblequiz."User"("Id");


--
-- Name: Answer QuestionId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Answer"
    ADD CONSTRAINT "QuestionId" FOREIGN KEY ("QuestionId") REFERENCES drumblequiz."Question"("Id") ON DELETE CASCADE;


--
-- Name: QuestionInstance QuestionId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuestionInstance"
    ADD CONSTRAINT "QuestionId" FOREIGN KEY ("QuestionId") REFERENCES drumblequiz."Question"("Id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuizQuestion QuestionId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuizQuestion"
    ADD CONSTRAINT "QuestionId" FOREIGN KEY ("QuestionId") REFERENCES drumblequiz."Question"("Id") ON DELETE CASCADE;


--
-- Name: AnswerInstance QuestionInstanceId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."AnswerInstance"
    ADD CONSTRAINT "QuestionInstanceId" FOREIGN KEY ("QuestionInstanceId") REFERENCES drumblequiz."QuestionInstance"("Id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Room QuizId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."Room"
    ADD CONSTRAINT "QuizId" FOREIGN KEY ("QuizId") REFERENCES drumblequiz."Quiz"("Id") ON DELETE CASCADE;


--
-- Name: QuizQuestion QuizId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuizQuestion"
    ADD CONSTRAINT "QuizId" FOREIGN KEY ("QuizId") REFERENCES drumblequiz."Quiz"("Id") ON DELETE CASCADE;


--
-- Name: UserInstance RoomId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."UserInstance"
    ADD CONSTRAINT "RoomId" FOREIGN KEY ("RoomId") REFERENCES drumblequiz."Room"("Id") ON DELETE CASCADE;


--
-- Name: QuestionInstance RoomId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."QuestionInstance"
    ADD CONSTRAINT "RoomId" FOREIGN KEY ("RoomId") REFERENCES drumblequiz."Room"("Id") ON DELETE CASCADE;


--
-- Name: UserInstance UserId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."UserInstance"
    ADD CONSTRAINT "UserId" FOREIGN KEY ("UserId") REFERENCES drumblequiz."User"("Id") ON DELETE CASCADE;


--
-- Name: AnswerInstance userInstanceId; Type: FK CONSTRAINT; Schema: drumblequiz; Owner: -
--

ALTER TABLE ONLY drumblequiz."AnswerInstance"
    ADD CONSTRAINT "userInstanceId" FOREIGN KEY ("UserInstanceId") REFERENCES drumblequiz."UserInstance"("Id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

