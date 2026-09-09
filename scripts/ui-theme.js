// UI theme preload hook.
// Kept intentionally dependency-free so Render can start the service
// without requiring Express as a runtime dependency.
const Module = require('module');
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'express/lib/response') {
    return originalLoad.call(this, request, parent, isMain);
  }
  return originalLoad.call(this, request, parent, isMain);
};
