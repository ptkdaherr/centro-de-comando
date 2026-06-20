// Centro de Comando — shell Tauri com servidor Node embutido (sidecar).
//
// No boot: inicia `node server/index.mjs` (empacotado nos resources), apontando
// o banco/credenciais pra um diretório gravável (CDC_DATA_DIR = app_data_dir),
// espera a porta 5174 responder e então abre a janela já com o app carregado.
// Ao fechar a janela, o processo Node é encerrado.

use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

struct NodeProc(Mutex<Option<Child>>);

fn wait_port(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    false
}

// Remove o prefixo \\?\ (verbatim/extended-length) dos paths do Windows.
// O Node não resolve caminhos verbatim e quebra com "EISDIR lstat 'C:'".
fn strip_verbatim(p: std::path::PathBuf) -> std::path::PathBuf {
    let s = p.to_string_lossy().to_string();
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        std::path::PathBuf::from(rest)
    } else {
        p
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let resource_dir = strip_verbatim(handle.path().resource_dir()?);
            let data_dir = strip_verbatim(handle.path().app_data_dir()?);
            std::fs::create_dir_all(&data_dir).ok();

            let node_exe = resource_dir.join("binaries").join("node.exe");
            let server_js = resource_dir.join("server").join("index.mjs");

            match Command::new(&node_exe)
                .arg(&server_js)
                .current_dir(&resource_dir)
                .env("PORT", "5174")
                .env("CDC_DATA_DIR", &data_dir)
                .spawn()
            {
                Ok(child) => { handle.manage(NodeProc(Mutex::new(Some(child)))); }
                Err(e) => { eprintln!("Centro de Comando: falha ao iniciar o servidor Node: {e}"); }
            }

            // espera o servidor subir e abre a janela já com o app pronto
            wait_port(5174, Duration::from_secs(20));
            WebviewWindowBuilder::new(
                &handle,
                "main",
                WebviewUrl::External("http://localhost:5174".parse().unwrap()),
            )
            .title("Centro de Comando")
            .inner_size(1280.0, 820.0)
            .min_inner_size(940.0, 600.0)
            .center()
            .build()?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<NodeProc>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Centro de Comando");
}
