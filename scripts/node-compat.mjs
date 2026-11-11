import os from "node:os";

// Some restricted Windows sessions cannot resolve the OS user profile from Node.
try {
  os.userInfo();
} catch {
  Object.defineProperty(os, "userInfo", {
    value: () => ({ username: process.env.USERNAME || "project-runner", uid: -1, gid: -1, shell: null, homedir: os.tmpdir() }),
  });
}
