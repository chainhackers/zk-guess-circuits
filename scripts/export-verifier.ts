import { zKey } from "snarkjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function exportVerifier() {
  console.log("Exporting Solidity verifier...");
  
  const zkeyPath = path.join(__dirname, "..", "generated", "guess_final.zkey");
  const verifierPath = path.join(__dirname, "..", "generated", "GuessVerifier.sol");
  
  try {
    // Check if zkey exists
    await fs.access(zkeyPath);
    
    // Export Solidity verifier
    const templates = {
      groth16: await fs.readFile(
        path.join(__dirname, "..", "node_modules", "snarkjs", "templates", "verifier_groth16.sol.ejs"),
        "utf8"
      )
    };
    
    const verifierCode = await zKey.exportSolidityVerifier(zkeyPath, templates);
    
    // Write verifier contract
    await fs.writeFile(verifierPath, verifierCode);
    
    console.log("✓ Verifier exported successfully");
    console.log(`  - Output: ${verifierPath}`);
    
    // Read and display contract size
    const stats = await fs.stat(verifierPath);
    console.log(`  - Size: ${(stats.size / 1024).toFixed(2)} KB`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to export verifier:", (error as Error).message);
    process.exit(1);
  }
}

exportVerifier();