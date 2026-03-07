use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use walkdir::WalkDir;

#[derive(serde::Serialize)]
pub struct SearchResult {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub score: i64,
}

#[tauri::command]
pub fn fuzzy_find(root: String, query: String, max_results: usize) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let matcher = SkimMatcherV2::default();
    let mut results: Vec<SearchResult> = Vec::new();

    for entry in WalkDir::new(&root)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(score) = matcher.fuzzy_match(&name, &query) {
            results.push(SearchResult {
                name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir: entry.file_type().is_dir(),
                score,
            });
        }

        if results.len() > max_results * 10 {
            break;
        }
    }

    results.sort_by(|a, b| b.score.cmp(&a.score));
    results.truncate(max_results);

    Ok(results)
}
