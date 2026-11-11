CREATE TABLE meeting_types (
    id               text        PRIMARY KEY,
    name             text        NOT NULL,
    description      text,
    duration_minutes integer     NOT NULL
        CHECK (duration_minutes BETWEEN 15 AND 240 AND duration_minutes % 15 = 0),
    created_at       timestamptz NOT NULL
);
