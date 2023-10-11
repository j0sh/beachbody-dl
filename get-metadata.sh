set -eux
# guid needs to be something like BBR0031
guid="$1"
token="$BEACHBODY_TOKEN"
apiKey="$BEACHBODY_API_KEY"
curl "https://api.prod.cd.beachbodyondemand.com/video-api/v2/mediaData/$guid?platform=web" \
  -o "$guid"-Metadata.json \
  -H 'authority: api.prod.cd.beachbodyondemand.com' \
  -H 'accept: */*' \
  -H 'accept-language: en_us' \
  -H "authorization: Bearer $token" \
  -H 'bodweb: true' \
  -H 'origin: https://www.beachbodyondemand.com' \
  -H 'sec-ch-ua: "Not.A/Brand";v="8", "Chromium";v="118", "Google Chrome";v="118"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36' \
  -H "x-api-key: $apiKey" \
  --compressed
