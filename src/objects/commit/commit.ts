import { gitObjectType, lookupGitObject, writeGitObject } from '../object.ts';

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
