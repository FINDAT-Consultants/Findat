import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs";

let pyodidePromise;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/",
      });
      await pyodide.loadPackage(["micropip"]);
      return pyodide;
    })();
  }
  return pyodidePromise;
}

self.addEventListener("message", async (event) => {
  const { id, code = "" } = event.data || {};
  try {
    const pyodide = await getPyodide();
    await pyodide.loadPackagesFromImports(String(code));
    pyodide.globals.set("FINDAT_DEVELOPER_CODE", String(code));
    const stdout = await pyodide.runPythonAsync(`
import contextlib
import io

_findat_output = io.StringIO()
_namespace = {"__name__": "__main__"}
with contextlib.redirect_stdout(_findat_output), contextlib.redirect_stderr(_findat_output):
    exec(compile(FINDAT_DEVELOPER_CODE, "<findat-developer-studio>", "exec"), _namespace, _namespace)
_findat_output.getvalue()[-50000:]
`);
    self.postMessage({ id, ok: true, stdout: String(stdout || "") });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
});
