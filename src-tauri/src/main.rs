// Previne a janela de console extra no Windows em release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    centro_de_comando_lib::run()
}
