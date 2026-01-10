import { useMemo, useState } from "react";

export function useFileTree(files, searchTerm, fileTitleMap) {
  const [openFolders, setOpenFolders] = useState(new Set(["__root__"]));

  // Sort files
  const sortedFiles = useMemo(() => files.slice().sort((a, b) => a.name.localeCompare(b.name)), [files]);
  
  // Build Tree
  const fileTree = useMemo(() => {
       const buildTree = () => ({ name: "__root__", path: "__root__", children: new Map(), files: [] });
       const root = buildTree();
       sortedFiles.forEach((file) => {
          const rel = file.path.replace("../scripts_file/", ""); 
          const parts = rel.split("/");
          const filename = parts.pop();
          let node = root;
          parts.forEach((part) => {
              if (!node.children.has(part)) {
                  const childPath = node.path === "__root__" ? part : `${node.path}/${part}`;
                  node.children.set(part, { name: part, path: childPath, children: new Map(), files: [] });
              }
              node = node.children.get(part);
          });
          node.files.push({ ...file, rel: filename });
       });
       const toArrayTree = (node) => ({
           name: node.name,
           path: node.path,
           files: node.files.sort((a,b) => a.name.localeCompare(b.name)),
           children: Array.from(node.children.values()).sort((a,b) => a.name.localeCompare(b.name)).map(toArrayTree)
       });
       return toArrayTree(root);
  }, [sortedFiles]);
  
  // Filter Tree
  const filteredTree = useMemo(() => {
      if (!searchTerm.trim()) return fileTree;
      const q = searchTerm.toLowerCase();
      const matchFile = (file) => file.name.toLowerCase().includes(q) || (fileTitleMap[file.name]?.toLowerCase() || "").includes(q);
      const filterNode = (node) => {
          const folderMatch = node.name !== "__root__" && node.name.toLowerCase().includes(q);
          const files = folderMatch ? node.files : node.files.filter(matchFile);
          const children = node.children.map(filterNode).filter(Boolean);
          if (folderMatch || files.length || children.length) return { ...node, files, children };
          return null;
      };
      return filterNode(fileTree);
  }, [fileTree, searchTerm, fileTitleMap]);

  const toggleFolder = (folder) => {
      setOpenFolders(prev => {
          const next = new Set(prev);
          if (next.has(folder)) next.delete(folder); else next.add(folder);
          return next;
      });
  };

  return {
      fileTree,
      filteredTree,
      openFolders,
      setOpenFolders,
      toggleFolder
  };
}
