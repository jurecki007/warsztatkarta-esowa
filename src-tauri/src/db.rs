use rusqlite::{Connection, Result};
use std::path::Path;

pub fn inicjalizuj_baze(sciezka: &Path) -> Result<Connection> {
    if let Some(parent) = sciezka.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(sciezka)?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    migracja(&conn)?;
    Ok(conn)
}

fn migracja(conn: &Connection) -> Result<()> {
    // Create tables for fresh installs (pojazdy without klient_id)
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS klienci (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            imie        TEXT NOT NULL DEFAULT '',
            nazwisko    TEXT NOT NULL DEFAULT '',
            firma       TEXT,
            telefon     TEXT NOT NULL DEFAULT '',
            email       TEXT,
            nip         TEXT,
            adres       TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS pojazdy (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            rejestracja  TEXT NOT NULL DEFAULT '',
            marka        TEXT NOT NULL DEFAULT '',
            model        TEXT NOT NULL DEFAULT '',
            rok          INTEGER,
            vin          TEXT
        );

        CREATE TABLE IF NOT EXISTS zlecenia (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            klient_id       INTEGER NOT NULL,
            pojazd_id       INTEGER NOT NULL,
            opis            TEXT,
            status          TEXT NOT NULL DEFAULT 'Nowe',
            data_przyjecia  TEXT DEFAULT (date('now')),
            suma_netto      REAL DEFAULT 0.0,
            vat             REAL DEFAULT 0.0,
            suma_brutto     REAL DEFAULT 0.0,
            FOREIGN KEY (klient_id) REFERENCES klienci(id),
            FOREIGN KEY (pojazd_id) REFERENCES pojazdy(id)
        );

        CREATE TABLE IF NOT EXISTS pozycje_robocizna (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            zlecenie_id  INTEGER NOT NULL,
            nazwa        TEXT NOT NULL DEFAULT '',
            czas_h       REAL NOT NULL DEFAULT 0.0,
            stawka       REAL NOT NULL DEFAULT 0.0,
            FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pozycje_czesci (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            zlecenie_id  INTEGER NOT NULL,
            nazwa        TEXT NOT NULL DEFAULT '',
            ilosc        REAL NOT NULL DEFAULT 1.0,
            cena         REAL NOT NULL DEFAULT 0.0,
            FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS zdjecia (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            zlecenie_id  INTEGER NOT NULL,
            nazwa        TEXT,
            data         TEXT NOT NULL,
            FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS presety_robocizny (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            nazwa   TEXT NOT NULL,
            stawka  REAL NOT NULL DEFAULT 0.0
        );
    ")?;

    // Migration: if pojazdy still has klient_id from old schema, recreate without it
    let has_klient_id: bool = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('pojazdy') WHERE name='klient_id'",
        [],
        |r| r.get::<_, i64>(0),
    )? > 0;

    // Migration: add numer_faktury column to zlecenia if missing
    let has_numer_faktury: bool = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('zlecenia') WHERE name='numer_faktury'",
        [], |r| r.get::<_, i64>(0),
    )? > 0;
    if !has_numer_faktury {
        conn.execute_batch("ALTER TABLE zlecenia ADD COLUMN numer_faktury TEXT;")?;
    }

    if has_klient_id {
        conn.execute_batch("
            PRAGMA foreign_keys = OFF;
            CREATE TABLE pojazdy_new (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                rejestracja  TEXT NOT NULL DEFAULT '',
                marka        TEXT NOT NULL DEFAULT '',
                model        TEXT NOT NULL DEFAULT '',
                rok          INTEGER,
                vin          TEXT
            );
            INSERT INTO pojazdy_new (id, rejestracja, marka, model, rok, vin)
                SELECT id, rejestracja, marka, model, rok, vin FROM pojazdy;
            DROP TABLE pojazdy;
            ALTER TABLE pojazdy_new RENAME TO pojazdy;
            PRAGMA foreign_keys = ON;
        ")?;
    }

    Ok(())
}
