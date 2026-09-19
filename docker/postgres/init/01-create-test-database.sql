CREATE USER taler_test WITH PASSWORD 'local_test_only';
CREATE DATABASE taler_test OWNER taler_test;
REVOKE CONNECT ON DATABASE taler_test FROM PUBLIC;
GRANT CONNECT ON DATABASE taler_test TO taler_test;
