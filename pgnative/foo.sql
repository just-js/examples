BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE users (
  id serial,
  first varchar(20),
  last varchar(40),
  birth_year integer,
  PRIMARY KEY (id)
);
CREATE INDEX ix_users_first_last ON users (first, last);
CREATE INDEX ix_users_birth_year ON users (birth_year);

COMMIT;