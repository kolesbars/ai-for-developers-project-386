-- Бронирования. Интервалы полуоткрытые [start_at, end_at): встреча может начаться в момент
-- окончания предыдущей. Пересечения любых Бронирований (любых Типов встреч) запрещает БД.
CREATE TABLE bookings (
    id              uuid        PRIMARY KEY,
    meeting_type_id text        NOT NULL REFERENCES meeting_types (id),
    start_at        timestamptz NOT NULL,
    end_at          timestamptz NOT NULL,
    guest_name      text        NOT NULL,
    guest_email     text        NOT NULL,
    comment         text,
    created_at      timestamptz NOT NULL,
    CHECK (end_at > start_at),
    CONSTRAINT bookings_no_overlap EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)
);
