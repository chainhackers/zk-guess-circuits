import { zKey } from "snarkjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "node:crypto";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function downloadPtau() {
  const ptauPath = path.join(__dirname, "..", "generated", "pot15_final.ptau");
  
  try {
    await fs.access(ptauPath);
    console.log("✓ Powers of tau file already exists");
    return ptauPath;
  } catch {
    console.log("Downloading powers of tau file...");
    // Alternative URLs for powers of tau
    const urls = [
      "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau",
      "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau"
    ];
    
    let downloaded = false;
    for (const url of urls) {
      try {
        console.log(`Trying ${url}...`);
        await execAsync(`curl -L "${url}" -o "${ptauPath}"`);
        // Check if file is valid (should be > 1MB)
        const stats = await fs.stat(ptauPath);
        if (stats.size > 1000000) {
          downloaded = true;
          break;
        }
      } catch (e) {
        console.log(`Failed to download from ${url}`);
      }
    }
    
    if (!downloaded) {
      throw new Error("Failed to download powers of tau file from all sources");
    }
    
    console.log("✓ Downloaded powers of tau file");
    return ptauPath;
  }
}

// Dev-only Groth16 setup: single local contribution with random entropy.
// NOT a real ceremony. Produces guess_dev.zkey + guess_dev_verification_key.json.
// The shipping guess_final.zkey comes from the phase-2 multi-party ceremony,
// which runs out-of-band and is not wired into this script.
async function setupDev() {
  console.log("Running dev trusted setup (single contributor, NOT a ceremony)...");

  const generatedDir = path.join(__dirname, "..", "generated");
  const r1csPath = path.join(generatedDir, "guess.r1cs");
  const ptauPath = await downloadPtau();

  try {
    await fs.access(r1csPath);
  } catch {
    console.error("Error: R1CS file not found. Run 'bun run compile' first.");
    process.exit(1);
  }

  try {
    const zkey0Path = path.join(generatedDir, "guess_0000.zkey");
    console.log("Generating initial zkey...");

    await zKey.newZKey(r1csPath, ptauPath, zkey0Path);
    console.log("✓ Initial zkey generated");

    const zkeyDevPath = path.join(generatedDir, "guess_dev.zkey");
    console.log("Adding dev contribution...");

    const entropy = crypto.randomBytes(32).toString("hex");
    await zKey.contribute(
      zkey0Path,
      zkeyDevPath,
      "Dev contribution",
      entropy
    );
    console.log("✓ Contribution added");

    console.log("Exporting verification key...");
    const vKey = await zKey.exportVerificationKey(zkeyDevPath);

    const vKeyPath = path.join(generatedDir, "guess_dev_verification_key.json");
    await fs.writeFile(vKeyPath, JSON.stringify(vKey, null, 2));
    console.log("✓ Verification key exported");

    await fs.unlink(zkey0Path);
    console.log("✓ Cleaned up intermediate files");

    console.log("\n✅ Dev setup complete!");
    console.log(`  - Dev zkey: ${zkeyDevPath}`);
    console.log(`  - Dev verification key: ${vKeyPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Setup failed:", (error as Error).message);
    process.exit(1);
  }
}

setupDev();