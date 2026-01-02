export async function hashFile(fileName: string) {
  const dataBuffer = await Deno.readFile(fileName);

  // const hashBuffer = new Uint8Array(
  //     await crypto.subtle.digest("SHA-256", dataBuffer),
  // );

  // const hash = Array.from(hashBuffer).map((v) =>
  //     v.toString(16).padStart(2, "0")
  // ).join("");
  return hashData(dataBuffer);
}
export async function hashData<T extends boolean =false>(
  data: string | Uint8Array<ArrayBuffer>,
  returnRawBuffer?: T,
): Promise<T extends true ? Uint8Array : string> {
  const dataBuffer = typeof data == "string"
    ? new TextEncoder().encode(data)
    : data;

  const hashBuffer = new Uint8Array(
    await crypto.subtle.digest("SHA-256", dataBuffer),
  );

  const hash = Array.from(hashBuffer).map((v) =>
    v.toString(16).padStart(2, "0")
  ).join("");
  return (returnRawBuffer == true? hashBuffer : hash) as T extends true ? Uint8Array : string;
}
