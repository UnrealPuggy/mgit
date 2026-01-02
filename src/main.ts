import { ensureDir, exists } from "@std/fs";
import { addGitIndex, constructTreeFromIndex } from "./objects/commit.ts";
import {
  gitObjectType,
  writeGitObject as createGitObject,
} from "./objects/object.ts";
import { resolveGitHead, writeGitHead } from "./repo/head.ts";
import { branchDir, objDir } from "./repo/paths.ts";

await writeGitHead({ "type": "symbolic", "ref": branchDir + "main" });

const readHead = await resolveGitHead();
console.log(readHead ? "a" : "no head");
// await ensureDir(gitDir);
await ensureDir(objDir);

async function doFile(path: string) {
  if (await exists(path, { isFile: true })) {
    const fileHash = await createGitObject(
      gitObjectType.blob,
      await Deno.readFile(path),
    );
    const indexObj = { hash: fileHash, name: path };
    await addGitIndex(indexObj);
    return indexObj;
  } else {
    console.error("File either isn't a file or doesn't exist");
    return;
  }
}

await doFile("README.md");
// await addGitIndex("README.md");
await doFile("subfolder/funny_subfolderfile.txt");
await doFile("subfolder/subsub/funny.txt");
await doFile("subfolder/subsub/asd/asd.txt");

const treeHash = await constructTreeFromIndex();
console.log("New Tree Hash:", treeHash);
// async function doDir(path: string):Promise<string> {
//   const Direntries = await getDirEntries(path);
//   const treeEntries:TreeEntry[] = [];
//   for (let i = 0; i < Direntries.length; i++) {
//     const dirEntry = Direntries[i];
//     const isDir = dirEntry.isDirectory;
//     // const mode = isDir ? TreeEntryMode.Directory : TreeEntryMode.File;
//     const type = isDir ? TreeEntryType.tree : TreeEntryType.blob;
//     const hash = isDir ? await doDir(path+'/'+dirEntry.name) : await writeGitObject(gitObjectType.blob,await Deno.readFile(path+'/'+dirEntry.name));
//     treeEntries.push({hash,name:dirEntry.name,type});
//     //console.log(dirEntry.name,hash);

//   }
//   return await createTreeObject(...treeEntries);
// }
// const newHash = await doDir(".");
// console.log(".",newHash);
// const commitHash = await createCommitObject({author:"Liam",message:"Pugs",tree:newHash});
// console.log("commitHash:",commitHash);
// console.log("CommitData:",await readCommitObject(commitHash));
// const filePath = "README.md";
// const fileData = await Deno.readFile(filePath);
// // // let fileStat = await Deno.stat(filePath);

// const fileHash = await createGitObject(gitObjectType.blob, fileData);
// const treeHash = await createTreeObject({
//   "name": filePath,
//   "type": TreeEntryType.blob,
//   hash: fileHash,
// });
// console.log(treeHash);
// // // console.log(await lookupGitObject(fileHash));
// // // console.log(await readTreeObject(treeHash));
// const commitHash = await createCommitObject({
//   author: "Liam",
//   message: "Fortnite Amongus",
//   tree: treeHash,
//   parent: [await readGitHead()],
// });
// // // writeGitHead(commitHash);
// console.log("commit hash:", commitHash);
// console.log("Read git commit object:", await readCommitObject(commitHash));

// console.log((await lookupGitObject(treeHash)).content);
