use crate::models::*;
use crate::DbState;
use tauri::State;

type CmdResult<T> = Result<T, String>;
fn err(e: impl ToString) -> String { e.to_string() }

// ── KLIENCI ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn pobierz_klientow(db: State<DbState>) -> CmdResult<Vec<Klient>> {
    let conn = db.0.lock().map_err(err)?;
    let mut stmt = conn.prepare(
        "SELECT id, imie, nazwisko, firma, telefon, email, nip, adres, created_at
         FROM klienci ORDER BY nazwisko, imie"
    ).map_err(err)?;
    let rows = stmt.query_map([], |r| Ok(Klient {
        id: r.get(0)?, imie: r.get(1)?, nazwisko: r.get(2)?, firma: r.get(3)?,
        telefon: r.get(4)?, email: r.get(5)?, nip: r.get(6)?, adres: r.get(7)?,
        created_at: r.get(8)?,
    })).map_err(err)?;
    Ok(rows.collect::<Result<Vec<_>, _>>().map_err(err)?)
}

#[tauri::command]
pub fn szukaj_klientow(db: State<DbState>, fraza: String) -> CmdResult<Vec<Klient>> {
    let conn = db.0.lock().map_err(err)?;
    let p = format!("%{}%", fraza.to_lowercase());
    let mut stmt = conn.prepare(
        "SELECT id, imie, nazwisko, firma, telefon, email, nip, adres, created_at FROM klienci
         WHERE lower(imie) LIKE ?1 OR lower(nazwisko) LIKE ?1
            OR lower(coalesce(firma,'')) LIKE ?1 OR telefon LIKE ?1
         ORDER BY nazwisko, imie"
    ).map_err(err)?;
    let rows = stmt.query_map([&p], |r| Ok(Klient {
        id: r.get(0)?, imie: r.get(1)?, nazwisko: r.get(2)?, firma: r.get(3)?,
        telefon: r.get(4)?, email: r.get(5)?, nip: r.get(6)?, adres: r.get(7)?,
        created_at: r.get(8)?,
    })).map_err(err)?;
    Ok(rows.collect::<Result<Vec<_>, _>>().map_err(err)?)
}

#[tauri::command]
pub fn dodaj_klienta(db: State<DbState>, klient: NowyKlient) -> CmdResult<i64> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO klienci (imie, nazwisko, firma, telefon, email, nip, adres)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![klient.imie, klient.nazwisko, klient.firma,
                          klient.telefon, klient.email, klient.nip, klient.adres],
    ).map_err(err)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn aktualizuj_klienta(db: State<DbState>, klient: Klient) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE klienci SET imie=?1,nazwisko=?2,firma=?3,telefon=?4,email=?5,nip=?6,adres=?7
         WHERE id=?8",
        rusqlite::params![klient.imie, klient.nazwisko, klient.firma,
                          klient.telefon, klient.email, klient.nip, klient.adres, klient.id],
    ).map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn usun_klienta(db: State<DbState>, id: i64) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("DELETE FROM klienci WHERE id=?1", [id]).map_err(err)?;
    Ok(())
}

// ── POJAZDY ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn pobierz_pojazdy(db: State<DbState>) -> CmdResult<Vec<Pojazd>> {
    let conn = db.0.lock().map_err(err)?;
    let mut stmt = conn.prepare(
        "SELECT id, rejestracja, marka, model, rok, vin FROM pojazdy ORDER BY rejestracja"
    ).map_err(err)?;
    let rows = stmt.query_map([], |r| Ok(Pojazd {
        id: r.get(0)?, rejestracja: r.get(1)?, marka: r.get(2)?,
        model: r.get(3)?, rok: r.get(4)?, vin: r.get(5)?,
    })).map_err(err)?;
    Ok(rows.collect::<Result<Vec<_>, _>>().map_err(err)?)
}

