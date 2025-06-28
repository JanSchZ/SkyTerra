import os

def count_lines_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return sum(1 for line in f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return 0

def count_lines_in_directory(directory):
    total_lines = 0
    excluded_dirs = {'media', 'migrations', 'node_modules', 'venv', '.git', '.idea', '.vscode', 'locale', 'tests/data', 'bin'}
    excluded_extensions = {'.pyc', '.log', '.txt', '.json', '.lock', '.md', '.sh', '.bat', '.env', '.example', '.ttf', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.eot', '.otf', '.webp', '.avif', '.bmp', '.mo', '.pyd', '.gz', '.db', '.sqlite3', '.DS_Store', '.obj', '.dll', '.exe'}
    
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            if any(file.endswith(ext) for ext in excluded_extensions):
                continue
            file_path = os.path.join(root, file)
            total_lines += count_lines_in_file(file_path)
    
    return total_lines

print(count_lines_in_directory('.'))
