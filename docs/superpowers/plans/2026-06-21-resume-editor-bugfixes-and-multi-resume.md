# Resume Editor Bugfixes And Multi-Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the blank editor and broken resume switching flow, support managing multiple resumes, create new resumes from the default template, and allow adding custom resume sections in the editor.

**Architecture:** Keep the current single-file `editor.html` editor architecture, but make the resume state model explicit and resilient. Store each resume as HTML under `resumes/`, load them through the Python service, parse them into a normalized JS data model, and regenerate HTML for preview/save. Add a new `customSections` array to support user-defined modules without restructuring the rest of the editor.

**Tech Stack:** Vanilla HTML/CSS/JS, Python `http.server`, Playwright, Node.js

---

### Task 1: Lock The Current Bugs Into A Browser Regression Script

**Files:**
- Create: `scripts/verify-editor-workflows.mjs`
- Modify: `package.json`
- Test: `scripts/verify-editor-workflows.mjs`

- [ ] **Step 1: Write the failing browser regression script**

```js
// The script should:
// 1. start serve.py on a test port
// 2. open editor.html in Playwright
// 3. assert the sidebar and preview render on first load
// 4. create two temporary resumes with different names/content
// 5. switch between them and assert the preview changes
// 6. create a new resume and assert it uses the default template
// 7. add a custom section, save, reload, and assert it persists
// 8. clean up temporary files
```

- [ ] **Step 2: Run the regression script to verify it fails before implementation**

Run: `node scripts/verify-editor-workflows.mjs`
Expected: FAIL because the current editor throws during initial parse and does not support custom sections.

- [ ] **Step 3: Add an npm script for the regression check**

```json
{
  "scripts": {
    "preview": "python -u serve.py 4173",
    "export:pdf": "node scripts/export-pdf.mjs",
    "verify:editor": "node scripts/verify-editor-workflows.mjs"
  }
}
```

- [ ] **Step 4: Re-run the script entrypoint**

Run: `npm run verify:editor`
Expected: still FAIL, now through the package script.

### Task 2: Fix Resume Loading, Parsing, And Switching

**Files:**
- Modify: `editor.html`
- Test: `scripts/verify-editor-workflows.mjs`

- [ ] **Step 1: Write the failing assertion target in the regression script**

```js
if (result.sidebarChildren === 0) throw new Error("editor sidebar did not render");
if (!result.previewName) throw new Error("preview did not render");
if (result.pageErrors.length) throw new Error(result.pageErrors.join("\n"));
```

- [ ] **Step 2: Implement the minimal state-model fixes in `editor.html`**

```js
const result = {
  header: null,
  education: [],
  infoLines: [],
  publications: [],
  internships: [],
  campus: [],
  projects: [],
  skills: [],
  customSections: []
};
```

```js
function normalizeData() {
  data.campus = (data.campus || []).map((item) => ({
    ...item,
    highlights: (item.highlights || []).map((highlight) => normalizeRichContent(highlight))
  }));
  data.customSections = (data.customSections || []).map((section) => ({
    title: String(section.title || "").trim() || "自定义模块",
    items: (section.items || []).map((item) => normalizeRichContent(item))
  }));
}
```

- [ ] **Step 3: Make switching use the same normalized load path every time**

```js
async function doLoadFile(filename) {
  const result = await loadResumeFile(filename);
  const parsed = extractResumeDataFromHTML(result.html);
  Object.assign(data, createDefaultData(), parsed);
  normalizeData();
  initUndoHistory();
  renderSidebar();
  renderPreviewNow();
}
```

- [ ] **Step 4: Re-run the regression script**

Run: `npm run verify:editor`
Expected: the initial blank-editor assertion passes; switching/custom-section checks still fail until later tasks.

### Task 3: Create New Resumes From The Default Template

**Files:**
- Modify: `serve.py`
- Test: `scripts/verify-editor-workflows.mjs`

- [ ] **Step 1: Write the failing template assertion**

```js
if (!newResumePreviewName || newResumePreviewName !== "Alex Chen") {
  throw new Error(`new resume did not use default template: ${newResumePreviewName}`);
}
```

- [ ] **Step 2: Replace the hard-coded blank template with file-backed default-template loading**

```python
DEFAULT_TEMPLATE_PATHS = [
    os.path.join(REPO, "index.template.html"),
    os.path.join(REPO, "index.html"),
]

def load_default_resume_template():
    for path in DEFAULT_TEMPLATE_PATHS:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    return BLANK_RESUME
```

```python
with open(path, "w", encoding="utf-8") as f:
    f.write(load_default_resume_template())
```

- [ ] **Step 3: Re-run the regression script**

Run: `npm run verify:editor`
Expected: new-resume template assertions pass; custom-section assertions still fail.

### Task 4: Add Custom Section Editing And Persistence

**Files:**
- Modify: `editor.html`
- Test: `scripts/verify-editor-workflows.mjs`

- [ ] **Step 1: Write the failing custom-section assertions**

```js
if (!savedPreviewText.includes("证书")) throw new Error("custom section title missing after save");
if (!savedPreviewText.includes("AWS Certified")) throw new Error("custom section content missing after save");
```

- [ ] **Step 2: Extend the editor data model, parser, renderer, and HTML generator**

```js
data.customSections = [
  { title: "证书", items: ["AWS Certified Solutions Architect"] }
];
```

```js
function renderCustomSections() {
  // Render editable custom section cards and add/remove item controls.
}
```

```js
if (data.customSections.length > 0) {
  data.customSections.forEach((section) => {
    html += `<section class="section custom-section">...</section>`;
  });
}
```

- [ ] **Step 3: Add editor actions for custom sections and items**

```js
function addCustomSection() {}
function removeCustomSection(index) {}
function addCustomSectionItem(index) {}
function removeCustomSectionItem(sectionIndex, itemIndex) {}
```

- [ ] **Step 4: Re-run the regression script**

Run: `npm run verify:editor`
Expected: PASS.

### Task 5: Final Verification

**Files:**
- Test: `scripts/verify-editor-workflows.mjs`
- Test: `scripts/verify-editor-load.mjs`

- [ ] **Step 1: Run the original editor-load regression**

Run: `node scripts/verify-editor-load.mjs`
Expected: PASS

- [ ] **Step 2: Run the new workflow regression**

Run: `npm run verify:editor`
Expected: PASS

- [ ] **Step 3: Sanity-check the current repo state**

Run: `git status --short`
Expected: only the intended modified files appear