#[tauri::command]
pub fn dodaj_pojazd(db: State<DbState>, pojazd: NowyPojazd) -> CmdResult<i64> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO pojazdy (rejestracja, marka, model, rok, vin) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![pojazd.rejestracja, pojazd.marka, pojazd.model, pojazd.rok, pojazd.vin],
    ).map_err(err)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn aktualizuj_pojazd(db: State<DbState>, pojazd: Pojazd) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE pojazdy SET rejestracja=?1,marka=?2,model=?3,rok=?4,vin=?5 WHERE id=?6",
        rusqlite::params![pojazd.rejestracja, pojazd.marka, pojazd.model,
                          pojazd.rok, pojazd.vin, pojazd.id],
    ).map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn usun_pojazd(db: State<DbState>, id: i64) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("DELETE FROM pojazdy WHERE id=?1", [id]).map_err(err)?;
    Ok(())
}

// ── ZLECENIA ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn pobierz_zlecenia(db: State<DbState>) -> CmdResult<Vec<ZlecenieWidok>> {
    let conn = db.0.lock().map_err(err)?;
    let mut stmt = conn.prepare(
        "SELECT z.id, z.klient_id, k.imie, k.nazwisko, k.firma,
                z.pojazd_id, p.rejestracja, p.marka, p.model,
                z.opis, z.status, z.data_przyjecia, z.suma_netto, z.vat, z.suma_brutto
         FROM zlecenia z
         JOIN klienci k ON z.klient_id = k.id
         JOIN pojazdy p ON z.pojazd_id = p.id
         ORDER BY z.id DESC"
    ).map_err(err)?;
    let rows = stmt.query_map([], |r| Ok(ZlecenieWidok {
        id: r.get(0)?, klient_id: r.get(1)?, klient_imie: r.get(2)?,
        klient_nazwisko: r.get(3)?, klient_firma: r.get(4)?,
        pojazd_id: r.get(5)?, rejestracja: r.get(6)?, marka: r.get(7)?,
        model: r.get(8)?, opis: r.get(9)?, status: r.get(10)?,
        data_przyjecia: r.get(11)?, suma_netto: r.get(12)?,
        vat: r.get(13)?, suma_brutto: r.get(14)?,
    })).map_err(err)?;
    Ok(rows.collect::<Result<Vec<_>, _>>().map_err(err)?)
}

#[tauri::command]
pub fn pobierz_zlecenie(db: State<DbState>, id: i64) -> CmdResult<ZlecenieDetail> {
    let conn = db.0.lock().map_err(err)?;
    let zlecenie = conn.query_row(
        "SELECT id,klient_id,pojazd_id,opis,status,data_przyjecia,suma_netto,vat,suma_brutto
         FROM zlecenia WHERE id=?1",
        [id], |r| Ok(Zlecenie {
            id: r.get(0)?, klient_id: r.get(1)?, pojazd_id: r.get(2)?,
            opis: r.get(3)?, status: r.get(4)?, data_przyjecia: r.get(5)?,
            suma_netto: r.get(6)?, vat: r.get(7)?, suma_brutto: r.get(8)?,
        })
    ).map_err(err)?;
    let klient = conn.query_row(
        "SELECT id,imie,nazwisko,firma,telefon,email,nip,adres,created_at FROM klienci WHERE id=?1",
        [zlecenie.klient_id], |r| Ok(Klient {
            id: r.get(0)?, imie: r.get(1)?, nazwisko: r.get(2)?, firma: r.get(3)?,
            telefon: r.get(4)?, email: r.get(5)?, nip: r.get(6)?, adres: r.get(7)?,
            created_at: r.get(8)?,
        })
    ).map_err(err)?;
    let pojazd = conn.query_row(
        "SELECT id,rejestracja,marka,model,rok,vin FROM pojazdy WHERE id=?1",
        [zlecenie.pojazd_id], |r| Ok(Pojazd {
            id: r.get(0)?, rejestracja: r.get(1)?,
            marka: r.get(2)?, model: r.get(3)?, rok: r.get(4)?, vin: r.get(5)?,
        })
    ).map_err(err)?;
    let mut s = conn.prepare(
        "SELECT id,zlecenie_id,nazwa,czas_h,stawka FROM pozycje_robocizna WHERE zlecenie_id=?1"
    ).map_err(err)?;
    let robocizna = s.query_map([id], |r| Ok(PozycjaRobocizna {
        id: r.get(0)?, zlecenie_id: r.get(1)?, nazwa: r.get(2)?,
        czas_h: r.get(3)?, stawka: r.get(4)?,
    })).map_err(err)?.collect::<Result<Vec<_>, _>>().map_err(err)?;
    let mut s = conn.prepare(
        "SELECT id,zlecenie_id,nazwa,ilosc,cena FROM pozycje_czesci WHERE zlecenie_id=?1"
    ).map_err(err)?;
    let czesci = s.query_map([id], |r| Ok(PozycjaChesc {
        id: r.get(0)?, zlecenie_id: r.get(1)?, nazwa: r.get(2)?,
        ilosc: r.get(3)?, cena: r.get(4)?,
    })).map_err(err)?.collect::<Result<Vec<_>, _>>().map_err(err)?;
    let mut s = conn.prepare(
        "SELECT id,zlecenie_id,nazwa,data FROM zdjecia WHERE zlecenie_id=?1"
    ).map_err(err)?;
    let zdjecia = s.query_map([id], |r| Ok(Zdjecie {
        id: r.get(0)?, zlecenie_id: r.get(1)?, nazwa: r.get(2)?, data: r.get(3)?,
    })).map_err(err)?.collect::<Result<Vec<_>, _>>().map_err(err)?;
    Ok(ZlecenieDetail { zlecenie, klient, pojazd, robocizna, czesci, zdjecia })
}

