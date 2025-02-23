import * as fs from "fs";
import * as path from "path";

const tree = async (directory: string, indent: string = "", excludeFolders: string[] = [], isLast: boolean = true): Promise<string> => {
  let result = "";
  const files = fs.readdirSync(directory).filter(file => !excludeFolders.includes(file));

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const isFileLast = index === files.length - 1; // 最後のファイルかどうか
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      result += `${indent}${isFileLast ? "└── " : "├── "}${file}/\n`;
      const subtree = await tree(filePath, `${indent}${isFileLast ? "    " : "|   "}`, excludeFolders, isFileLast);
      result += subtree;
    } else {
      result += `${indent}${isFileLast ? "└── " : "├── "}${file}\n`;
    }
  }

  if (isLast && indent === "") {
    result = result.trimEnd(); // 最終的な結果から末尾の改行を削除
  }

  return result;
};

if (require.main === module) {
  tree(".", "", ["node_modules", ".git"]).then(result => console.log(result));
}

export default tree;
