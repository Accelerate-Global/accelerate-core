export const hashToken = async (rawToken: string): Promise<string> => {
  const encodedToken = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", encodedToken);
  const digestBytes = new Uint8Array(digest);

  return Array.from(digestBytes)
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
};
