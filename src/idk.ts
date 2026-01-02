async function readThingIdk(path: string, it = 0, last = false, dirName = "") {
  const entries: Deno.DirEntry[] = [];
  for await (const dirEntry of Deno.readDir(path)) {
    if (dirEntry.name != ".mgit") {
      entries.push(dirEntry);
    }
  }
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const vert = "│";
    const t = "├";
    const l = "└";
    const line = "─";
    const lastEntry = i == entries.length - 1;
    let prefixSpacing = '';
    for(let i=0;i<it;i++) {
      prefixSpacing+= vert+' ';
    }
    let prefix = prefixSpacing +
      (lastEntry ? l : t);
    prefix += line;
    console.log(prefix + entry.name);
    if (entry.isDirectory) {
      await readThingIdk(
        dirName + entry.name,
        it + 1,
        lastEntry,
        entry.name + "/",
      );
    }
  }
}



