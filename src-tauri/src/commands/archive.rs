use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

/// Determine the output directory for extraction.
/// If dest is provided, use it. Otherwise, derive from archive filename.
fn resolve_dest(archive_path: &Path, dest: Option<String>) -> PathBuf {
    if let Some(d) = dest {
        return PathBuf::from(d);
    }

    let parent = archive_path.parent().unwrap_or(Path::new("."));
    let stem = strip_archive_extensions(archive_path);
    parent.join(stem)
}

/// Strip known compound extensions like .tar.gz, .tar.bz2, etc.
fn strip_archive_extensions(path: &Path) -> String {
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let lower = name.to_lowercase();

    for compound in &[".tar.gz", ".tar.bz2", ".tar.xz"] {
        if lower.ends_with(compound) {
            return name[..name.len() - compound.len()].to_string();
        }
    }

    // Single extension
    Path::new(&name)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

#[derive(Debug)]
enum ArchiveFormat {
    Zip,
    SevenZ,
    Tar,
    TarGz,
    TarBz2,
}

fn detect_format(path: &Path) -> Result<ArchiveFormat, String> {
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();

    if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        Ok(ArchiveFormat::TarGz)
    } else if name.ends_with(".tar.bz2") || name.ends_with(".tbz2") {
        Ok(ArchiveFormat::TarBz2)
    } else if name.ends_with(".tar") {
        Ok(ArchiveFormat::Tar)
    } else if name.ends_with(".zip") {
        Ok(ArchiveFormat::Zip)
    } else if name.ends_with(".7z") {
        Ok(ArchiveFormat::SevenZ)
    } else if name.ends_with(".gz") || name.ends_with(".bz2") {
        Err(format!("Standalone .gz/.bz2 not supported — only .tar.gz and .tar.bz2: {}", name))
    } else {
        Err(format!("Unsupported archive format: {}", name))
    }
}

#[tauri::command]
pub fn extract_archive(path: String, dest: Option<String>) -> Result<String, String> {
    let archive_path = Path::new(&path);
    if !archive_path.exists() {
        return Err(format!("Archive not found: {}", path));
    }

    let dest_dir = resolve_dest(archive_path, dest);
    fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create dest dir: {}", e))?;

    let format = detect_format(archive_path)?;

    match format {
        ArchiveFormat::Zip => extract_zip(archive_path, &dest_dir)?,
        ArchiveFormat::SevenZ => extract_7z(archive_path, &dest_dir)?,
        ArchiveFormat::Tar => extract_tar(archive_path, &dest_dir)?,
        ArchiveFormat::TarGz => extract_tar_gz(archive_path, &dest_dir)?,
        ArchiveFormat::TarBz2 => extract_tar_bz2(archive_path, &dest_dir)?,
    }

    Ok(dest_dir.to_string_lossy().to_string())
}

