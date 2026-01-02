import { ensureFile } from "@std/fs/ensure-file";
import { gitDir, headPath } from "./paths.ts";

export async function readGitHead(): Promise<GitHead> {
  await ensureFile(headPath);
  const text = (await Deno.readTextFile(headPath)).trim();
  return text.startsWith("ref: ")
    ? { type: "symbolic", "ref": text.slice(5) }
    : { type: "detached", hash: text };
}
type GitHead = { type: "symbolic"; ref: string } | {
  type: "detached";
  hash: string;
};
export async function writeGitHead(head: GitHead | string) {
  await ensureFile(headPath);
  if (typeof head == "string") {
    await Deno.writeTextFile(headPath, head);
  } else if (head.type == "detached") {
    await Deno.writeTextFile(headPath, head.hash);
  } else {
    await Deno.writeTextFile(headPath, "ref: " + head.ref);
  }
}
export async function resolveGitHead(head?: GitHead) {
  if (head == undefined) {
    head = await readGitHead();
  }
  if (head.type == "detached") {
    return head.hash;
  }
  await ensureFile(gitDir + head.ref);
  return await Deno.readTextFile(gitDir + head.ref);
}
