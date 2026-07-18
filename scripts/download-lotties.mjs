import fs from "fs";
import path from "path";
import https from "https";

const urls = {
  happy: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/lottie.json",
  thinking: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/lottie.json",
  sad: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/lottie.json",
  celebrating: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/lottie.json"
};

const outputDir = path.resolve("public/lottie");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
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
  for (const [key, url] of Object.entries(urls)) {
    const dest = path.join(outputDir, `${key}.json`);
    console.log(`Downloading ${key} Lottie from ${url} to ${dest}...`);
    try {
      await downloadFile(url, dest);
      console.log(`Downloaded ${key} successfully.`);
    } catch (err) {
      console.error(`Error downloading ${key}:`, err.message);
    }
  }
}

main();
