import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function compile() {
  console.log("Compiling circuits...");
  
  const circuitPath = path.join(__dirname, "..", "circuits", "guess.circom");
  const outputDir = path.join(__dirname, "..", "generated");
  
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });
  
  try {
    // Compile circuit
    const compileCmd = `npx circom2 ${circuitPath} --r1cs --wasm --sym -o ${outputDir}`;
    console.log(`Running: ${compileCmd}`);
    
    const { stdout, stderr } = await execAsync(compileCmd);
    
    if (stderr) {
      console.error("Compilation warnings:", stderr);
    }
    
    if (stdout) {
      console.log(stdout);
    }
    
    console.log("✓ Circuit compiled successfully");
    
    // Check if files were created
    const r1csPath = path.join(outputDir, "guess.r1cs");
    const wasmPath = path.join(outputDir, "guess_js", "guess.wasm");
    
    await fs.access(r1csPath);
    await fs.access(wasmPath);
    
    console.log("✓ Generated files verified");
    console.log(`  - R1CS: ${r1csPath}`);
    console.log(`  - WASM: ${wasmPath}`);
    
  } catch (error) {
    console.error("Compilation failed:", (error as Error).message);
    process.exit(1);
  }
}

compile();