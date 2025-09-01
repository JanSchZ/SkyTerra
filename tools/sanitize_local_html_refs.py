import sys
import os
import re
import ntpath


def sanitize_directory(target_root: str) -> int:
    pattern = re.compile(r"file:///[A-Za-z]:[^\s\"'<>)]*")
    modified_count = 0
    changed_paths = []

    for dirpath, _dirnames, filenames in os.walk(target_root):
        for filename in filenames:
            lower = filename.lower()
            if not (lower.endswith('.html') or lower.endswith('.htm') or lower.endswith('.js')):
                continue
            path = os.path.join(dirpath, filename)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                def _to_relative(match: re.Match) -> str:
                    uri = match.group(0)
                    base, sep, query = uri.partition('?')
                    basename = ntpath.basename(base)
                    return basename + (sep + query if sep else '')

                new_content = pattern.sub(_to_relative, content)
                if new_content != content:
                    with open(path, 'w', encoding='utf-8', errors='ignore') as f:
                        f.write(new_content)
                    modified_count += 1
                    changed_paths.append(path)
            except Exception:
                # Skip unreadable files silently
                pass

    print(f"modified {modified_count} files")
    for p in changed_paths[:50]:
        print(f"- {p}")
    return modified_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python sanitize_local_html_refs.py <target_directory>")
        sys.exit(1)
    target_root = sys.argv[1]
    if not os.path.isdir(target_root):
        print(f"Not a directory: {target_root}")
        sys.exit(2)
    sanitize_directory(target_root)


if __name__ == '__main__':
    main()


