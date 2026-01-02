import { exists } from "@std/fs";
import * as hashUtils from "../hashUtils.ts";
import { objDir } from "../repo/paths.ts";

export enum gitObjectType {
  blob = "blob",
  tree = "tree",
  commit = "commit",
}
export interface GitObject {
  type: gitObjectType;
  size: number;
  content: Uint8Array;
}
/**
 * Creates, hashes, and stores a generic Git-like object (Blob, Tree, or Commit).
 * @param type The object type ("blob", "tree", or "commit").
 * @param content The specific content bytes (Uint8Array) for that object.
 * @returns The SHA-256 hash (ID) of the stored object.
 */
export async function writeGitObject(
  type: gitObjectType,
  content: Uint8Array,
): Promise<string> {
  const size = content.length;
  const encoder = new TextEncoder();

  const headerString = `${type} ${size}\0`;
  const headerBuffer = encoder.encode(headerString);

  const objectContent = new Uint8Array(headerBuffer.length + content.length);
  objectContent.set(headerBuffer, 0);
  objectContent.set(content, headerBuffer.length);

  const hash = await hashUtils.hashData(objectContent);

  const dirName = hash.substring(0, 2);
  const fileName = hash.substring(2);
  const objectPath = `${objDir}${dirName}/${fileName}`;

  await Deno.mkdir(objDir + dirName, { recursive: true });
  if (await exists(objectPath)) {
    return hash;
  }
  await Deno.writeFile(objectPath, objectContent);

  return hash;
}
export function getHashDir(hash: string) {
  return `${hash.substring(0, 2)}/${hash.substring(2, hash.length)}`;
}

export async function lookupGitObject(hash: string): Promise<GitObject> {
  const fullContent = await Deno.readFile(objDir + getHashDir(hash));
  const endHeader = fullContent.indexOf(0);
  const content = fullContent.subarray(endHeader + 1, fullContent.length);
  const calculatedHash = await hashUtils.hashData(fullContent);
  if (calculatedHash !== hash) {
    throw new Error(
      `Object integrity check failed! Hash mismatch for ${hash}.`,
    );
  }
  const header = new TextDecoder().decode(fullContent.subarray(0, endHeader));
  const objType = header.split(" ")[0] as gitObjectType;
  return { content, type: objType, size: parseInt(header.split(" ")[1]) }; //JSON.stringify(header);
}
