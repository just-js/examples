# pg module examples

## pg.js

blocking reads stdin, sends each chunk of data as a query to postgres in env var PGCONN and outputs result as json with following fields:

tuples: number of tuples/rows
fields: number of columns/fields
status: postgres return code
error:  postgres error message or empty if no error

## examples

### pg.js

run sql against db in PGCONN env var, pipe the results to jq for pretty printing on terminal
- blocking reads stdin
- sends each chunk of data as a query to postgres (env var PGCONN)
- outputs result as json with following fields:

```bash
PGCONN="hostaddr=127.0.0.1 port=5432 dbname=postgres user=postgres password=abc123" echo 'select * from accounts limit 1;' | just pg.js | jq
{
  "tuples": 1,
  "fields": 6,
  "status": "PGRES_TUPLES_OK",
  "error": "",
  "records": [
    {
      "user_id": "1",
      "username": "andrew",
      "password": "password",
      "email": "andrew@foo.com",
      "created_on": "2020-07-21 02:46:23",
      "last_login": "2020-07-21 02:46:23"
    }
  ]
}
```

### shell.js

simple postgres shell for running commands and getting pretty printed results on the terminal

```bash
PGCONN="hostaddr=127.0.0.1 port=5432 dbname=postgres user=postgres password=abc123" just shell.js
> select * from accounts limit 1;
user_id             | username            | password            | email               | created_on          | last_login          | 
------------------------------------------------------------------------------------------------------------------------------------
1                   | andrew              | password            | andrew@foo.com      | 2020-07-21 02:46:23 | 2020-07-21 02:46:23 |
```
