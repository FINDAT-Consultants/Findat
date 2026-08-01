# FINDAT Collaborators and Python Charts Upgrade

## Collaborator picker

- The Collaborators button now always opens the active-user directory.
- The list contains active Clients, Consultants and Administrators, displaying profile pictures/initials and names only.
- The current paper author or an Administrator can send or change requests. Other people working on the paper can view the directory without silently receiving a disabled button.
- A new paper is saved as a draft when its author sends the first collaboration requests. Add a title and article content before sending.
- The five-person collaborator limit remains enforced.

## Python chart studio

- Statistical Charts & Tables now includes a browser Python editor.
- It runs in a module Web Worker using pinned Pyodide.
- The pasted CSV/TSV data is exposed to Python as `df`; raw text is available as `DATA_TEXT`.
- Templates cover Matplotlib, Seaborn, normal distribution curves, box plots and histograms.
- Custom Python can use packages supported by Pyodide.
- The latest Matplotlib figure is converted to a PNG preview and can then be inserted into the article.
- The initial run downloads the browser Python runtime and scientific packages, so it requires an internet connection and may take longer than later runs.

## Deployment

Deploy the complete ZIP to Netlify and replace the previous build. No new Supabase SQL or Edge Function is required for this update. Hard-refresh with Ctrl + Shift + R.
