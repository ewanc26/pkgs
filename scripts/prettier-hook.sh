#!/bin/bash
# Pre-commit hook script to run prettier in the correct directories

# Get the list of files to check
files="$@"

# Find packages with prettier configs
packages_with_prettier=$(find packages -name ".prettierrc*" -type f | xargs dirname | sort | uniq)

# Run prettier for files in packages with configs
for package_dir in $packages_with_prettier; do
  package_files=$(echo "$files" | grep "^$package_dir/" || true)
  if [ -n "$package_files" ]; then
    echo "Running prettier in $package_dir..."
    cd "$package_dir" && pnpm exec prettier --write --ignore-unknown $package_files
    cd - > /dev/null
  fi
done

# Run prettier at root for files not in packages with configs
root_files=$(echo "$files" | grep -v "^packages/" || true)
if [ -n "$root_files" ]; then
  echo "Running prettier at root..."
  pnpm exec prettier --write --ignore-unknown $root_files
fi