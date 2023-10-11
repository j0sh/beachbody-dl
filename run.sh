#! /usr/bin/env nix-shell
#! nix-shell -i bash -p deno ffmpeg-full

set -eux

export $(grep -v '^#' run.env | xargs) && ./get-metadata.sh $1
deno run  --allow-run --allow-net --allow-write --allow-read run.ts $1-Metadata.json
