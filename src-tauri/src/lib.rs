use image::ImageFormat;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize, Deserialize, Clone)]
struct ProgressPayload {
    progress: u32,
    total: u32,
    current_file: String,
}

#[derive(Serialize)]
struct ConvertResponse {
    success: bool,
    error: Option<String>,
}

#[tauri::command]
fn get_default_output_dir() -> String {
    let default_dir = dirs::picture_dir().unwrap_or_else(|| PathBuf::from("C:\\Users\\Default\\Pictures"));
    default_dir.to_string_lossy().into_owned()
}

#[tauri::command]
async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;
    
    let (tx, rx) = mpsc::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    
    match rx.recv() {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn convert_images(app: AppHandle, files: Vec<String>, target_format: String, output_dir: String) -> Result<ConvertResponse, String> {
    if files.is_empty() {
        return Ok(ConvertResponse { success: false, error: Some("No files selected".to_string()) });
    }

    let base_dir = Path::new(&output_dir);
    let target_dir = base_dir.join(&target_format);

    if !target_dir.exists() {
        if let Err(e) = fs::create_dir_all(&target_dir) {
            return Ok(ConvertResponse { success: false, error: Some(format!("Failed to create output folder: {}", e)) });
        }
    }

    let format = match target_format.as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "avif" => ImageFormat::Avif,
        _ => ImageFormat::Png,
    };

    let total = files.len() as u32;
    let mut converted = 0u32;
    let mut errors: Vec<String> = Vec::new();

    for (i, file_path_str) in files.iter().enumerate() {
        let file_path = Path::new(file_path_str);
        if let Some(file_name) = file_path.file_stem() {
            let mut new_file_name = file_name.to_owned();
            new_file_name.push(".");
            new_file_name.push(&target_format);
            
            let target_path = target_dir.join(new_file_name);
            
            let img_result = (|| -> Result<image::DynamicImage, String> {
                let file = fs::File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;
                let reader = std::io::BufReader::new(file);
                let guessed = image::ImageReader::new(reader)
                    .with_guessed_format()
                    .map_err(|e| format!("Failed to detect format: {}", e))?;
                
                guessed.decode().map_err(|e| format!("Failed to decode image: {}", e))
            })();
            
            match img_result {
                Ok(img) => {
                    if target_format == "png" {
                        let res = (|| -> Result<(), String> {
                            let mut liq = imagequant::new();
                            liq.set_quality(65, 85).map_err(|e| format!("Failed to set imagequant quality: {:?}", e))?;
                            
                            let width = img.width() as usize;
                            let height = img.height() as usize;
                            let pixels: Vec<imagequant::RGBA> = img.to_rgba8()
                                .pixels()
                                .map(|p| imagequant::RGBA::new(p[0], p[1], p[2], p[3]))
                                .collect();
                            
                            let mut liq_img = liq.new_image(pixels, width, height, 0.0)
                                .map_err(|e| format!("Failed to load imagequant pixels: {:?}", e))?;
                            
                            let mut res = liq.quantize(&mut liq_img)
                                .map_err(|e| format!("Quantization failed: {:?}", e))?;
                            
                            let (palette, remapped_pixels) = res.remapped(&mut liq_img)
                                .map_err(|e| format!("Pixel remap failed: {:?}", e))?;
                            
                            let mut quant_buffer = image::ImageBuffer::new(width as u32, height as u32);
                            for (idx, pixel) in quant_buffer.pixels_mut().enumerate() {
                                let c = palette[remapped_pixels[idx] as usize];
                                *pixel = image::Rgba([c.r, c.g, c.b, c.a]);
                            }
                            
                            let quant_img = image::DynamicImage::ImageRgba8(quant_buffer);
                            quant_img.save_with_format(&target_path, image::ImageFormat::Png)
                                .map_err(|e| format!("Failed to save quantized PNG: {}", e))?;
                            
                            let options = oxipng::Options::default();
                            oxipng::optimize(
                                &oxipng::InFile::Path(target_path.clone()),
                                &oxipng::OutFile::Path {
                                    path: Some(target_path.clone()),
                                    preserve_attrs: false,
                                },
                                &options,
                            )
                            .map_err(|e| format!("Failed to optimize with oxipng: {}", e))?;
                            
                            Ok(())
                        })();

                        match res {
                            Ok(_) => converted += 1,
                            Err(e) => errors.push(format!("{}: {}", file_path_str, e)),
                        }
                    } else if target_format == "webp" {
                        match webp::Encoder::from_image(&img) {
                            Ok(encoder) => {
                                let memory = encoder.encode(80.0); // 80.0 is a good lossy quality setting
                                if let Err(e) = fs::write(&target_path, &*memory) {
                                    errors.push(format!("{}: Failed to write WebP file: {}", file_path_str, e));
                                } else {
                                    converted += 1;
                                }
                            }
                            Err(e) => {
                                errors.push(format!("{}: Failed to create WebP encoder: {:?}", file_path_str, e));
                            }
                        }
                    } else if target_format == "avif" {
                        let res = (|| -> Result<(), String> {
                            let width = img.width() as usize;
                            let height = img.height() as usize;
                            let pixels: Vec<ravif::RGBA8> = img.to_rgba8()
                                .pixels()
                                .map(|p| ravif::RGBA8::new(p[0], p[1], p[2], p[3]))
                                .collect();
                            
                            let img_ref = imgref::Img::new(pixels.as_slice(), width, height);
                            
                            let res = ravif::Encoder::new()
                                .with_quality(80.0)
                                .with_speed(5)
                                .encode_rgba(img_ref)
                                .map_err(|e| format!("Failed to encode AVIF with ravif: {:?}", e))?;
                            
                            fs::write(&target_path, res.avif_file)
                                .map_err(|e| format!("Failed to write AVIF file: {}", e))?;
                            
                            Ok(())
                        })();

                        match res {
                            Ok(_) => converted += 1,
                            Err(e) => errors.push(format!("{}: {}", file_path_str, e)),
                        }
                    } else {
                        if let Err(e) = img.save_with_format(&target_path, format) {
                            errors.push(format!("{}: Failed to save: {}", file_path_str, e));
                        } else {
                            converted += 1;
                        }
                    }
                }
                Err(e) => {
                    errors.push(format!("{}: {}", file_path_str, e));
                }
            }
        }
        
        let progress = ((i as f32 + 1.0) / total as f32 * 100.0) as u32;
        let _ = app.emit("convert-progress", ProgressPayload {
            progress,
            total,
            current_file: file_path_str.clone(),
        });
    }

    if converted == 0 && !errors.is_empty() {
        return Ok(ConvertResponse { success: false, error: Some(errors.join(", ")) });
    }

    Ok(ConvertResponse { success: true, error: if errors.is_empty() { None } else { Some(errors.join(", ")) } })
}

#[tauri::command]
fn open_folder_path(path: String) -> Result<(), String> {
    let folder_path = PathBuf::from(&path);

    if !folder_path.exists() {
        return Err("Folder tidak ditemukan".to_string());
    }

    if !folder_path.is_dir() {
        return Err("Path bukan folder".to_string());
    }

    Command::new("explorer")
        .arg(folder_path)
        .spawn()
        .map_err(|e| format!("Gagal membuka folder: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_default_output_dir,
            select_directory,
            convert_images,
            open_folder_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
