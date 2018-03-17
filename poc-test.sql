-- create table
CREATE TABLE foo (id serial primary key, name varchar);

-- create notification trigger
CREATE FUNCTION notify_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
    PERFORM pg_notify('watchers', NEW.name);
      RETURN new;
END;
$$ LANGUAGE plpgsql;

-- setup trigger
CREATE TRIGGER watched_table_trigger AFTER INSERT ON foo
FOR EACH ROW EXECUTE PROCEDURE notify_trigger();
