#!/bin/sh
# Refuses a release whose tag is not exactly "v" + the package.json version.
# A mismatch means the version was not bumped, or the wrong commit was tagged.
set -eu
tag="${1:?usage: check-release-tag.sh <tag>}"
version="v$(node -p 'require("./package.json").version')"
if [ "$tag" != "$version" ]; then
  echo "Tag $tag does not match package.json version $version. Bump the version or tag the right commit." >&2
  exit 1
fi
echo "Tag $tag matches package.json."
