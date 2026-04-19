import sharp from "sharp";

const path =
  "C:\\Users\\siddh\\.cursor\\projects\\c-Users-siddh-Downloads-ecomkart\\assets\\c__Users_siddh_AppData_Roaming_Cursor_User_workspaceStorage_dfe7318d0b6d84125bc877f40e1a7f55_images_lumenskart.in_-43417f61-8f98-42da-b838-cb4b06ca5d88.png";

async function main() {
  const meta = await sharp(path).metadata();
  console.log("size", meta.width, meta.height);

  // 2D downsample for a readable layout preview.
  const W = 60;
  const H = 120;
  console.log("ascii map W/H", W, H);

  const resized = await sharp(path).resize(W, H, { fit: "fill" }).grayscale().raw().toBuffer();

  // cells -> brightness char
  const chars = " .:-=+*#%@";
  const cellFor = (v) => chars[Math.max(0, Math.min(chars.length - 1, Math.round((v / 255) * (chars.length - 1))))];

  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) line += cellFor(resized[y * W + x]);
    console.log(line);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

