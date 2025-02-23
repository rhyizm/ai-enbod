import * as fs from "fs";

const cat = async (filePath: string): Promise<string> => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return fileContent;
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`);
  }
};

if (require.main === module) {
  const filePath = process.argv[2] || undefined;
  if (!filePath) {
    console.error("Usage: ts-node command-cat.ts <file-path>");
    process.exit(1);
  }
  cat(filePath).then(console.log).catch(console.error);
}

export default cat;