import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs";

let pyodidePromise;
let seabornReady = false;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/",
      });
      await pyodide.loadPackage(["numpy", "pandas", "matplotlib", "scipy", "micropip"]);
      return pyodide;
    })();
  }
  return pyodidePromise;
}

async function ensurePackages(pyodide, code) {
  if (/\b(?:import\s+seaborn|from\s+seaborn\b)/.test(code) && !seabornReady) {
    await pyodide.runPythonAsync(`
import micropip
await micropip.install("seaborn==0.13.2")
`);
    seabornReady = true;
  }
  await pyodide.loadPackagesFromImports(code);
}

self.addEventListener("message", async (event) => {
  const { id, code = "", dataText = "", title = "" } = event.data || {};
  try {
    const pyodide = await getPyodide();
    await ensurePackages(pyodide, code);
    pyodide.globals.set("FINDAT_USER_CODE", String(code));
    pyodide.globals.set("FINDAT_DATA_TEXT", String(dataText));
    pyodide.globals.set("FINDAT_CHART_TITLE", String(title));
    const resultText = await pyodide.runPythonAsync(`
import base64
import contextlib
import io
import json
import traceback

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

plt.close("all")
DATA_TEXT = FINDAT_DATA_TEXT
CHART_TITLE = FINDAT_CHART_TITLE

def _findat_read_dataframe(text):
    if not str(text).strip():
        return None
    try:
        return pd.read_csv(io.StringIO(text), sep=None, engine="python")
    except Exception:
        return pd.read_csv(io.StringIO(text))

df = _findat_read_dataframe(DATA_TEXT)
_namespace = {
    "DATA_TEXT": DATA_TEXT,
    "CHART_TITLE": CHART_TITLE,
    "df": df,
    "np": np,
    "pd": pd,
    "plt": plt,
}
_stdout = io.StringIO()
with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
    exec(compile(FINDAT_USER_CODE, "<findat-python-chart>", "exec"), _namespace, _namespace)

_figures = [plt.figure(number) for number in plt.get_fignums()]
if not _figures:
    raise RuntimeError("The Python code did not create a Matplotlib figure. Create one with plt.subplots() or plt.figure().")
_figure = _figures[-1]
if CHART_TITLE and _figure._suptitle is None and not any(axis.get_title() for axis in _figure.axes):
    _figure.suptitle(CHART_TITLE)
_buffer = io.BytesIO()
_figure.savefig(_buffer, format="png", dpi=130, bbox_inches="tight", facecolor="white")
_image = "data:image/png;base64," + base64.b64encode(_buffer.getvalue()).decode("ascii")
_result = {"dataUrl": _image, "stdout": _stdout.getvalue()[-12000:]}
plt.close("all")
json.dumps(_result)
`);
    self.postMessage({ id, ok: true, ...JSON.parse(resultText) });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error?.message || String(error),
    });
  }
});
