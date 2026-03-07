use std::cmp::Ordering;

pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    natord::compare(a, b)
}
