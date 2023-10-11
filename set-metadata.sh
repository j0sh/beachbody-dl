set -eux

guid="$1"
md="$1"-Metadata.json
title=$(jq -r '.metadata.title' < "$md")
desc=$(jq -r '.metadata.description' < "$md")
program=$(jq -r '.metadata.program' < "$md")

fsTitle=$(echo "$title" | sed 's/[^a-zA-Z0-9. _-]//g' )
fsProgram=$(echo "$program" | sed 's/[^a-zA-Z0-9. _-]//g' )

mkdir -p "workouts/$fsProgram"

ffmpeg -i $guid/$guid.mp4 -i $guid/$guid-English.srt -i $guid/$guid-Thumbnail.gif \
    -map 0 -map 1 -map 2 -c:a copy -c:v:0 copy -c:v:1 png -c:s mov_text -disposition:v:1 attached_pic \
    -metadata:s:s:0 language=eng \
    -metadata title="$title" -metadata show="$program" -metadata descripton="$desc" \
    "workouts/$fsProgram/$guid-$fsTitle".mp4
