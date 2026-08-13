import { copyFile, access } from "node:fs/promises";
import path from "node:path";

const rootLogo = path.resolve(process.cwd(), "applogo.png");
const publicLogo = path.resolve(process.cwd(), "public", "applogo.png");

try {
  await access(rootLogo);
  await copyFile(rootLogo, publicLogo);
  console.log("Copied root applogo.png to public/applogo.png");
} catch {
  console.log("No root applogo.png found; keeping the bundled placeholder logo.");
}
