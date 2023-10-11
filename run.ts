type BBMetadata = {
    metadata: {
        guid: string;
        program: string;
        title: string;
        description: string;
    };
    thumbnail: {
        image: string;
    },
    captions: { url: string, type: "SRT", language: string }[]
}

function fileSuffix(md:BBRMetadata, suffix:string){
    const guid = md.metadata.guid;
    return guid+"/"+guid+suffix;
}

function getExtension(s:string){
    const ext = s.match(/\.\w+/)[0];
    if (ext) return ext;
    console.error("No extension found for", ext);
    Deno.exit(1);
}

function captionURL(md:BBRMetadata):string{
    const captionMeta = md.captions.find(e => e.language === "en" && e.type === "SRT");
    if (!captionMeta) {
        console.error("English capttions not found in metadata");
        return undefined;
    }
    return captionMeta.url;
}

async function fetchToFile(url, dest){
    const res = await fetch(url);
    await Deno.writeTextFile(dest, await res.text());
}

async function fetchBinaryFile(url, dest){
    const res = await fetch(url);
    await Deno.writeFile(dest, res.body);
}

function findBestPlaylist(inp:string){
    // find best m3u8 based on BANDWIDTH attribute, eg
    //
    // #EXT-X-STREAM-INF:BANDWIDTH=2423836,AVERAGE-BANDWIDTH=2201702,CODECS="avc1.4d401f,mp4a.40.2",RESOLUT'... 68 more characters,
    // "BBR0032_Main_A.m3u8"
    // #EXT-X-STREAM-INF:BANDWIDTH=8675123,AVERAGE-BANDWIDTH=7163926,CODECS="avc1.640028,mp4a.40.2",RESOLUT'...
    // "BBR0032_Main_B.m3u8"
    // #EXT-X-STREAM-INF:BANDWIDTH=6474256,AVERAGE-BANDWIDTH=5152971,CODECS="avc1.640028,mp4a.40.2",RESOLUT'...
    // "BBR0032_Main_C.m3u8"
    //

    // take initial output (from grep) and break it into pairs of lines
    // format should be [ EXT-X-STREAM-INF , m3u8 ]
    const array = inp.trim().split("\n");
    const groupSize = 2;
    const groups = [];
    for (let i = 0; i < array.length; i += groupSize) {
        groups.push(array.slice(i, i + groupSize));
    }

    // extract BANDWIDTH attribute from first element in pair,
    // return second element in pair that has the largest bandwidth
    const bwRe = /:BANDWIDTH=([0-9]+)/
    let maxBw = 0;
    const bestQualityManifest = groups.reduce((acc, g) => {
        const bw = parseInt(g[0].match(bwRe)[1])
        if (bw > maxBw) {
            maxBw = bw;
            return g[1];
        }
        return acc;
    }, undefined);

    if (!bestQualityManifest) {
        Deno.error("Unable to find best quality manifest");
        Deno.exit(1);
    }

    return bestQualityManifest;
}

async function runGrep(f:string){
    const cmd = new Deno.Command("grep", {
        args: [
            "--no-group-separator",
            "-A1",
            "EXT-X-STREAM-INF",
            f,
        ],
    });
    const { code, stdout, stderr } = await cmd.output();
    console.assert(code === 0);
    return new TextDecoder().decode(stdout);
}

async function getBestQualityPlaylist(mainManifest:string){
    const grepOut = await runGrep(mainManifest);
    return findBestPlaylist(grepOut);
}

function getPlaylistURL(mainManifestURL:string, bestManifest:string){
    const u = new URL(mainManifestURL);
    const paths = u.pathname.split("/");
    paths[paths.length-1] = bestManifest;
    return u.origin + paths.join("/");
}

async function runFFmpeg(playlist:string, out:string){
    const cmd = new Deno.Command("ffmpeg", {
        stdout: "piped",
        stderr: "piped",
        args: [
            "-i", playlist,
            "-c", "copy",
            out,
        ],
    });
    const process = cmd.spawn();
    process.stdout.pipeTo(Deno.stdout.writable, { preventClose: true });
    process.stderr.pipeTo(Deno.stderr.writable, { preventClose: true });
    const { code } = await process.status;

    console.assert(code === 0);
}

const metadataFile = Deno.args[0];
if (!metadataFile) {
    console.error("Usage: <metadata file>");
    Deno.exit(1);
}
const md = JSON.parse(Deno.readTextFileSync(metadataFile));
const guid = md.metadata.guid;

const ccURL = captionURL(md);
const mainManifestURL = md.urls.playbackStandard;
const thumbURL = md.thumbnail.image;
const thumbExt = ".gif" //getExtension(thumbURL);
const mainManifestFile = fileSuffix(md, "-MainManifest.m3u8");
const ccFile = fileSuffix(md, "-English.srt");
const mp4File = fileSuffix(md, ".mp4");
const subFile = fileSuffix(md, "-Subtitles.mp4");
const thumbFile = fileSuffix(md, "-Thumbnail"+getExtension(thumbExt));

Deno.mkdir(guid, { recursive: true });

await fetchToFile(ccURL, ccFile);
await fetchBinaryFile(thumbURL, thumbFile);
await fetchToFile(mainManifestURL, mainManifestFile);
const bestPlaylist = await getBestQualityPlaylist(mainManifestFile);
const playlistURL = getPlaylistURL(mainManifestURL, bestPlaylist);
await runFFmpeg(playlistURL, mp4File);
