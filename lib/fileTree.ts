import type { ChangeType, FileReview } from "./types";

export interface TreeNode {
  /** Display name (basename for files, dirname for folders). */
  name: string;
  /** Full path from repo root. */
  path: string;
  type: "file" | "folder";
  changeType?: Exclude<ChangeType, "unchanged">;
  children: TreeNode[];
}

/** Build a folder/file tree from the flat list of file reviews. */
export function buildTree(files: FileReview[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let cursor = root;
    let pathSoFar = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment;
      const isLeaf = i === segments.length - 1;

      let next = cursor.children.find((c) => c.name === segment);
      if (!next) {
        next = {
          name: segment,
          path: pathSoFar,
          type: isLeaf ? "file" : "folder",
          changeType: isLeaf ? file.changeType : undefined,
          children: [],
        };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }

  sortTree(root);
  return root.children;
}

function sortTree(node: TreeNode): void {
  node.children.sort((a, b) => {
    // Folders first, then files; alphabetical within each group.
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) sortTree(child);
}
