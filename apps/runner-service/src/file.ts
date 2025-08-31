import fs from "fs";

enum FileType {
  FILE = "file",
  DIRECTORY = "directory"
}

interface File {
  type: FileType,
  name: string
}

export const fetchDir = (dir: string, baseDir: string): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
      if (err) {
        return reject(err);
      }

      const result: File[] = files.map(file => {
        return {
          type: file.isDirectory() ? FileType.DIRECTORY : FileType.FILE,
          name: file.name,
          path: `${baseDir}/${file.name}`
        };
      });

      resolve(result);
    });
  });
}

export const fetchFileContent = (file: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, "utf-8", (err, data) => {
      if (err) {
        reject(err)
      }

      resolve(data)
    })
  })
}

export const saveFile = async (file: string, content: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, content, "utf-8", (err) => {
      if (err) {
        reject(err)
      }

      resolve();
    })
  })
}