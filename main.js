var loadingText = document.querySelector("#loading-text");
const originalFetch = window.fetch;
const RAW_BASE = "https://raw.githubusercontent.com/1ts-Alec/cruelty-squad/d6031d1cb398b8aee538b3cece09f6091ef0b938/";
let loadedBytes = 0;

async function fetchWithProgress(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed " + url + " " + response.status);
  const reader = response.body.getReader();
  let chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    loadedBytes += value.length;
    chunks.push(value);
    let mbDone = (loadedBytes / (1024 * 1024)).toFixed(2);
    if (loadingText) loadingText.textContent = `LOADING... ${mbDone} MB / 540.66 MB`;
  }
  let fullBuffer = new Uint8Array(received);
  let offset = 0;
  for (let chunk of chunks) {
    fullBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  return fullBuffer.buffer;
}

async function mergeFiles(fileParts, cacheKey) {
  const cache = await caches.open("cruelty-squad-cache");
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }
  const buffers = await Promise.all(fileParts.map(part => fetchWithProgress(part)));
  const mergedBlob = new Blob(buffers);
  await cache.put(cacheKey, new Response(mergedBlob));
  return URL.createObjectURL(mergedBlob);
}

function getParts(file, start, end) {
  let parts = [];
  for (let i = start; i <= end; i++) {
    parts.push(RAW_BASE + file + ".part" + i);
  }
  return parts;
}

(async () => {
  const [pckUrl] = await Promise.all([
    mergeFiles(getParts("index.pck", 1, 28), "index.pck"),
  ]);
  window.fetch = async function (url, ...args) {
    if (typeof url === "string" && url.endsWith("index.pck")) {
      return originalFetch(pckUrl, ...args);
    }
    return originalFetch(url, ...args);
  };
  window.godotRunStart();
})();
