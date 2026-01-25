import { ensureFile } from '@std/fs/ensure-file';
import { indexPath } from '../../repo/paths.ts';
import { TreeEntry, TreeEntryType, createTreeObject } from '../tree.ts';

export async function readGitIndex(): Promise<IndexMap> {
	await ensureFile(indexPath);
	const textContent = await Deno.readTextFile(indexPath);
	const text = textContent ? textContent.split('\n') : [];

	const out: IndexMap = new Map();
	for (const entry of text) {
		const obj = { name: entry.split('\0')[0], hash: entry.split('\0')[1] };
		out.set(obj.name, obj);
	}
	return out;
}
export type IndexMap = Map<string, IndexEntry>;
export interface IndexEntry {
	hash: string;
	name: string;
}
export async function writeGitIndex(map: IndexMap) {
	return await Deno.writeTextFile(
		indexPath,
		Array.from(map.values())
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((i) => `${i.name}\0${i.hash}`)
			.join('\n'),
	);
}
export async function addGitIndex(...entries: IndexEntry[]) {
	const text = await readGitIndex();
	for (const entry of entries) {
		text.set(entry.name, entry);
		// text = text.filter((i) => i.name != entry.name);
		// text.push(entry);
	}

	writeGitIndex(text);
}
async function buildTree(entries: IndexMap, topDir = '') {
	const treeEntries: TreeEntry[] = [];
	const groups = new Map<string, IndexEntry[]>();

	for (const entry of entries.values()) {
		if (!entry.name.startsWith(topDir)) continue;

		const realPath = entry.name.slice(topDir.length);
		const [topFolderName] = realPath.split('/');
		if (!groups.has(topFolderName)) groups.set(topFolderName, []);
		groups.get(topFolderName)!.push(entry);
	}
	console.log(topDir, groups);
	const sortedGroupKeys = Array.from(groups.keys()).sort();
	for (const name of sortedGroupKeys) {
		const groupedEntries = groups.get(name)!;

		// File
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
			// Convert array back to map for recursion
			const subtreeMap: IndexMap = new Map(
				groupedEntries.map((e) => [e.name, e]),
			);

			const subtreeHash = await buildTree(
				subtreeMap,
				topDir + name + '/',
			);

			treeEntries.push({
				hash: subtreeHash,
				name,
				type: TreeEntryType.tree,
			});
		}
	}

	treeEntries.sort((a, b) => a.name.localeCompare(b.name));

	return await createTreeObject(...treeEntries);
}
export async function constructTreeFromIndex() {
	const indexFile = await readGitIndex();
	return await buildTree(indexFile);
}
