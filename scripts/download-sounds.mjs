import fs from "fs";
import path from "path";
import https from "https";

const baseUrl = "https://raw.githubusercontent.com/wesbos/JavaScript30/master/01%20-%20JavaScript%20Drum%20Kit/sounds/";

const sounds = {
  success: "clap.wav",
  hint: "openhat.wav",
  ambient: "kick.wav",
  tick: "tink.wav",
  gacha: "snare.wav",
  crystal: "ride.wav",
  click: "hihat.wav",
  level_up: "boom.wav",
  achievement: "tom.wav",
  fail: "clap.wav" // reuse for 10th file
};

const outputDir = path.resolve("public/sounds");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }
      
      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  for (const [key, filename] of Object.entries(sounds)) {
    const url = `${baseUrl}${filename}`;
    const dest = path.join(outputDir, `${key}.wav`);
    console.log(`Downloading ${key} sound from ${url} to ${dest}...`);
    try {
      await downloadFile(url, dest);
      console.log(`Downloaded ${key} sound successfully.`);
    } catch (err) {
      console.error(`Error downloading ${key} sound:`, err.message);
    }
  }
}

main();
