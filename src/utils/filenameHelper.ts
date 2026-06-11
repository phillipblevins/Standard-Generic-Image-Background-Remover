/**
 * Helper to generate customized file names using template placeholders/tokens.
 */
export function generateFormattedFilename(
  template: string,
  originalName: string,
  counterValue: number,
  resolutionStr: string
): string {
  let name = template || "<Original_Filename>_sgibr[Counter]_[Date]";

  // Get dynamic dates/times
  const now = new Date();
  
  // YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${date}`;

  // HHMMSS
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  const timeStr = `${hours}${mins}${secs}`;

  // Extract clean original filename without extension
  let cleanOriginalName = "image";
  if (originalName) {
    cleanOriginalName = originalName.replace(/\.[^/.]+$/, "");
  }

  // Format counter (padded, e.g., "01")
  const padCounter = String(counterValue).padStart(2, "0");

  // Format resolution (fallback if not loaded yet)
  const resStr = resolutionStr || "unknown";

  // Perform token replacements (handling both angle <TOKEN> and square [TOKEN] forms, and alternative name tokens)
  const replacements: Record<string, string> = {
    "<Original_Filename>": cleanOriginalName,
    "[Original_Filename]": cleanOriginalName,
    "<Original_Name>": cleanOriginalName,
    "[Original_Name]": cleanOriginalName,
    
    "<Counter>": padCounter,
    "[Counter]": padCounter,
    
    "<Date>": dateStr,
    "[Date]": dateStr,
    
    "<Time>": timeStr,
    "[Time]": timeStr,
    
    "<Resolution>": resStr,
    "[Resolution]": resStr,
  };

  for (const [token, value] of Object.entries(replacements)) {
    // Escape regex characters just in case
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedToken, "g");
    name = name.replace(regex, value);
  }

  // Ensure it ends in .png extension but doesn't double-extension
  if (!name.toLowerCase().endsWith(".png")) {
    name += ".png";
  }

  return name;
}
