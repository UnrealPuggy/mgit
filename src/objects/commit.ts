import { ensureFile } from '@std/fs';
import { indexPath } from '../repo/paths.ts';
import { gitObjectType, lookupGitObject, writeGitObject } from './object.ts';
import { createTreeObject, TreeEntry, TreeEntryType } from './tree.ts';

export async function readGitIndex() {
	await ensureFile(indexPath);
	const textContent = await Deno.readTextFile(indexPath);
	const text = textContent ? textContent.split('\n') : [];

	const out: IndexEntry[] = [];
	for (const entry of text) {
		out.push({ name: entry.split('\0')[0], hash: entry.split('\0')[1] });
	}
	return out;
}

export interface IndexEntry {
	hash: string;
	name: string;
}

export async function addGitIndex(...entries: IndexEntry[]) {
	let text = await readGitIndex();
	// console.log(text);
	for (const entry of entries) {
		text = text.filter((i) => i.name != entry.name);
		// if (!text.some((i) => i.name == entry.name)) {
		text.push(entry);
		// }
	}
	// const getUniqueBy = <T extends object, K extends keyof T>(
	//   arr: T[],
	//   prop: K,
	// ) => {
	//   const seen = new Set();
	//   return arr.filter((item) => {
	//     const value = item[prop];
	//     if (seen.has(value)) {
	//       return false; // Skip this item (duplicate key)
	//     }
	//     seen.add(value);
	//     return true; // Keep this item
	//   });
	// };

	return await Deno.writeTextFile(
		indexPath,
		text.map((i) => `${i.name}\0${i.hash}`).join('\n')
	);
}
async function buildTree(entries: IndexEntry[], topDir = '') {
	const treeEntries: TreeEntry[] = [];
	for (const entry of entries) {
		if (!entry.name.startsWith(topDir)) continue;
		const relPath = entry.name.slice(topDir.length);

		const [topFolderName, ...nextPaths] = relPath.split('/');
		// Skip it if there is already one like that. The filter on the subtree will handle all of the ones
		// coming from this one
		if (treeEntries.some((i) => i.name == topFolderName)) continue;

		// The will be no nextpath if it is a file
		if (nextPaths.length === 0) {
			treeEntries.push({
				hash: entry.hash,
				name: topFolderName,
				type: TreeEntryType.blob,
			});
		} else {
			// get all files that have the starting thing as the folder we want
			const subtreeEntries = entries.filter((e) =>
				e.name.startsWith(topDir + topFolderName + '/')
			);
			treeEntries.push({
				hash: await buildTree(
					subtreeEntries,
					topDir + topFolderName + '/'
				),
				name: topFolderName,
				type: TreeEntryType.tree,
			});
		}
	}

	return await createTreeObject(...treeEntries);
}
export async function constructTreeFromIndex() {
	const indexFile = await readGitIndex();
	return await buildTree(indexFile);
}

export interface CommitObject {
	tree: string;
	parent: string[];
	author: string;
	message: string;
	time?: number;
}

export async function createCommitObject(obj: CommitObject) {
	const parents = obj.parent.map((i) => `parent ${i}`);
	const dat = `tree ${obj.tree}\n${parents.join('\n')}\nauthor ${
		obj.author
	}\ntime ${Date.now()}\n\n${obj.message}`;
	return await writeGitObject(
		gitObjectType.commit,
		new TextEncoder().encode(dat)
	);
}

export async function readCommitObject(
	hash: string
): Promise<CommitObject | void> {
	const gitObject = await lookupGitObject(hash);
	if (gitObject.type != gitObjectType.commit) {
		console.error("Tried to get a commit object that wasn't a commit!");
		return;
	}
	const decoder = new TextDecoder();

	const text = decoder.decode(gitObject.content);

	const msgSeperator = text.indexOf('\n\n');
	const headerText = text.slice(0, msgSeperator);
	const messageText = text.slice(msgSeperator + 2);
	const message = messageText;

	const outObj: CommitObject = {
		message,
		parent: [],
		tree: '',
		author: '',
	} as CommitObject;
	for (const line of headerText.split('\n')) {
		const spaceIndex = line.indexOf(' ');
		if (spaceIndex === -1) continue; // or throw error

		const key = line.slice(0, spaceIndex);
		const value = line.slice(spaceIndex + 1);
		if (key == 'parent') {
			outObj.parent.push(value);
		} else {
			// deno-lint-ignore no-explicit-any
			(outObj as any)[key] = value;
		}
		// console.log(key, JSON.stringify(value));
	}

	return outObj;
}
