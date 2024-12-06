CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION gen_ulid() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Crockford's Base32
    encoding   CHAR(32) := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    timestamp  BIGINT;
    chars      CHAR(26);
    result     TEXT;
    unix_time  BIGINT;
    ulid      BYTEA;
BEGIN
    -- 6 bytes of timestamp
    unix_time := (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;
    timestamp := unix_time << 80;

    -- 10 bytes of crypto random data
    ulid := decode(encode(gen_random_bytes(10), 'hex'), 'hex');

    -- Merge timestamp and random data
    chars := '';
    FOR i IN 0..25 LOOP
        chars := chars || encoding[1 + (
            CASE
                WHEN i < 10 THEN
                    (unix_time >> (40 - i * 4)) & 31
                ELSE
                    get_byte(ulid, (i - 10) / 2) >> (4 * ((i - 10) % 2)) & 31
            END
        )];
    END LOOP;

    -- Format the result
    result := chars;
    RETURN result;
END;
$$; 