#[tauri::command]
pub fn dodaj_zlecenie(db: State<DbState>, zlecenie: NoweZlecenie) -> CmdResult<i64> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO zlecenia (klient_id,pojazd_id,opis,status) VALUES (?1,?2,?3,?4)",
        rusqlite::params![zlecenie.klient_id, zlecenie.pojazd_id, zlecenie.opis, zlecenie.status],
    ).map_err(err)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn aktualizuj_zlecenie(db: State<DbState>, zlecenie: AktualizacjaZlecenia) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE zlecenia SET opis=?1,status=?2,suma_netto=?3,vat=?4,suma_brutto=?5 WHERE id=?6",
        rusqlite::params![zlecenie.opis, zlecenie.status, zlecenie.suma_netto,
                          zlecenie.vat, zlecenie.suma_brutto, zlecenie.id],
    ).map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn zmien_status(db: State<DbState>, id: i64, status: String) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("UPDATE zlecenia SET status=?1 WHERE id=?2",
        rusqlite::params![status, id]).map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn usun_zlecenie(db: State<DbState>, id: i64) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("DELETE FROM zlecenia WHERE id=?1", [id]).map_err(err)?;
    Ok(())
}

// ── POZYCJE ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn zapisz_pozycje(
    db: State<DbState>,
    zlecenie_id: i64,
    robocizna: Vec<NowaPozycjaRobocizna>,
    czesci: Vec<NowaPozycjaChesc>,
) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("DELETE FROM pozycje_robocizna WHERE zlecenie_id=?1", [zlecenie_id]).map_err(err)?;
    conn.execute("DELETE FROM pozycje_czesci WHERE zlecenie_id=?1", [zlecenie_id]).map_err(err)?;
    for p in &robocizna {
        conn.execute(
            "INSERT INTO pozycje_robocizna (zlecenie_id,nazwa,czas_h,stawka) VALUES (?1,?2,?3,?4)",
            rusqlite::params![zlecenie_id, p.nazwa, p.czas_h, p.stawka],
        ).map_err(err)?;
    }
    for p in &czesci {
        conn.execute(
            "INSERT INTO pozycje_czesci (zlecenie_id,nazwa,ilosc,cena) VALUES (?1,?2,?3,?4)",
            rusqlite::params![zlecenie_id, p.nazwa, p.ilosc, p.cena],
        ).map_err(err)?;
    }
    Ok(())
}

// ── ZDJECIA ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn dodaj_zdjecie(
    db: State<DbState>,
    zlecenie_id: i64,
    nazwa: Option<String>,
    data: String,
) -> CmdResult<i64> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO zdjecia (zlecenie_id,nazwa,data) VALUES (?1,?2,?3)",
        rusqlite::params![zlecenie_id, nazwa, data],
    ).map_err(err)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn usun_zdjecie(db: State<DbState>, id: i64) -> CmdResult<()> {
    let conn = db.0.lock().map_err(err)?;
    conn.execute("DELETE FROM zdjecia WHERE id=?1", [id]).map_err(err)?;
    Ok(())
}
