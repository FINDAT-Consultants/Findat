import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs";
let pyodidePromise;
async function getPyodide(){
  if(!pyodidePromise)pyodidePromise=(async()=>{const pyodide=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v314.0.3/full/"});await pyodide.loadPackage(["numpy","pandas","scipy","micropip"]);return pyodide})();
  return pyodidePromise
}
self.addEventListener('message',async event=>{
  const{id,code='',inputText='',expectedOutput=''}=event.data||{};
  try{
    const pyodide=await getPyodide();await pyodide.loadPackagesFromImports(code);
    pyodide.globals.set('FINDAT_CODE',String(code));pyodide.globals.set('FINDAT_INPUT',String(inputText));pyodide.globals.set('FINDAT_EXPECTED',String(expectedOutput));
    const output=await pyodide.runPythonAsync(`
import contextlib, io, traceback
INPUT_TEXT=FINDAT_INPUT
EXPECTED_OUTPUT=FINDAT_EXPECTED
_stdout=io.StringIO()
_scope={"INPUT_TEXT":INPUT_TEXT,"EXPECTED_OUTPUT":EXPECTED_OUTPUT}
with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
    exec(compile(FINDAT_CODE,"<findat-x1-training>","exec"),_scope,_scope)
_result=_scope.get("result",_scope.get("OUTPUT",None))
_text=_stdout.getvalue()
if _result is not None:
    _text += ("\n" if _text else "") + str(_result)
_text[-20000:]
`);
    self.postMessage({id,ok:true,output:String(output||'')})
  }catch(error){self.postMessage({id,ok:false,error:error?.message||String(error)})}
});
