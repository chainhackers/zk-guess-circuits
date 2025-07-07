import { zKey } from "snarkjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

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
        await execAsync(`curl -L ${url} -o ${ptauPath}`);
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

async function setup() {
  console.log("Running trusted setup...");
  
  const generatedDir = path.join(__dirname, "..", "generated");
  const r1csPath = path.join(generatedDir, "guess.r1cs");
  const ptauPath = await downloadPtau();
  
  // Check if r1cs exists
  try {
    await fs.access(r1csPath);
  } catch {
    console.error("Error: R1CS file not found. Run 'npm run compile' first.");
    process.exit(1);
  }
  
  try {
    // Generate initial zkey
    const zkey0Path = path.join(generatedDir, "guess_0000.zkey");
    console.log("Generating initial zkey...");
    
    await zKey.newZKey(r1csPath, ptauPath, zkey0Path);
    console.log("✓ Initial zkey generated");
    
    // Add contribution (for dev, using fixed entropy)
    const zkeyFinalPath = path.join(generatedDir, "guess_final.zkey");
    console.log("Adding contribution...");
    
    await zKey.contribute(
      zkey0Path,
      zkeyFinalPath,
      "Dev contribution",
      "random_entropy_12345"
    );
    console.log("✓ Contribution added");
    
    // Export verification key
    console.log("Exporting verification key...");
    const vKey = await zKey.exportVerificationKey(zkeyFinalPath);
    
    const vKeyPath = path.join(generatedDir, "guess_verification_key.json");
    await fs.writeFile(vKeyPath, JSON.stringify(vKey, null, 2));
    console.log("✓ Verification key exported");
    
    // Clean up intermediate files
    await fs.unlink(zkey0Path);
    console.log("✓ Cleaned up intermediate files");
    
    console.log("\n✅ Setup complete!");
    console.log(`  - Final zkey: ${zkeyFinalPath}`);
    console.log(`  - Verification key: ${vKeyPath}`);
    
  } catch (error) {
    console.error("Setup failed:", (error as Error).message);
    process.exit(1);
  }
}

setup();