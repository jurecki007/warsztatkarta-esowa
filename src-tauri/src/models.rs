use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Klient {
    pub id: i64,
    pub imie: String,
    pub nazwisko: String,
    pub firma: Option<String>,
    pub telefon: String,
    pub email: Option<String>,
    pub nip: Option<String>,
    pub adres: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NowyKlient {
    pub imie: String,
    pub nazwisko: String,
    pub firma: Option<String>,
    pub telefon: String,
    pub email: Option<String>,
    pub nip: Option<String>,
    pub adres: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Pojazd {
    pub id: i64,
    pub rejestracja: String,
    pub marka: String,
    pub model: String,
    pub rok: Option<i64>,
    pub vin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NowyPojazd {
    pub rejestracja: String,
    pub marka: String,
    pub model: String,
    pub rok: Option<i64>,
    pub vin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Zlecenie {
    pub id: i64,
    pub klient_id: i64,
    pub pojazd_id: i64,
    pub opis: Option<String>,
    pub status: String,
    pub data_przyjecia: String,
    pub suma_netto: f64,
    pub vat: f64,
    pub suma_brutto: f64,
    pub numer_faktury: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ZlecenieWidok {
    pub id: i64,
    pub klient_id: i64,
    pub klient_imie: String,
    pub klient_nazwisko: String,
    pub klient_firma: Option<String>,
    pub pojazd_id: i64,
    pub rejestracja: String,
    pub marka: String,
    pub model: String,
    pub opis: Option<String>,
    pub status: String,
    pub data_przyjecia: String,
    pub suma_netto: f64,
    pub vat: f64,
    pub suma_brutto: f64,
    pub numer_faktury: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoweZlecenie {
    pub klient_id: i64,
    pub pojazd_id: i64,
    pub opis: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AktualizacjaZlecenia {
    pub id: i64,
    pub opis: Option<String>,
    pub status: String,
    pub suma_netto: f64,
    pub vat: f64,
    pub suma_brutto: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PozycjaRobocizna {
    pub id: i64,
    pub zlecenie_id: i64,
    pub nazwa: String,
    pub czas_h: f64,
    pub stawka: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NowaPozycjaRobocizna {
    pub nazwa: String,
    pub czas_h: f64,
    pub stawka: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PozycjaChesc {
    pub id: i64,
    pub zlecenie_id: i64,
    pub nazwa: String,
    pub ilosc: f64,
    pub cena: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NowaPozycjaChesc {
    pub nazwa: String,
    pub ilosc: f64,
    pub cena: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Zdjecie {
    pub id: i64,
    pub zlecenie_id: i64,
    pub nazwa: Option<String>,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PresetRobocizny {
    pub id: i64,
    pub nazwa: String,
    pub stawka: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NowyPresetRobocizny {
    pub nazwa: String,
    pub stawka: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ZlecenieDetail {
    pub zlecenie: Zlecenie,
    pub klient: Klient,
    pub pojazd: Pojazd,
    pub robocizna: Vec<PozycjaRobocizna>,
    pub czesci: Vec<PozycjaChesc>,
    pub zdjecia: Vec<Zdjecie>,
}
