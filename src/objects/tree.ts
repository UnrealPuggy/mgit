import { gitObjectType, lookupGitObject, writeGitObject } from "./object.ts";

// export enum TreeEntryMode {
//   File,
//   Directory,
// }
export enum TreeEntryType {
  blob = "blob",
  tree = "tree",
}
export interface TreeEntry {
  // mode: TreeEntryMode;
  name: string;
  hash: string;
  type: TreeEntryType;
}

// function hexToBytes(hex: string): Uint8Array {
//     if (hex.length % 2 !== 0) {
//         throw new Error("Hex string must have an even length.");
//     }
//     const bytes = new Uint8Array(hex.length / 2);
//     for (let i = 0; i < hex.length; i += 2) {
//         bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
//     }
//     return bytes;
// }
export async function createTreeObject(...entrees: TreeEntry[]) {
  const encoder = new TextEncoder();
  const Outputs = entrees.map((i) => `${i.type} ${i.hash} ${i.name}`).join(
    "\0",
  );

  //   console.log(JSON.stringify(Outputs));

  return await writeGitObject(gitObjectType.tree, encoder.encode(Outputs));
}
export async function readTreeObject(hash: string): Promise<TreeEntry[]> {
  const decoder = new TextDecoder();
  const obj = await lookupGitObject(hash);
  const out: TreeEntry[] = [];
  const content = decoder.decode(obj.content);
  const entries = content.split("\0");
  // console.log(JSON.stringify(entries))
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].split(" ");
    // const mode:TreeEntryMode = parseInt(entry[0]);
    const type: TreeEntryType = entry[0] as TreeEntryType;
    const fileHash: string = entry[1];
    const fileName: string = entry[2];
    out.push({ hash: fileHash, name: fileName, type });
  }

  return out;
}
