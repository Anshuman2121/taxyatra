use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::sync::{Arc, Mutex};
use tauri::Manager;

struct SidecarState(Arc<Mutex<Option<u16>>>);

#[tauri::command]
fn get_sidecar_port(state: tauri::State<SidecarState>) -> Result<u16, String> {
    let port = state.0.lock().map_err(|_| "Failed to lock state")?;
    match *port {
        Some(p) => Ok(p),
        None => Err("Sidecar not ready".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  use tauri_plugin_sql::{Builder, Migration, MigrationKind};

  let migrations = vec![
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: include_str!("../migrations/1_init.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "fix_jurisdiction_fk",
      sql: include_str!("../migrations/2_fix_jurisdiction.sql"),
      kind: MigrationKind::Up,
    }
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(
        Builder::default()
        .add_migrations("sqlite:taxyatra.db", migrations)
        .build()
    )
    .manage(SidecarState(Arc::new(Mutex::new(None))))
    .invoke_handler(tauri::generate_handler![get_sidecar_port])
    .setup(|app| {
        let handle = app.handle().clone();
        
        tauri::async_runtime::spawn(async move {
            let (mut rx, _) = handle.shell().sidecar("taxyatra-sidecar")
                .expect("failed to create sidecar")
                .spawn()
                .expect("Failed to spawn sidecar");

            let state = handle.state::<SidecarState>();
            
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                         let line_str = String::from_utf8_lossy(&line);
                         // println!("Sidecar STDOUT: {}", line_str); // Uncomment for full debug
                         if line_str.contains("PORT:") {
                            let port_str = line_str.trim().split(":").last().unwrap_or("").trim();
                            if let Ok(port) = port_str.parse::<u16>() {
                                println!("Sidecar running on port: {}", port);
                                let mutex = state.0.clone();
                                if let Ok(mut p) = mutex.lock() {
                                    *p = Some(port);
                                };
                            }
                         } else {
                            println!("Sidecar: {}", line_str);
                         }
                    }
                    CommandEvent::Stderr(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        println!("Sidecar STDERR: {}", line_str);
                    }
                    CommandEvent::Error(err) => {
                        println!("Sidecar ERROR: {}", err);
                    }
                    CommandEvent::Terminated(payload) => {
                        println!("Sidecar TERMINATED: {:?}", payload);
                    }
                    _ => {}
                }
            }
        });
        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
