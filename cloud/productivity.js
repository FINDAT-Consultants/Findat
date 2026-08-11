/* FINDAT Cloud Office Suite
   Self-contained browser applications inspired by familiar productivity workflows.
   Data is persisted in the current browser profile and can be exported to Office-compatible files. */
(() => {
  'use strict';

  const SUITE_VERSION = '4.0';
  const CLOUD_NAME = 'FINDAT Cloud';

  const readJSON = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      toast(`${CLOUD_NAME} storage is unavailable`);
      return false;
    }
  };

  const debounce = (fn, wait = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  const safeName = (name, fallback) => String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || fallback;

  const downloadBlob = (name, data, type = 'application/octet-stream') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const xmlEscape = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const parseXml = text => new DOMParser().parseFromString(text, 'application/xml');
  const xmlElements = (root, name) => {
    const plain = [...root.getElementsByTagName(name)];
    return plain.length ? plain : [...root.getElementsByTagNameNS('*', name)];
  };
  const firstXml = (root, name) => xmlElements(root, name)[0] || null;

  function launchButton(name, title, subtitle) {
    return `<button class="launch-item cloud-launch-item" data-open="${name}">${iconSvg(name)}<span>${title}</span><small>${subtitle}</small></button>`;
  }

  apps.launchpad.html = () => `<div class="launchpad-app productivity-launchpad cloud-launchpad">
    <div class="cloud-suite-heading"><span>☁</span><div><h2>FINDAT Cloud Office</h2><p>Documents remain available in your FINDAT Cloud workspace</p></div></div>
    <div class="launch-grid">
      ${launchButton('excel', 'MS Excel', 'Cloud workbook')}
      ${launchButton('word', 'MS Word', 'Cloud document')}
      ${launchButton('powerpoint', 'PowerPoint', 'Cloud presentation')}
    </div>
  </div>`;

  // ---------------------------------------------------------------------------
  // Excel
  // ---------------------------------------------------------------------------

  function excelColumnName(index) {
    let output = '';
    let value = index + 1;
    while (value > 0) {
      value -= 1;
      output = String.fromCharCode(65 + value % 26) + output;
      value = Math.floor(value / 26);
    }
    return output;
  }

  function excelPosition(reference) {
    const match = /^([A-Z]+)(\d+)$/i.exec(String(reference || '').trim());
    if (!match) return null;
    let column = 0;
    for (const character of match[1].toUpperCase()) column = column * 26 + character.charCodeAt(0) - 64;
    return { column: column - 1, row: Number(match[2]) - 1 };
  }

  function excelRange(start, end) {
    const first = excelPosition(start);
    const last = excelPosition(end);
    if (!first || !last) return [];
    const refs = [];
    for (let row = Math.min(first.row, last.row); row <= Math.max(first.row, last.row); row += 1) {
      for (let column = Math.min(first.column, last.column); column <= Math.max(first.column, last.column); column += 1) {
        refs.push(`${excelColumnName(column)}${row + 1}`);
      }
    }
    return refs;
  }

  function splitFormulaArgs(text) {
    const output = [];
    let current = '';
    let quote = '';
    let depth = 0;
    for (const char of String(text)) {
      if (quote) {
        current += char;
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") {
        quote = char;
        current += char;
      } else if (char === '(') {
        depth += 1;
        current += char;
      } else if (char === ')') {
        depth -= 1;
        current += char;
      } else if (char === ',' && depth === 0) {
        output.push(current.trim());
        current = '';
      } else current += char;
    }
    output.push(current.trim());
    return output;
  }

  function excelSheetValue(reference, sheet, stack = new Set()) {
    const ref = String(reference).toUpperCase();
    if (stack.has(ref)) return '#CYCLE!';
    const raw = String(sheet.cells?.[ref] ?? '');
    if (!raw.startsWith('=')) return raw;
    stack.add(ref);
    const expression = raw.slice(1).trim();

    const literalValue = token => {
      const clean = String(token).trim();
      if (/^".*"$/.test(clean) || /^'.*'$/.test(clean)) return clean.slice(1, -1);
      if (/^[A-Z]+\d+$/i.test(clean)) return excelSheetValue(clean, sheet, new Set(stack));
      if (/^(TRUE|FALSE)$/i.test(clean)) return /^TRUE$/i.test(clean);
      if (Number.isFinite(Number(clean))) return Number(clean);
      return clean;
    };

    const functionMatch = /^([A-Z]+)\((.*)\)$/is.exec(expression);
    if (functionMatch) {
      const name = functionMatch[1].toUpperCase();
      const args = splitFormulaArgs(functionMatch[2]);
      const flattened = args.flatMap(arg => {
        const range = /^([A-Z]+\d+):([A-Z]+\d+)$/i.exec(arg);
        return range ? excelRange(range[1], range[2]).map(refItem => excelSheetValue(refItem, sheet, new Set(stack))) : [literalValue(arg)];
      });
      const numbers = flattened.map(Number).filter(Number.isFinite);
      if (name === 'SUM') return numbers.reduce((sum, number) => sum + number, 0);
      if (name === 'AVERAGE') return numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : 0;
      if (name === 'MIN') return numbers.length ? Math.min(...numbers) : 0;
      if (name === 'MAX') return numbers.length ? Math.max(...numbers) : 0;
      if (name === 'COUNT') return numbers.length;
      if (name === 'COUNTA') return flattened.filter(value => String(value) !== '').length;
      if (name === 'PRODUCT') return numbers.reduce((product, number) => product * number, numbers.length ? 1 : 0);
      if (name === 'ROUND') return Math.round(Number(flattened[0] || 0) * 10 ** Number(flattened[1] || 0)) / 10 ** Number(flattened[1] || 0);
      if (name === 'ABS') return Math.abs(Number(flattened[0] || 0));
      if (name === 'LEN') return String(flattened[0] ?? '').length;
      if (name === 'UPPER') return String(flattened[0] ?? '').toUpperCase();
      if (name === 'LOWER') return String(flattened[0] ?? '').toLowerCase();
      if (name === 'CONCAT') return flattened.join('');
      if (name === 'TODAY') return new Date().toISOString().slice(0, 10);
      if (name === 'NOW') return new Date().toLocaleString();
      if (name === 'IF') {
        const condition = args[0] || '';
        const conditionText = condition.replace(/\b([A-Z]+\d+)\b/gi, refItem => JSON.stringify(excelSheetValue(refItem, sheet, new Set(stack))))
          .replace(/<>/g, '!=').replace(/(?<![<>=!])=(?!=)/g, '==');
        if (!/^[\w\s."'!=<>+\-*/()%]+$/.test(conditionText)) return '#ERROR!';
        try {
          return Function(`"use strict"; return (${conditionText})`)() ? literalValue(args[1]) : literalValue(args[2]);
        } catch (_) {
          return '#ERROR!';
        }
      }
      return '#NAME?';
    }

    if (expression.includes('&')) return splitFormulaArgs(expression.replace(/&/g, ',')).map(literalValue).join('');

    const safe = expression
      .replace(/\b([A-Z]+\d+)\b/gi, refItem => {
        const value = Number(excelSheetValue(refItem, sheet, new Set(stack)));
        return Number.isFinite(value) ? String(value) : '0';
      })
      .replace(/\^/g, '**');
    if (!/^[\d\s+\-*/().%*]+$/.test(safe)) return '#ERROR!';
    try {
      const value = Function(`"use strict"; return (${safe})`)();
      return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 1e10) / 1e10 : '#ERROR!';
    } catch (_) {
      return '#ERROR!';
    }
  }

  const defaultWorkbook = () => ({
    name: 'Cloud Workbook',
    active: 0,
    selected: 'A1',
    sheets: [{
      name: 'Sheet1',
      tabColor: '',
      cells: { A1: 'Item', B1: 'Amount', A2: 'Income', B2: '1250', A3: 'Costs', B3: '430', A4: 'Balance', B4: '=B2-B3' },
      styles: { A1: { bold: true, fill: '#d9ead3' }, B1: { bold: true, fill: '#d9ead3' }, A4: { bold: true }, B4: { bold: true, format: 'currency' } }
    }]
  });

  apps.excel = {
    title: 'MS Excel',
    html: () => `<div class="office-app excel-app cloud-office-app">
      <div class="office-ribbon excel-ribbon cloud-ribbon">
        <div class="office-brand">${iconSvg('excel')}<div><b>Excel</b><span>☁ FINDAT Cloud workbook</span></div></div>
        <div class="office-actions">
          <button data-excel-new>New</button><button data-excel-save>Save</button>
          <button data-excel-import>Open</button><button data-excel-export-xlsx>Export XLSX</button><button data-excel-export-csv>Export CSV</button>
          <input data-excel-file type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        </div>
        <div class="excel-toolbar">
          <button data-excel-undo title="Undo">↶</button><button data-excel-redo title="Redo">↷</button>
          <button data-excel-style="bold"><b>B</b></button><button data-excel-style="italic"><i>I</i></button><button data-excel-style="underline"><u>U</u></button>
          <button data-excel-align="left">⇤</button><button data-excel-align="center">↔</button><button data-excel-align="right">⇥</button>
          <label>Text <input data-excel-color type="color" value="#111827"></label>
          <label>Fill <input data-excel-fill type="color" value="#ffffff"></label>
          <select data-excel-format><option value="general">General</option><option value="number">Number</option><option value="currency">Currency</option><option value="percent">Percent</option><option value="date">Date</option><option value="text">Text</option></select>
          <button data-excel-sort="asc">Sort A–Z</button><button data-excel-sort="desc">Sort Z–A</button>
        </div>
      </div>
      <div class="excel-formula-bar"><span data-excel-name>A1</span><b>fx</b><input data-excel-formula aria-label="Formula bar" placeholder="Value or formula: =SUM(A1:A5)"></div>
      <div class="excel-sheet-wrap"><div class="excel-grid" data-excel-grid tabindex="0"></div></div>
      <div class="excel-bottom"><div class="excel-tabs" data-excel-tabs></div><button data-excel-add-sheet title="Add worksheet">＋</button><span data-excel-status>☁ Ready</span></div>
    </div>`
  };

  function excelFormatDisplay(value, style = {}) {
    if (value === '' || String(value).startsWith('#')) return value;
    const numeric = Number(value);
    if (style.format === 'number' && Number.isFinite(numeric)) return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 });
    if (style.format === 'currency' && Number.isFinite(numeric)) return numeric.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    if (style.format === 'percent' && Number.isFinite(numeric)) return `${(numeric * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    if (style.format === 'date') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
    }
    return value;
  }

  async function exportWorkbookXlsx(workbook) {
    if (!window.JSZip) throw new Error('XLSX packaging library did not load.');
    const zip = new JSZip();
    const sheets = workbook.sheets || [];
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name || `Sheet${index + 1}`)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`);
    zip.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.folder('xl').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    const sheetFolder = zip.folder('xl').folder('worksheets');
    sheets.forEach((sheet, sheetIndex) => {
      const rows = new Map();
      Object.entries(sheet.cells || {}).forEach(([ref, raw]) => {
        const position = excelPosition(ref);
        if (!position) return;
        if (!rows.has(position.row + 1)) rows.set(position.row + 1, []);
        const formula = String(raw).startsWith('=') ? String(raw).slice(1) : '';
        const evaluated = formula ? excelSheetValue(ref, sheet) : raw;
        const numeric = evaluated !== '' && Number.isFinite(Number(evaluated));
        const cellXml = formula
          ? `<c r="${ref}"${numeric ? '' : ' t="str"'}><f>${xmlEscape(formula)}</f><v>${xmlEscape(evaluated)}</v></c>`
          : numeric
            ? `<c r="${ref}"><v>${Number(evaluated)}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(raw)}</t></is></c>`;
        rows.get(position.row + 1).push(cellXml);
      });
      const rowXml = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([row, cells]) => `<row r="${row}">${cells.join('')}</row>`).join('');
      sheetFolder.file(`sheet${sheetIndex + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`);
    });
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  }

  async function importWorkbookXlsx(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const workbookFile = zip.file('xl/workbook.xml');
    if (!workbookFile) throw new Error('This XLSX file does not contain a workbook.');
    const workbookXml = parseXml(await workbookFile.async('text'));
    const relsXml = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('text'));
    const relationships = {};
    xmlElements(relsXml, 'Relationship').forEach(item => { relationships[item.getAttribute('Id')] = item.getAttribute('Target'); });
    let sharedStrings = [];
    const sharedFile = zip.file('xl/sharedStrings.xml');
    if (sharedFile) {
      const sharedXml = parseXml(await sharedFile.async('text'));
      sharedStrings = xmlElements(sharedXml, 'si').map(item => xmlElements(item, 't').map(node => node.textContent).join(''));
    }
    const sheets = [];
    for (const sheetNode of xmlElements(workbookXml, 'sheet')) {
      const relationshipId = sheetNode.getAttribute('r:id') || sheetNode.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const target = relationships[relationshipId];
      if (!target) continue;
      const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
      const worksheetFile = zip.file(path);
      if (!worksheetFile) continue;
      const worksheetXml = parseXml(await worksheetFile.async('text'));
      const cells = {};
      xmlElements(worksheetXml, 'c').forEach(cell => {
        const ref = cell.getAttribute('r');
        if (!ref) return;
        const formula = firstXml(cell, 'f')?.textContent;
        if (formula) {
          cells[ref] = `=${formula}`;
          return;
        }
        const type = cell.getAttribute('t');
        const value = firstXml(cell, 'v')?.textContent ?? '';
        if (type === 's') cells[ref] = sharedStrings[Number(value)] ?? '';
        else if (type === 'inlineStr') cells[ref] = xmlElements(cell, 't').map(node => node.textContent).join('');
        else if (type === 'b') cells[ref] = value === '1' ? 'TRUE' : 'FALSE';
        else cells[ref] = value;
      });
      sheets.push({ name: sheetNode.getAttribute('name') || `Sheet${sheets.length + 1}`, tabColor: '', cells, styles: {} });
    }
    if (!sheets.length) throw new Error('No readable worksheets were found.');
    return { name: file.name.replace(/\.xlsx$/i, ''), active: 0, selected: 'A1', sheets };
  }

  function initExcel(win) {
    const ROWS = 50;
    const COLUMNS = 20;
    const workspaceId = String(win.dataset.workstation || window.FINDATWorkstations?.activeId || 1);
    const legacyStorageKey = 'aurelia.cloud.excel.v4';
    const storageKey = `${legacyStorageKey}.workstation.${workspaceId}`;
    if (workspaceId === '1' && !localStorage.getItem(storageKey) && localStorage.getItem(legacyStorageKey)) localStorage.setItem(storageKey, localStorage.getItem(legacyStorageKey));
    let workbook = readJSON(storageKey, defaultWorkbook());
    if (!Array.isArray(workbook.sheets) || !workbook.sheets.length) workbook = defaultWorkbook();
    workbook.active = Math.max(0, Math.min(workbook.active || 0, workbook.sheets.length - 1));
    const grid = qs('[data-excel-grid]', win);
    const formula = qs('[data-excel-formula]', win);
    const nameBox = qs('[data-excel-name]', win);
    const tabs = qs('[data-excel-tabs]', win);
    const status = qs('[data-excel-status]', win);
    const formatSelect = qs('[data-excel-format]', win);
    const undoStack = [];
    const redoStack = [];

    const sheet = () => workbook.sheets[workbook.active];
    const snapshot = () => JSON.stringify(workbook);
    const remember = () => {
      undoStack.push(snapshot());
      if (undoStack.length > 35) undoStack.shift();
      redoStack.length = 0;
    };
    const persist = debounce(() => {
      writeJSON(storageKey, workbook);
      status.textContent = '☁ Saved to FINDAT Cloud';
    }, 280);
    const changed = () => { status.textContent = '☁ Syncing…'; persist(); };

    grid.style.setProperty('--excel-cols', COLUMNS);
    let markup = '<div class="excel-corner"></div>';
    for (let column = 0; column < COLUMNS; column += 1) markup += `<div class="excel-col-head">${excelColumnName(column)}</div>`;
    for (let row = 0; row < ROWS; row += 1) {
      markup += `<div class="excel-row-head">${row + 1}</div>`;
      for (let column = 0; column < COLUMNS; column += 1) markup += `<div class="excel-cell" contenteditable="true" spellcheck="false" data-ref="${excelColumnName(column)}${row + 1}" role="gridcell"></div>`;
    }
    grid.innerHTML = markup;

    const applyStyle = (cell, style = {}) => {
      cell.style.fontWeight = style.bold ? '700' : '';
      cell.style.fontStyle = style.italic ? 'italic' : '';
      cell.style.textDecoration = style.underline ? 'underline' : '';
      cell.style.color = style.color || '';
      cell.style.backgroundColor = style.fill || '';
      cell.style.textAlign = style.align || '';
    };
    const renderCell = ref => {
      const cell = qs(`[data-ref="${ref}"]`, grid);
      if (!cell || document.activeElement === cell) return;
      const currentSheet = sheet();
      const rawValue = excelSheetValue(ref, currentSheet);
      const style = currentSheet.styles?.[ref] || {};
      const display = excelFormatDisplay(rawValue, style);
      cell.textContent = display;
      applyStyle(cell, style);
      cell.classList.toggle('formula-error', String(display).startsWith('#'));
      cell.classList.toggle('numeric', display !== '' && Number.isFinite(Number(rawValue)) && !style.align);
      cell.title = String(currentSheet.cells?.[ref] ?? '');
    };
    const renderAll = () => qsa('.excel-cell', grid).forEach(cell => renderCell(cell.dataset.ref));
    const sheetTabColors = ['', '#ff5f57', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#8e8e93'];
    const cleanSheetName = value => String(value || '').trim().replace(/[:\\/?*\[\]]/g, ' ').replace(/\s+/g, ' ').slice(0, 31);

    const renameSheet = async index => {
      const current = workbook.sheets[index];
      if (!current) return;
      const nextName = cleanSheetName(await systemPrompt('Worksheet name', current.name, { title: 'Rename Worksheet', okLabel: 'Rename' }));
      if (!nextName || nextName === current.name) return;
      if (workbook.sheets.some((item, itemIndex) => itemIndex !== index && item.name.toLowerCase() === nextName.toLowerCase())) {
        toast('A worksheet with that name already exists');
        return;
      }
      remember();
      current.name = nextName;
      renderTabs();
      changed();
    };

    const deleteSheet = async index => {
      const current = workbook.sheets[index];
      if (!current) return;
      if (workbook.sheets.length === 1) {
        toast('A workbook must contain at least one worksheet');
        return;
      }
      if (!await systemConfirm(`Delete “${current.name}”?\n\nThis worksheet and all of its cells will be removed.`, { title: 'Delete Worksheet', okLabel: 'Delete', destructive: true })) return;
      remember();
      workbook.sheets.splice(index, 1);
      if (workbook.active > index) workbook.active -= 1;
      else if (workbook.active === index) workbook.active = Math.min(index, workbook.sheets.length - 1);
      workbook.selected = 'A1';
      renderTabs();
      renderAll();
      selectCell('A1');
      changed();
    };

    const setSheetTabColor = (index, color) => {
      const current = workbook.sheets[index];
      if (!current) return;
      remember();
      current.tabColor = sheetTabColors.includes(color) ? color : '';
      renderTabs();
      changed();
    };

    const showSheetTabContextMenu = (index, x, y) => {
      const current = workbook.sheets[index];
      const menu = qs('#contextMenu');
      if (!current || !menu) return;
      const colors = sheetTabColors.map(color => {
        const label = color ? `Set tab color ${color}` : 'Clear tab color';
        const selected = (current.tabColor || '') === color ? ' selected' : '';
        return `<button type="button" class="sheet-tab-color-swatch${selected}${color ? '' : ' clear'}" data-excel-tab-color="${color}" aria-label="${label}" title="${label}"${color ? ` style="--swatch:${color}"` : ''}></button>`;
      }).join('');
      menu.innerHTML = `
        <button type="button" data-excel-tab-action="rename"><span>Rename</span></button>
        <button type="button" data-excel-tab-action="delete" ${workbook.sheets.length === 1 ? 'disabled' : ''}><span>Delete</span></button>
        <hr>
        <div class="sheet-tab-color-title">Tab Color</div>
        <div class="sheet-tab-color-palette">${colors}</div>`;
      positionFindatContextMenu(menu, x, y, 244);
      qsa('[data-excel-tab-action]', menu).forEach(button => button.addEventListener('click', () => {
        menu.classList.add('hidden');
        if (button.dataset.excelTabAction === 'rename') renameSheet(index);
        if (button.dataset.excelTabAction === 'delete') deleteSheet(index);
      }));
      qsa('[data-excel-tab-color]', menu).forEach(button => button.addEventListener('click', () => {
        menu.classList.add('hidden');
        setSheetTabColor(index, button.dataset.excelTabColor || '');
      }));
    };

    const renderTabs = () => {
      tabs.innerHTML = workbook.sheets.map((item, index) => `<button class="excel-tab ${index === workbook.active ? 'active' : ''}" data-sheet-index="${index}">${escapeHtml(item.name)}</button>`).join('');
      qsa('[data-sheet-index]', tabs).forEach(button => {
        const index = Number(button.dataset.sheetIndex);
        const item = workbook.sheets[index];
        if (/^#[0-9a-f]{6}$/i.test(item?.tabColor || '')) button.style.setProperty('--sheet-tab-color', item.tabColor);
        button.addEventListener('click', () => {
          workbook.active = index;
          workbook.selected = 'A1';
          renderTabs(); renderAll(); selectCell('A1'); changed();
        });
        button.addEventListener('dblclick', () => renameSheet(index));
        button.addEventListener('contextmenu', event => {
          event.preventDefault();
          event.stopPropagation();
          showSheetTabContextMenu(index, event.clientX, event.clientY);
        });
      });
    };
    const selectCell = ref => {
      const cell = qs(`[data-ref="${ref}"]`, grid);
      if (!cell) return;
      qsa('.excel-cell.selected', grid).forEach(item => item.classList.remove('selected'));
      cell.classList.add('selected');
      workbook.selected = ref;
      nameBox.textContent = ref;
      formula.value = sheet().cells?.[ref] ?? '';
      const style = sheet().styles?.[ref] || {};
      formatSelect.value = style.format || 'general';
    };
    const commit = (ref, value, withHistory = true) => {
      if (withHistory) remember();
      const currentSheet = sheet();
      currentSheet.cells ||= {};
      const clean = String(value ?? '').replace(/\r/g, '').trim();
      if (clean) currentSheet.cells[ref] = clean;
      else delete currentSheet.cells[ref];
      renderAll(); selectCell(ref); changed();
    };
    const focusRelative = (ref, rowOffset, columnOffset) => {
      const position = excelPosition(ref);
      if (!position) return;
      const row = Math.max(0, Math.min(ROWS - 1, position.row + rowOffset));
      const column = Math.max(0, Math.min(COLUMNS - 1, position.column + columnOffset));
      qs(`[data-ref="${excelColumnName(column)}${row + 1}"]`, grid)?.focus();
    };

    qsa('.excel-cell', grid).forEach(cell => {
      cell.addEventListener('pointerdown', () => selectCell(cell.dataset.ref));
      cell.addEventListener('focus', () => {
        selectCell(cell.dataset.ref);
        cell.textContent = sheet().cells?.[cell.dataset.ref] ?? '';
        applyStyle(cell, sheet().styles?.[cell.dataset.ref] || {});
      });
      cell.addEventListener('input', () => { formula.value = cell.textContent; status.textContent = 'Editing'; });
      cell.addEventListener('blur', () => commit(cell.dataset.ref, cell.textContent));
      cell.addEventListener('keydown', event => {
        const ref = cell.dataset.ref;
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit(ref, cell.textContent); focusRelative(ref, 1, 0); }
        if (event.key === 'Tab') { event.preventDefault(); commit(ref, cell.textContent); focusRelative(ref, 0, event.shiftKey ? -1 : 1); }
        if (event.key === 'ArrowUp' && !cell.textContent) { event.preventDefault(); focusRelative(ref, -1, 0); }
        if (event.key === 'ArrowDown' && !cell.textContent) { event.preventDefault(); focusRelative(ref, 1, 0); }
      });
    });

    grid.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text/plain');
      if (!text || !workbook.selected) return;
      event.preventDefault(); remember();
      const start = excelPosition(workbook.selected);
      text.replace(/\r/g, '').split('\n').forEach((line, rowOffset) => line.split('\t').forEach((value, columnOffset) => {
        const row = start.row + rowOffset;
        const column = start.column + columnOffset;
        if (row < ROWS && column < COLUMNS) sheet().cells[`${excelColumnName(column)}${row + 1}`] = value;
      }));
      renderAll(); changed(); toast('Cells pasted');
    });

    formula.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault(); commit(workbook.selected || 'A1', formula.value); qs(`[data-ref="${workbook.selected || 'A1'}"]`, grid)?.focus();
    });

    const formatSelected = patch => {
      const ref = workbook.selected || 'A1';
      remember();
      sheet().styles ||= {};
      sheet().styles[ref] = { ...(sheet().styles[ref] || {}), ...patch };
      renderCell(ref); selectCell(ref); changed();
    };
    qsa('[data-excel-style]', win).forEach(button => button.addEventListener('click', () => {
      const property = button.dataset.excelStyle;
      formatSelected({ [property]: !sheet().styles?.[workbook.selected]?.[property] });
    }));
    qsa('[data-excel-align]', win).forEach(button => button.addEventListener('click', () => formatSelected({ align: button.dataset.excelAlign })));
    qs('[data-excel-color]', win).addEventListener('input', event => formatSelected({ color: event.target.value }));
    qs('[data-excel-fill]', win).addEventListener('input', event => formatSelected({ fill: event.target.value }));
    formatSelect.addEventListener('change', event => formatSelected({ format: event.target.value }));

    qsa('[data-excel-sort]', win).forEach(button => button.addEventListener('click', () => {
      const selected = excelPosition(workbook.selected || 'A1');
      if (!selected) return;
      remember();
      const rows = [];
      for (let row = 1; row < ROWS; row += 1) {
        const rowData = {};
        for (let column = 0; column < COLUMNS; column += 1) {
          const ref = `${excelColumnName(column)}${row + 1}`;
          rowData[column] = sheet().cells[ref] ?? '';
        }
        rows.push(rowData);
      }
      rows.sort((a, b) => String(a[selected.column]).localeCompare(String(b[selected.column]), undefined, { numeric: true }) * (button.dataset.excelSort === 'desc' ? -1 : 1));
      rows.forEach((rowData, rowIndex) => {
        for (let column = 0; column < COLUMNS; column += 1) {
          const ref = `${excelColumnName(column)}${rowIndex + 2}`;
          if (rowData[column] !== '') sheet().cells[ref] = rowData[column]; else delete sheet().cells[ref];
        }
      });
      renderAll(); changed();
    }));

    qs('[data-excel-undo]', win).addEventListener('click', () => {
      if (!undoStack.length) return;
      redoStack.push(snapshot());
      workbook = JSON.parse(undoStack.pop());
      renderTabs(); renderAll(); selectCell(workbook.selected || 'A1'); changed();
    });
    qs('[data-excel-redo]', win).addEventListener('click', () => {
      if (!redoStack.length) return;
      undoStack.push(snapshot());
      workbook = JSON.parse(redoStack.pop());
      renderTabs(); renderAll(); selectCell(workbook.selected || 'A1'); changed();
    });

    qs('[data-excel-new]', win).addEventListener('click', async () => {
      if (!await systemConfirm('Create a new cloud workbook?', { title: 'New Workbook', okLabel: 'Create' })) return;
      remember(); workbook = defaultWorkbook(); renderTabs(); renderAll(); selectCell('A1'); changed();
    });
    qs('[data-excel-save]', win).addEventListener('click', () => { writeJSON(storageKey, workbook); status.textContent = '☁ Saved to FINDAT Cloud'; toast('Workbook saved to FINDAT Cloud'); });
    qs('[data-excel-add-sheet]', win).addEventListener('click', () => {
      remember();
      const name = `Sheet${workbook.sheets.length + 1}`;
      workbook.sheets.push({ name, tabColor: '', cells: {}, styles: {} }); workbook.active = workbook.sheets.length - 1;
      renderTabs(); renderAll(); selectCell('A1'); changed();
    });
    qs('[data-excel-export-csv]', win).addEventListener('click', () => {
      const used = Object.keys(sheet().cells || {}).map(excelPosition).filter(Boolean);
      const maxRow = Math.max(0, ...used.map(item => item.row));
      const maxColumn = Math.max(0, ...used.map(item => item.column));
      const quote = value => /[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
      const csv = Array.from({ length: maxRow + 1 }, (_, row) => Array.from({ length: maxColumn + 1 }, (_, column) => quote(sheet().cells[`${excelColumnName(column)}${row + 1}`] ?? '')).join(',')).join('\n');
      downloadBlob(`${safeName(workbook.name, 'Workbook')}.csv`, csv, 'text/csv;charset=utf-8');
    });
    qs('[data-excel-export-xlsx]', win).addEventListener('click', async () => {
      status.textContent = 'Packaging XLSX…';
      try {
        const blob = await exportWorkbookXlsx(workbook);
        downloadBlob(`${safeName(workbook.name, 'Workbook')}.xlsx`, blob);
        status.textContent = '☁ Saved to FINDAT Cloud';
      } catch (error) {
        toast(error.message);
        status.textContent = 'Export failed';
      }
    });
    const fileInput = qs('[data-excel-file]', win);
    qs('[data-excel-import]', win).addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        remember();
        if (/\.xlsx$/i.test(file.name)) workbook = await importWorkbookXlsx(file);
        else {
          const text = await file.text();
          const cells = {};
          text.replace(/\r/g, '').split('\n').forEach((line, row) => splitFormulaArgs(line).forEach((value, column) => { if (value !== '') cells[`${excelColumnName(column)}${row + 1}`] = value.replace(/^"|"$/g, ''); }));
          workbook = { name: file.name.replace(/\.csv$/i, ''), active: 0, selected: 'A1', sheets: [{ name: 'Sheet1', tabColor: '', cells, styles: {} }] };
        }
        renderTabs(); renderAll(); selectCell('A1'); changed(); toast('Workbook opened');
      } catch (error) {
        toast(`Could not open workbook: ${error.message}`);
      } finally {
        fileInput.value = '';
      }
    });

    renderTabs(); renderAll(); selectCell(workbook.selected || 'A1');
  }

  // ---------------------------------------------------------------------------
  // Word
  // ---------------------------------------------------------------------------

  apps.word = {
    title: 'MS Word',
    html: () => `<div class="office-app word-app cloud-office-app">
      <div class="office-ribbon word-ribbon cloud-ribbon">
        <div class="office-brand">${iconSvg('word')}<div><b>Word</b><span>☁ FINDAT Cloud document</span></div></div>
        <input class="office-file-title" data-word-title value="Cloud Document" aria-label="Document title">
        <div class="office-actions">
          <button data-word-new>New</button><button data-word-save>Save</button><button data-word-import>Open</button>
          <select data-word-export><option value="">Export…</option><option value="docx">Word DOCX</option><option value="html">Web HTML</option><option value="txt">Plain text</option></select>
          <button data-word-print>Print / PDF</button>
          <input data-word-file type="file" accept=".docx,.html,.htm,.txt,.doc,text/plain,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>
        </div>
        <div class="word-formatting">
          <button data-word-cmd="undo">↶</button><button data-word-cmd="redo">↷</button>
          <select data-word-block><option value="p">Normal</option><option value="h1">Title</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="blockquote">Quote</option></select>
          <select data-word-font><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Courier New</option><option>Verdana</option></select>
          <select data-word-size><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option><option value="7">36</option></select>
          <button data-word-cmd="bold"><b>B</b></button><button data-word-cmd="italic"><i>I</i></button><button data-word-cmd="underline"><u>U</u></button><button data-word-cmd="strikeThrough"><s>S</s></button>
          <button data-word-cmd="superscript">x²</button><button data-word-cmd="subscript">x₂</button>
          <button data-word-cmd="insertUnorderedList">• List</button><button data-word-cmd="insertOrderedList">1. List</button>
          <button data-word-cmd="justifyLeft">⇤</button><button data-word-cmd="justifyCenter">↔</button><button data-word-cmd="justifyRight">⇥</button><button data-word-cmd="justifyFull">☰</button>
          <button data-word-cmd="outdent">Outdent</button><button data-word-cmd="indent">Indent</button>
          <label>Text <input data-word-color type="color" value="#1f2937"></label><label>Highlight <input data-word-highlight type="color" value="#fff59d"></label>
          <button data-word-link>Link</button><button data-word-table>Table</button><button data-word-image>Image</button><button data-word-find>Find</button><button data-word-clean>Clear format</button>
          <input data-word-image-file type="file" accept="image/*" hidden>
        </div>
      </div>
      <div class="word-layout-bar"><label>Page <select data-word-page-size><option value="a4">A4</option><option value="letter">Letter</option></select></label><label>Zoom <input data-word-zoom type="range" min="70" max="140" value="100"></label><span data-word-cloud>☁ Saved to FINDAT Cloud</span></div>
      <div class="word-workspace"><article class="word-page" data-word-editor contenteditable="true" spellcheck="true"><h1>Cloud Document</h1><p>Start writing. Your work is saved automatically in the FINDAT Cloud workspace.</p></article></div>
      <div class="office-status"><span data-word-saved>☁ Saved to FINDAT Cloud</span><span data-word-count>0 words</span></div>
    </div>`
  };

  function wordInlineRuns(node, inherited = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || '';
      if (!text) return '';
      const properties = [];
      if (inherited.bold) properties.push('<w:b/>');
      if (inherited.italic) properties.push('<w:i/>');
      if (inherited.underline) properties.push('<w:u w:val="single"/>');
      if (inherited.strike) properties.push('<w:strike/>');
      if (inherited.color) properties.push(`<w:color w:val="${inherited.color.replace('#', '')}"/>`);
      return `<w:r>${properties.length ? `<w:rPr>${properties.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.tagName === 'BR') return '<w:r><w:br/></w:r>';
    if (node.tagName === 'IMG') return `<w:r><w:t>[Image: ${xmlEscape(node.alt || 'embedded image')}]</w:t></w:r>`;
    const style = { ...inherited };
    if (['B', 'STRONG'].includes(node.tagName) || node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) style.bold = true;
    if (['I', 'EM'].includes(node.tagName) || node.style.fontStyle === 'italic') style.italic = true;
    if (node.tagName === 'U' || node.style.textDecoration.includes('underline')) style.underline = true;
    if (['S', 'STRIKE'].includes(node.tagName) || node.style.textDecoration.includes('line-through')) style.strike = true;
    if (node.style.color) {
      const match = node.style.color.match(/#([0-9a-f]{6})/i);
      if (match) style.color = match[1];
    }
    return [...node.childNodes].map(child => wordInlineRuns(child, style)).join('');
  }

  function wordDocumentXml(editor) {
    const blocks = [];
    const blockNodes = [...editor.childNodes];
    blockNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.trim()) blocks.push(`<w:p>${wordInlineRuns(node)}</w:p>`);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.tagName === 'TABLE') {
        const rows = [...node.rows].map(row => `<w:tr>${[...row.cells].map(cell => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p>${wordInlineRuns(cell)}</w:p></w:tc>`).join('')}</w:tr>`).join('');
        blocks.push(`<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7C2CE"/><w:left w:val="single" w:sz="4" w:color="B7C2CE"/><w:bottom w:val="single" w:sz="4" w:color="B7C2CE"/><w:right w:val="single" w:sz="4" w:color="B7C2CE"/><w:insideH w:val="single" w:sz="4" w:color="B7C2CE"/><w:insideV w:val="single" w:sz="4" w:color="B7C2CE"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`);
        return;
      }
      const styleMap = { H1: 'Title', H2: 'Heading1', H3: 'Heading2', BLOCKQUOTE: 'Quote' };
      const paragraphProperties = [];
      if (styleMap[node.tagName]) paragraphProperties.push(`<w:pStyle w:val="${styleMap[node.tagName]}"/>`);
      const alignment = node.style.textAlign;
      if (alignment) paragraphProperties.push(`<w:jc w:val="${alignment === 'justify' ? 'both' : alignment}"/>`);
      let prefix = '';
      if (node.tagName === 'LI') prefix = node.parentElement?.tagName === 'OL' ? '1. ' : '• ';
      blocks.push(`<w:p>${paragraphProperties.length ? `<w:pPr>${paragraphProperties.join('')}</w:pPr>` : ''}${prefix ? `<w:r><w:t>${prefix}</w:t></w:r>` : ''}${wordInlineRuns(node)}</w:p>`);
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  }

  async function exportWordDocx(editor, title) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    zip.folder('word').file('document.xml', wordDocumentXml(editor));
    zip.folder('word').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/><w:color w:val="666666"/></w:rPr></w:style></w:styles>`);
    zip.folder('docProps').file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>FINDAT Cloud</dc:creator><dcterms:created>${new Date().toISOString()}</dcterms:created></cp:coreProperties>`);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
  }

  async function importWordDocx(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) throw new Error('No Word document content was found.');
    const doc = parseXml(await documentFile.async('text'));
    const body = firstXml(doc, 'body');
    if (!body) return '';
    const runHtml = run => {
      let text = xmlElements(run, 't').map(item => item.textContent).join('');
      if (xmlElements(run, 'br').length) text += '<br>';
      text = escapeHtml(text);
      const props = firstXml(run, 'rPr');
      if (props) {
        if (xmlElements(props, 'b').length) text = `<b>${text}</b>`;
        if (xmlElements(props, 'i').length) text = `<i>${text}</i>`;
        if (xmlElements(props, 'u').length) text = `<u>${text}</u>`;
        if (xmlElements(props, 'strike').length) text = `<s>${text}</s>`;
        const color = firstXml(props, 'color')?.getAttribute('w:val') || firstXml(props, 'color')?.getAttribute('val');
        if (color && color !== 'auto') text = `<span style="color:#${color}">${text}</span>`;
      }
      return text;
    };
    const output = [];
    [...body.childNodes].forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.localName === 'p') {
        const style = firstXml(firstXml(node, 'pPr') || node, 'pStyle')?.getAttribute('w:val') || firstXml(firstXml(node, 'pPr') || node, 'pStyle')?.getAttribute('val');
        const tag = style === 'Title' ? 'h1' : style === 'Heading1' ? 'h2' : style === 'Heading2' ? 'h3' : style === 'Quote' ? 'blockquote' : 'p';
        output.push(`<${tag}>${xmlElements(node, 'r').map(runHtml).join('') || '<br>'}</${tag}>`);
      } else if (node.localName === 'tbl') {
        const rows = xmlElements(node, 'tr').map(row => `<tr>${xmlElements(row, 'tc').map(cell => `<td>${xmlElements(cell, 'p').map(paragraph => xmlElements(paragraph, 'r').map(runHtml).join('')).join('<br>')}</td>`).join('')}</tr>`).join('');
        output.push(`<table>${rows}</table>`);
      }
    });
    return output.join('');
  }

  function initWord(win) {
    const workspaceId = String(win.dataset.workstation || window.FINDATWorkstations?.activeId || 1);
    const legacyStorageKey = 'aurelia.cloud.word.v4';
    const storageKey = `${legacyStorageKey}.workstation.${workspaceId}`;
    if (workspaceId === '1' && !localStorage.getItem(storageKey) && localStorage.getItem(legacyStorageKey)) localStorage.setItem(storageKey, localStorage.getItem(legacyStorageKey));
    let state = readJSON(storageKey, { title: 'Cloud Document', html: '<h1>Cloud Document</h1><p>Start writing. Your work is saved automatically in the FINDAT Cloud workspace.</p>', pageSize: 'a4' });
    const editor = qs('[data-word-editor]', win);
    const titleInput = qs('[data-word-title]', win);
    const savedLabel = qs('[data-word-saved]', win);
    const cloudLabel = qs('[data-word-cloud]', win);
    const countLabel = qs('[data-word-count]', win);
    const pageSize = qs('[data-word-page-size]', win);
    const workspace = qs('.word-workspace', win);
    editor.innerHTML = state.html || '';
    titleInput.value = state.title || 'Cloud Document';
    pageSize.value = state.pageSize || 'a4';

    const updateCount = () => {
      const text = editor.innerText.trim();
      const words = (text.match(/\S+/g) || []).length;
      countLabel.textContent = `${words} words · ${text.length} characters`;
    };
    const applyPageSize = () => {
      editor.classList.toggle('word-letter', pageSize.value === 'letter');
      state.pageSize = pageSize.value;
    };
    const saveNow = () => {
      state = { ...state, title: titleInput.value.trim() || 'Cloud Document', html: editor.innerHTML, updatedAt: new Date().toISOString() };
      writeJSON(storageKey, state);
      savedLabel.textContent = '☁ Saved to FINDAT Cloud';
      cloudLabel.textContent = '☁ Saved to FINDAT Cloud';
    };
    const save = debounce(saveNow, 350);
    const dirty = () => { savedLabel.textContent = '☁ Syncing…'; cloudLabel.textContent = '☁ Syncing…'; updateCount(); save(); };

    editor.addEventListener('input', dirty);
    titleInput.addEventListener('input', dirty);
    qsa('[data-word-cmd]', win).forEach(button => {
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => { editor.focus(); document.execCommand(button.dataset.wordCmd, false); dirty(); });
    });
    qs('[data-word-block]', win).addEventListener('change', event => { editor.focus(); document.execCommand('formatBlock', false, event.target.value); dirty(); });
    qs('[data-word-font]', win).addEventListener('change', event => { editor.focus(); document.execCommand('fontName', false, event.target.value); dirty(); });
    qs('[data-word-size]', win).addEventListener('change', event => { editor.focus(); document.execCommand('fontSize', false, event.target.value); dirty(); });
    qs('[data-word-color]', win).addEventListener('input', event => { editor.focus(); document.execCommand('foreColor', false, event.target.value); dirty(); });
    qs('[data-word-highlight]', win).addEventListener('input', event => { editor.focus(); document.execCommand('hiliteColor', false, event.target.value); dirty(); });
    qs('[data-word-link]', win).addEventListener('click', async () => {
      const url = await systemPrompt('Link address', 'https://', { title: 'Insert Link', okLabel: 'Insert', placeholder: 'https://' });
      if (!url) return;
      editor.focus(); document.execCommand('createLink', false, url); dirty();
    });
    qs('[data-word-table]', win).addEventListener('click', async () => {
      const rowValue = await systemPrompt('Rows', '3', { title: 'Insert Table', okLabel: 'Next' });
      if (rowValue === null) return;
      const columnValue = await systemPrompt('Columns', '3', { title: 'Insert Table', okLabel: 'Insert' });
      if (columnValue === null) return;
      const rows = Math.max(1, Math.min(20, Number(rowValue) || 3));
      const columns = Math.max(1, Math.min(10, Number(columnValue) || 3));
      const table = `<table><tbody>${Array.from({ length: rows }, () => `<tr>${Array.from({ length: columns }, () => '<td><br></td>').join('')}</tr>`).join('')}</tbody></table><p><br></p>`;
      editor.focus(); document.execCommand('insertHTML', false, table); dirty();
    });
    const imageInput = qs('[data-word-image-file]', win);
    qs('[data-word-image]', win).addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { editor.focus(); document.execCommand('insertImage', false, reader.result); dirty(); };
      reader.readAsDataURL(file); imageInput.value = '';
    });
    qs('[data-word-find]', win).addEventListener('click', async () => {
      const find = await systemPrompt('Find text', '', { title: 'Find and Replace', okLabel: 'Next' });
      if (!find) return;
      const replacement = await systemPrompt('Replace with (leave blank to only find)', '', { title: 'Find and Replace', okLabel: 'Replace' });
      if (replacement !== null) {
        editor.innerHTML = editor.innerHTML.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
        dirty();
      }
    });
    qs('[data-word-clean]', win).addEventListener('click', () => { editor.focus(); document.execCommand('removeFormat', false); dirty(); });
    pageSize.addEventListener('change', () => { applyPageSize(); dirty(); });
    qs('[data-word-zoom]', win).addEventListener('input', event => { editor.style.transform = `scale(${event.target.value / 100})`; editor.style.transformOrigin = 'top center'; workspace.style.setProperty('--word-zoom-space', `${Math.max(0, (event.target.value - 100) * 8)}px`); });
    qs('[data-word-new]', win).addEventListener('click', async () => {
      if (!await systemConfirm('Create a new cloud document?', { title: 'New Document', okLabel: 'Create' })) return;
      state = { title: 'Cloud Document', html: '<h1>Cloud Document</h1><p><br></p>', pageSize: 'a4' };
      titleInput.value = state.title; editor.innerHTML = state.html; pageSize.value = 'a4'; applyPageSize(); saveNow(); updateCount(); editor.focus();
    });
    qs('[data-word-save]', win).addEventListener('click', () => { saveNow(); toast('Document saved to FINDAT Cloud'); });
    qs('[data-word-print]', win).addEventListener('click', () => {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return toast('Allow pop-ups to use Print / PDF');
      printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(titleInput.value)}</title><style>body{max-width:800px;margin:50px auto;font:16px/1.6 Calibri,Arial;padding:0 30px}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px}</style></head><body>${editor.innerHTML}</body></html>`);
      printWindow.document.close(); printWindow.focus(); setTimeout(() => printWindow.print(), 250);
    });
    const exportSelect = qs('[data-word-export]', win);
    exportSelect.addEventListener('change', async () => {
      const type = exportSelect.value;
      exportSelect.value = '';
      const title = safeName(titleInput.value, 'Document');
      if (type === 'html') downloadBlob(`${title}.html`, `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{max-width:800px;margin:60px auto;font:16px/1.6 Calibri,Arial;padding:0 30px}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px}</style></head><body>${editor.innerHTML}</body></html>`, 'text/html;charset=utf-8');
      if (type === 'txt') downloadBlob(`${title}.txt`, editor.innerText, 'text/plain;charset=utf-8');
      if (type === 'docx') {
        try { downloadBlob(`${title}.docx`, await exportWordDocx(editor, title)); }
        catch (error) { toast(`DOCX export failed: ${error.message}`); }
      }
    });
    const fileInput = qs('[data-word-file]', win);
    qs('[data-word-import]', win).addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        if (/\.docx$/i.test(file.name)) editor.innerHTML = await importWordDocx(file);
        else {
          const text = await file.text();
          editor.innerHTML = /\.html?$/i.test(file.name) || /html/i.test(file.type) ? text.replace(/^.*?<body[^>]*>|<\/body>.*$/gis, '') : `<p>${escapeHtml(text).replace(/\n/g, '</p><p>')}</p>`;
        }
        titleInput.value = file.name.replace(/\.[^.]+$/, ''); dirty(); toast('Document opened');
      } catch (error) { toast(`Could not open document: ${error.message}`); }
      fileInput.value = '';
    });

    applyPageSize(); updateCount();
  }

  // ---------------------------------------------------------------------------
  // PowerPoint
  // ---------------------------------------------------------------------------

  const presentationThemes = {
    sunrise: { background: 'FFF1DC', title: '20305F', body: '33456E', accent: 'F28B68' },
    ocean: { background: '176DB0', title: 'FFFFFF', body: 'E9FAFF', accent: '54D8D0' },
    midnight: { background: '171A34', title: 'F4F0FF', body: 'D7D4EE', accent: '8E5CFF' },
    minimal: { background: 'FFFFFF', title: '20232A', body: '3D4149', accent: 'D04B27' },
    forest: { background: 'EAF4E5', title: '173D2B', body: '315846', accent: '4C9A63' }
  };

  const defaultPresentation = () => ({
    name: 'Cloud Presentation', current: 0,
    slides: [
      { title: 'FINDAT Cloud Presentation', body: 'Create, design and present without leaving FINDAT Cloud.', notes: 'Opening slide', theme: 'sunrise', layout: 'title', imageData: '' },
      { title: 'Productivity workspace', body: '• Add and reorder slides\n• Insert images\n• Add speaker notes\n• Export a real PPTX file', notes: '', theme: 'ocean', layout: 'content', imageData: '' }
    ]
  });

  apps.powerpoint = {
    title: 'PowerPoint',
    html: () => `<div class="office-app ppt-app cloud-office-app">
      <div class="office-ribbon ppt-ribbon cloud-ribbon">
        <div class="office-brand">${iconSvg('powerpoint')}<div><b>PowerPoint</b><span>☁ FINDAT Cloud presentation</span></div></div>
        <input class="office-file-title" data-ppt-name value="Cloud Presentation" aria-label="Presentation name">
        <div class="office-actions">
          <button data-ppt-new>New</button><button data-ppt-add>New slide</button><button data-ppt-duplicate>Duplicate</button><button data-ppt-delete>Delete</button>
          <button data-ppt-up>Move up</button><button data-ppt-down>Move down</button><button data-ppt-image>Image</button><button data-ppt-remove-image>Remove image</button>
          <button data-ppt-save>Save</button><button data-ppt-open>Open</button><button data-ppt-export-json>Backup</button><button data-ppt-export-pptx>Export PPTX</button><button class="primary" data-ppt-present>Present</button>
          <input data-ppt-file type="file" accept=".json,.findat-presentation.json,.aurelia-presentation.json,application/json" hidden><input data-ppt-image-file type="file" accept="image/*" hidden>
        </div>
        <div class="ppt-options"><label>Layout <select data-ppt-layout><option value="title">Title slide</option><option value="content">Title and content</option><option value="section">Section heading</option><option value="blank">Blank</option></select></label><label>Theme <select data-ppt-theme>${Object.keys(presentationThemes).map(name => `<option value="${name}">${name[0].toUpperCase() + name.slice(1)}</option>`).join('')}</select></label><span data-ppt-cloud>☁ Saved to FINDAT Cloud</span></div>
      </div>
      <div class="ppt-workspace"><aside class="ppt-thumbnails" data-ppt-thumbnails></aside><main class="ppt-editor"><section class="ppt-slide theme-sunrise" data-ppt-slide><h1 data-ppt-title contenteditable="true"></h1><div data-ppt-body contenteditable="true"></div><img data-ppt-image-preview class="ppt-slide-image hidden" alt="Slide image"></section><textarea class="ppt-notes" data-ppt-notes placeholder="Speaker notes"></textarea></main></div>
      <div class="office-status"><span data-ppt-position>Slide 1 of 1</span><span data-ppt-saved>☁ Saved to FINDAT Cloud</span></div>
      <div class="ppt-presenter hidden" data-ppt-presenter><button data-ppt-exit>×</button><button class="ppt-nav prev" data-ppt-prev>‹</button><section data-ppt-stage></section><button class="ppt-nav next" data-ppt-next>›</button><aside data-ppt-presenter-notes></aside><small>Arrow keys to navigate · Esc to exit</small></div>
    </div>`
  };

  function initPowerPoint(win) {
    const workspaceId = String(win.dataset.workstation || window.FINDATWorkstations?.activeId || 1);
    const legacyStorageKey = 'aurelia.cloud.powerpoint.v4';
    const storageKey = `${legacyStorageKey}.workstation.${workspaceId}`;
    if (workspaceId === '1' && !localStorage.getItem(storageKey) && localStorage.getItem(legacyStorageKey)) localStorage.setItem(storageKey, localStorage.getItem(legacyStorageKey));
    let state = readJSON(storageKey, defaultPresentation());
    if (!Array.isArray(state.slides) || !state.slides.length) state = defaultPresentation();
    state.current = Math.max(0, Math.min(state.current || 0, state.slides.length - 1));
    const thumbnails = qs('[data-ppt-thumbnails]', win);
    const slide = qs('[data-ppt-slide]', win);
    const title = qs('[data-ppt-title]', win);
    const body = qs('[data-ppt-body]', win);
    const imagePreview = qs('[data-ppt-image-preview]', win);
    const notes = qs('[data-ppt-notes]', win);
    const theme = qs('[data-ppt-theme]', win);
    const layout = qs('[data-ppt-layout]', win);
    const nameInput = qs('[data-ppt-name]', win);
    const position = qs('[data-ppt-position]', win);
    const savedLabel = qs('[data-ppt-saved]', win);
    const cloudLabel = qs('[data-ppt-cloud]', win);
    const presenter = qs('[data-ppt-presenter]', win);
    const stage = qs('[data-ppt-stage]', win);
    const presenterNotes = qs('[data-ppt-presenter-notes]', win);
    nameInput.value = state.name || 'Cloud Presentation';

    const saveNow = () => {
      state.name = nameInput.value.trim() || 'Cloud Presentation';
      writeJSON(storageKey, state);
      savedLabel.textContent = '☁ Saved to FINDAT Cloud'; cloudLabel.textContent = '☁ Saved to FINDAT Cloud';
    };
    const save = debounce(saveNow, 300);
    const dirty = () => { savedLabel.textContent = '☁ Syncing…'; cloudLabel.textContent = '☁ Syncing…'; save(); };

    const currentSlide = () => state.slides[state.current];
    const renderStage = () => {
      const item = currentSlide();
      stage.className = `ppt-slide theme-${item.theme} layout-${item.layout}`;
      stage.innerHTML = `${item.layout === 'blank' ? '' : `<h1>${escapeHtml(item.title || 'Untitled')}</h1>`}${['content', 'section', 'title'].includes(item.layout) && item.body ? `<div>${escapeHtml(item.body).replace(/\n/g, '<br>')}</div>` : ''}${item.imageData ? `<img class="ppt-slide-image" src="${item.imageData}" alt="Slide image">` : ''}`;
      presenterNotes.textContent = item.notes || '';
    };
    const render = () => {
      const item = currentSlide();
      title.textContent = item.title || '';
      body.innerText = item.body || '';
      notes.value = item.notes || '';
      theme.value = item.theme || 'sunrise';
      layout.value = item.layout || 'content';
      slide.className = `ppt-slide theme-${theme.value} layout-${layout.value}`;
      title.classList.toggle('hidden', layout.value === 'blank');
      body.classList.toggle('hidden', !['content', 'section', 'title'].includes(layout.value));
      imagePreview.src = item.imageData || '';
      imagePreview.classList.toggle('hidden', !item.imageData);
      thumbnails.innerHTML = state.slides.map((slideItem, index) => `<button class="ppt-thumbnail ${index === state.current ? 'active' : ''}" data-ppt-index="${index}"><small>${index + 1}</small><div class="ppt-mini theme-${slideItem.theme}"><b>${escapeHtml(slideItem.title || 'Untitled')}</b><span>${escapeHtml(slideItem.body || '').slice(0, 75)}</span></div></button>`).join('');
      qsa('[data-ppt-index]', thumbnails).forEach(button => button.addEventListener('click', () => { state.current = Number(button.dataset.pptIndex); render(); dirty(); }));
      position.textContent = `Slide ${state.current + 1} of ${state.slides.length}`;
      renderStage();
    };
    const sync = () => {
      const item = currentSlide();
      item.title = title.innerText.replace(/\n/g, ' ').trim();
      item.body = body.innerText;
      item.notes = notes.value;
      dirty();
      const active = qs('.ppt-thumbnail.active', thumbnails);
      if (active) { qs('b', active).textContent = item.title || 'Untitled'; qs('span', active).textContent = item.body.slice(0, 75); }
      renderStage();
    };
    title.addEventListener('input', sync); body.addEventListener('input', sync); notes.addEventListener('input', sync); nameInput.addEventListener('input', dirty);
    theme.addEventListener('change', () => { currentSlide().theme = theme.value; render(); dirty(); });
    layout.addEventListener('change', () => { currentSlide().layout = layout.value; render(); dirty(); });

    qs('[data-ppt-new]', win).addEventListener('click', async () => { if (await systemConfirm('Create a new cloud presentation?', { title: 'New Presentation', okLabel: 'Create' })) { state = defaultPresentation(); nameInput.value = state.name; render(); saveNow(); } });
    qs('[data-ppt-add]', win).addEventListener('click', () => { state.slides.splice(state.current + 1, 0, { title: 'New slide', body: 'Add your content here.', notes: '', theme: theme.value, layout: 'content', imageData: '' }); state.current += 1; render(); dirty(); });
    qs('[data-ppt-duplicate]', win).addEventListener('click', () => { state.slides.splice(state.current + 1, 0, { ...currentSlide() }); state.current += 1; render(); dirty(); });
    qs('[data-ppt-delete]', win).addEventListener('click', () => { if (state.slides.length === 1) return toast('A presentation needs at least one slide'); state.slides.splice(state.current, 1); state.current = Math.min(state.current, state.slides.length - 1); render(); dirty(); });
    qs('[data-ppt-up]', win).addEventListener('click', () => { if (!state.current) return; [state.slides[state.current - 1], state.slides[state.current]] = [state.slides[state.current], state.slides[state.current - 1]]; state.current -= 1; render(); dirty(); });
    qs('[data-ppt-down]', win).addEventListener('click', () => { if (state.current >= state.slides.length - 1) return; [state.slides[state.current + 1], state.slides[state.current]] = [state.slides[state.current], state.slides[state.current + 1]]; state.current += 1; render(); dirty(); });
    const imageInput = qs('[data-ppt-image-file]', win);
    qs('[data-ppt-image]', win).addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => { const file = imageInput.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { currentSlide().imageData = reader.result; render(); dirty(); }; reader.readAsDataURL(file); imageInput.value = ''; });
    qs('[data-ppt-remove-image]', win).addEventListener('click', () => { currentSlide().imageData = ''; render(); dirty(); });
    qs('[data-ppt-save]', win).addEventListener('click', () => { saveNow(); toast('Presentation saved to FINDAT Cloud'); });
    qs('[data-ppt-export-json]', win).addEventListener('click', () => downloadBlob(`${safeName(state.name, 'Presentation')}.findat-presentation.json`, JSON.stringify({ aureliaPresentation: 2, ...state }, null, 2), 'application/json'));
    const fileInput = qs('[data-ppt-file]', win);
    qs('[data-ppt-open]', win).addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]; if (!file) return;
      try { const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed.slides)) throw new Error('Invalid presentation backup'); state = parsed; state.current = 0; nameInput.value = state.name || file.name.replace(/\..*$/, ''); render(); saveNow(); toast('Presentation opened'); }
      catch (error) { toast(error.message); }
      fileInput.value = '';
    });
    qs('[data-ppt-export-pptx]', win).addEventListener('click', async () => {
      if (!window.PptxGenJS) return toast('PPTX packaging library did not load');
      savedLabel.textContent = 'Packaging PPTX…';
      try {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'FINDAT Cloud'; pptx.subject = state.name; pptx.title = state.name; pptx.company = 'FINDAT Cloud'; pptx.lang = 'en-US';
        state.slides.forEach(item => {
          const palette = presentationThemes[item.theme] || presentationThemes.sunrise;
          const pptSlide = pptx.addSlide();
          pptSlide.background = { color: palette.background };
          if (item.layout !== 'blank') pptSlide.addText(item.title || 'Untitled', { x: 0.8, y: item.layout === 'title' ? 1.4 : 0.55, w: 11.7, h: 1.0, fontFace: 'Aptos Display', fontSize: item.layout === 'section' ? 38 : 30, bold: true, color: palette.title, margin: 0.05, breakLine: false });
          if (item.body && item.layout !== 'blank') pptSlide.addText(item.body, { x: 0.95, y: item.layout === 'title' ? 3.0 : 1.8, w: item.imageData ? 6.4 : 11.3, h: 4.6, fontFace: 'Aptos', fontSize: 19, color: palette.body, margin: 0.08, breakLine: false, valign: 'top', bullet: item.body.includes('•') ? { type: 'bullet' } : undefined });
          if (item.imageData) pptSlide.addImage({ data: item.imageData, x: 7.7, y: 1.6, w: 4.7, h: 4.4, transparency: 0 });
          pptSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.25, w: 13.333, h: 0.25, fill: { color: palette.accent }, line: { color: palette.accent } });
          if (item.notes && typeof pptSlide.addNotes === 'function') pptSlide.addNotes(item.notes);
        });
        await pptx.writeFile({ fileName: `${safeName(state.name, 'Presentation')}.pptx`, compression: true });
        savedLabel.textContent = '☁ Saved to FINDAT Cloud';
      } catch (error) { savedLabel.textContent = 'Export failed'; toast(`PPTX export failed: ${error.message}`); }
    });

    const showPresenter = () => { renderStage(); presenter.classList.remove('hidden'); presenter.focus(); };
    const hidePresenter = () => presenter.classList.add('hidden');
    qs('[data-ppt-present]', win).addEventListener('click', showPresenter); qs('[data-ppt-exit]', win).addEventListener('click', hidePresenter);
    const previous = () => { state.current = Math.max(0, state.current - 1); render(); };
    const next = () => { state.current = Math.min(state.slides.length - 1, state.current + 1); render(); };
    qs('[data-ppt-prev]', win).addEventListener('click', previous); qs('[data-ppt-next]', win).addEventListener('click', next);
    presenter.tabIndex = -1;
    presenter.addEventListener('keydown', event => { if (event.key === 'Escape') hidePresenter(); if (event.key === 'ArrowRight' || event.key === ' ') next(); if (event.key === 'ArrowLeft') previous(); });
    render();
  }

  // Remove retired applications and their obsolete state.
  ['sql', 'colab', 'chatgpt'].forEach(name => delete apps[name]);
  ['aurelia.productivity.sql.v2', 'aurelia.productivity.colab.v2', 'aurelia.productivity.chatgpt.v2'].forEach(key => localStorage.removeItem(key));

  const previousWireApp = wireApp;
  wireApp = function aureliaCloudOfficeWire(win, name) {
    previousWireApp(win, name);
    if (name === 'excel') initExcel(win);
    if (name === 'word') initWord(win);
    if (name === 'powerpoint') initPowerPoint(win);
  };

  const previousOpenApp = openApp;
  openApp = function aureliaCloudOfficeOpen(name) {
    previousOpenApp(name);
    const win = qs(`.app-window[data-app="${name}"]`);
    if (!win || win.dataset.cloudOfficeSized) return;
    if (['excel', 'word', 'powerpoint'].includes(name)) {
      win.dataset.cloudOfficeSized = 'true';
      win.style.width = 'min(1220px, 96vw)';
      win.style.height = 'min(790px, 89vh)';
      win.style.left = `${Math.max(6, (windowsEl.clientWidth - win.offsetWidth) / 2)}px`;
      win.style.top = `${Math.max(6, (windowsEl.clientHeight - win.offsetHeight) / 2)}px`;
    }
  };

  const aboutApp = apps.about;
  apps.about.html = () => aboutApp.html()
    .replace(/Version [^<]+/g, `Version ${SUITE_VERSION} Cloud Office Edition`)
    .replace(/browser-based virtual file system/gi, 'FINDAT Cloud workspace')
    .replace(/does not require Ruby or a local server/gi, 'runs as a self-contained HTML, CSS and JavaScript application');
})();
