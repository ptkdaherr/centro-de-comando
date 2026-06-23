// Centro de Comando — app de desktop (Tauri).
// Carrega a versão HOSPEDADA (mesmo login/dados do celular), inicia junto com o
// Windows, fica na bandeja (fechar a janela esconde, continua rodando p/ notificar)
// e expõe a API do Tauri pra notificações nativas.

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

const APP_URL: &str = "https://centro-de-comando-xadx.onrender.com";

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // instância única: abrir o app uma 2ª vez foca a janela já aberta (em vez de abrir outra).
        // DEVE ser o primeiro plugin registrado (recomendação do Tauri).
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            let handle = app.handle().clone();

            // janela principal: carrega o app hospedado
            WebviewWindowBuilder::new(&handle, "main", WebviewUrl::External(APP_URL.parse().unwrap()))
                .title("Centro de Comando")
                .inner_size(1280.0, 820.0)
                .min_inner_size(940.0, 600.0)
                .decorations(false) // sem barra nativa: a barra própria do app (frameless) é a única
                .center()
                .build()?;

            // inicia junto com o Windows (silencioso na bandeja)
            let _ = app.autolaunch().enable();

            // ícone na bandeja: Abrir / Sair
            let abrir = MenuItem::with_id(app, "abrir", "Abrir", true, None::<&str>)?;
            let sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&abrir, &sair])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Centro de Comando")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "abrir" => show_main(app),
                    "sair" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        // tratamento de eventos da janela
        .on_window_event(|window, event| match event {
            // fechar a janela só esconde pra bandeja (mantém rodando p/ notificações)
            WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            // Correção do bug do WebView2 em janela SEM bordas (decorations:false):
            // ao redimensionar a janela, o WebView2 não recalcula sozinho a área de
            // desenho (bug "won't fix" tauri-apps/tauri#6609) — o conteúdo não encolhe
            // e sobram faixas pretas. Re-aplicar o tamanho DO WEBVIEW (não da janela)
            // força o controller a recalcular os bounds; não entra em loop porque
            // redimensionar o webview não re-emite WindowEvent::Resized.
            WindowEvent::Resized(size) => {
                for wv in window.webviews() {
                    let _ = wv.set_size(*size);
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Centro de Comando");
}
