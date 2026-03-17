pub mod commands;
pub mod db;
pub mod models;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let app_data = app.path().app_data_dir()?;
            let db_path = app_data.join("app.db");
            let conn = db::inicjalizuj_baze(&db_path).map_err(|e| {
                tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
            })?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pobierz_klientow,
            commands::szukaj_klientow,
            commands::dodaj_klienta,
            commands::aktualizuj_klienta,
            commands::usun_klienta,
            commands::pobierz_pojazdy,
            commands::dodaj_pojazd,
            commands::aktualizuj_pojazd,
            commands::usun_pojazd,
            commands::pobierz_zlecenia,
            commands::pobierz_zlecenie,
            commands::dodaj_zlecenie,
            commands::aktualizuj_zlecenie,
            commands::zmien_status,
            commands::usun_zlecenie,
            commands::zapisz_pozycje,
            commands::dodaj_zdjecie,
            commands::usun_zdjecie,
            commands::zapisz_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("błąd podczas uruchamiania aplikacji");
}