fn extract_zip(path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = dest.join(entry.mangled_name());

        // Guard against path traversal (zip slip)
        if !outpath.starts_with(dest) {
            return Err(format!("Path traversal attempt blocked: {:?}", entry.mangled_name()));
        }

        if entry.is_dir() {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn extract_7z(path: &Path, dest: &Path) -> Result<(), String> {
    sevenz_rust::decompress_file(path, dest).map_err(|e| format!("7z extraction failed: {}", e))
}

fn extract_tar(path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = tar::Archive::new(file);
    archive.unpack(dest).map_err(|e| format!("tar extraction failed: {}", e))
}

fn extract_tar_gz(path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let gz = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(gz);
    archive.unpack(dest).map_err(|e| format!("tar.gz extraction failed: {}", e))
}

fn extract_tar_bz2(path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let bz = bzip2::read::BzDecoder::new(file);
    let mut archive = tar::Archive::new(bz);
    archive.unpack(dest).map_err(|e| format!("tar.bz2 extraction failed: {}", e))
}

#[tauri::command]
pub fn compress_archive(paths: Vec<String>, dest: String, format: String) -> Result<String, String> {
    match format.to_lowercase().as_str() {
        "zip" => compress_zip(&paths, &dest)?,
        "7z" => compress_7z(&paths, &dest)?,
        "tar.gz" | "tgz" => compress_tar_gz(&paths, &dest)?,
        _ => return Err(format!("Unsupported compression format: {}", format)),
    }
    Ok(dest)
}

fn compress_zip(paths: &[String], dest: &str) -> Result<(), String> {
    let file = fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for source in paths {
        let src_path = Path::new(source);
        if src_path.is_dir() {
            let base = src_path.parent().unwrap_or(src_path);
            add_dir_to_zip(&mut writer, src_path, base, &options)?;
        } else {
            let name = src_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            writer.start_file(&name, options).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(src_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut writer).map_err(|e| e.to_string())?;
        }
    }

    writer.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn add_dir_to_zip(
    writer: &mut zip::ZipWriter<fs::File>,
    dir: &Path,
    base: &Path,
    options: &zip::write::SimpleFileOptions,
) -> Result<(), String> {
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path
            .strip_prefix(base)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            let dir_name = if rel.ends_with('/') {
                rel.clone()
            } else {
                format!("{}/", rel)
            };
            writer
                .add_directory(&dir_name, *options)
                .map_err(|e| e.to_string())?;
        } else {
            writer.start_file(&rel, *options).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, writer).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn compress_7z(paths: &[String], dest: &str) -> Result<(), String> {
    let dest_path = Path::new(dest);
    let sz_file = fs::File::create(dest_path).map_err(|e| e.to_string())?;
    let mut writer =
        sevenz_rust::SevenZWriter::new(sz_file).map_err(|e| format!("7z create failed: {}", e))?;

    for source in paths {
        let src_path = Path::new(source);
        if src_path.is_dir() {
            add_dir_to_7z(&mut writer, src_path, src_path.parent().unwrap_or(src_path))?;
        } else {
            let name = src_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let f = fs::File::open(src_path).map_err(|e| e.to_string())?;
            let mut entry = sevenz_rust::SevenZArchiveEntry::default();
            entry.name = name;
            writer
                .push_archive_entry(entry, Some(f))
                .map_err(|e| format!("7z add file failed: {}", e))?;
        }
    }

    writer
        .finish()
        .map_err(|e| format!("7z finish failed: {}", e))?;
    Ok(())
}

fn add_dir_to_7z(
    writer: &mut sevenz_rust::SevenZWriter<fs::File>,
    dir: &Path,
    base: &Path,
) -> Result<(), String> {
    for entry in walkdir::WalkDir::new(dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            continue;
        }
        let rel = path
            .strip_prefix(base)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let f = fs::File::open(path).map_err(|e| e.to_string())?;
        let mut entry = sevenz_rust::SevenZArchiveEntry::default();
        entry.name = rel;
        writer
            .push_archive_entry(entry, Some(f))
            .map_err(|e| format!("7z add file failed: {}", e))?;
    }
    Ok(())
}

fn compress_tar_gz(paths: &[String], dest: &str) -> Result<(), String> {
    let file = fs::File::create(dest).map_err(|e| e.to_string())?;
    let gz = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut tar_builder = tar::Builder::new(gz);

    for source in paths {
        let src_path = Path::new(source);
        if src_path.is_dir() {
            let dir_name = src_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            tar_builder.append_dir_all(&dir_name, src_path).map_err(|e| format!("tar.gz add dir failed: {}", e))?;
        } else {
            let name = src_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let mut f = fs::File::open(src_path).map_err(|e| e.to_string())?;
            tar_builder.append_file(&name, &mut f).map_err(|e| format!("tar.gz add file failed: {}", e))?;
        }
    }

    let gz = tar_builder.into_inner().map_err(|e| format!("tar finalize failed: {}", e))?;
    gz.finish().map_err(|e| format!("gz finalize failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn list_archive(path: String) -> Result<Vec<String>, String> {
    let archive_path = Path::new(&path);
    if !archive_path.exists() {
        return Err(format!("Archive not found: {}", path));
    }

    let format = detect_format(archive_path)?;

    match format {
        ArchiveFormat::Zip => list_zip(archive_path),
        ArchiveFormat::SevenZ => Ok(vec!["(7z listing not yet supported)".to_string()]),
        ArchiveFormat::Tar => list_tar(archive_path),
        ArchiveFormat::TarGz => list_tar_gz(archive_path),
        ArchiveFormat::TarBz2 => list_tar_bz2(archive_path),
    }
}

fn list_zip(path: &Path) -> Result<Vec<String>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    Ok((0..archive.len())
        .filter_map(|i| {
            archive
                .name_for_index(i)
                .map(|n| n.to_string())
        })
        .collect())
}

fn list_tar(path: &Path) -> Result<Vec<String>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = tar::Archive::new(file);
    collect_tar_entries(&mut archive)
}

fn list_tar_gz(path: &Path) -> Result<Vec<String>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let gz = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(gz);
    collect_tar_entries(&mut archive)
}

fn list_tar_bz2(path: &Path) -> Result<Vec<String>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let bz = bzip2::read::BzDecoder::new(file);
    let mut archive = tar::Archive::new(bz);
    collect_tar_entries(&mut archive)
}

fn collect_tar_entries<R: Read>(archive: &mut tar::Archive<R>) -> Result<Vec<String>, String> {
    let entries = archive.entries().map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?;
        names.push(path.to_string_lossy().to_string());
    }
    Ok(names)
}
