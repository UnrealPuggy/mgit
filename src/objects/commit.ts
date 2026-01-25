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
	for (const entry of entries) {
		text = text.filter((i) => i.name != entry.name);
		text.push(entry);
	}

	return await Deno.writeTextFile(
		indexPath,
		text.map((i) => `${i.name}\0${i.hash}`).join('\n'),
	);
}
async function buildTree(entries: IndexEntry[], topDir = '') {
	const treeEntries: TreeEntry[] = [];
	const groups = new Map<string, IndexEntry[]>();

	for (const entry of entries) {
		if (!entry.name.startsWith(topDir)) continue;

		const realPath = entry.name.slice(topDir.length);
		const [topFolderName] = realPath.split('/');
		if (!groups.has(topFolderName)) groups.set(topFolderName, []);
		groups.get(topFolderName)!.push(entry);
	}
	console.log(topDir, groups);

	for (const [name, groupedEntries] of groups) {
		// file
		if (
			groupedEntries.length === 1 &&
			!groupedEntries[0].name.slice(topDir.length).includes('/')
		) {
			treeEntries.push({
				hash: groupedEntries[0].hash,
				name,
				type: TreeEntryType.blob,
			});
		} else {
			// folder
			const subtreeHash = await buildTree(
				groupedEntries,
				// reconstruct path relative to cwd
				topDir + name + '/',
			);
			treeEntries.push({
				hash: subtreeHash,
				name,
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
		new TextEncoder().encode(dat),
	);
}

export async function readCommitObject(
	hash: string,
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
	};
	for (const line of headerText.split('\n')) {
		const spaceIndex = line.indexOf(' ');
		if (spaceIndex === -1) continue; // or throw error

		const key = line.slice(0, spaceIndex);
		const value = line.slice(spaceIndex + 1);
		if (key == 'parent') {
			outObj.parent.push(value);
		} else {
			(outObj as stfu)[key] = value;
		}
		// console.log(key, JSON.stringify(value));
	}

	return outObj;
}
