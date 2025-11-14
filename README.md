# sinar-school-tool-app

Sinar School Tool is an **offline-first desktop app** for schools and institutes in Iraq.
It provides a simple Arabic RTL UI, self-contained SQLite database, and printable
reports/exports for day‑to‑day school operations. The app is built with Electron
and better-sqlite3 and runs completely offline.

---

## Current MVP scope

The UI in this build focuses on the core school data and timetable management:

- **Students**
  - Add / edit / delete students.
  - Fields: name, grade, section, parent phone, status, admission date.
  - Search by ID, name, or parent phone.
  - Basic validation for required fields and phone format.

- **Subjects**
  - Add / edit / delete subjects.
  - Unique subject names (duplicate names are rejected).
  - Exposed as a `<datalist>` used in the Teachers page.

- **Classes & Sections**
  - Manage **classes** with educational stage, grade label, branch, and shift
    (صباحي / مسائي).
  - Manage **sections** for each class with name, room, and capacity.
  - Cascading deletes (removing a class also removes its sections).

- **Teachers**
  - Add / edit / delete teachers.
  - Fields: name, subject (free text with suggestions), phone, status,
    hire date.
  - Search by ID, name, subject, or phone.
  - Basic validation for required fields and phone format.

- **Weekly Timetable**
  - Per‑section timetable; days (الأحد–الخميس) vs periods.
  - Uses the configured number of periods and optional time ranges
    from Settings.
  - Ensures no conflicts:
    - A section cannot have two entries at the same day/period.
    - A teacher cannot be assigned to two sections at the same day/period.
  - Simple UX:
    - Click a cell to select the day/period, then choose subject & teacher.
    - Hint text in empty cells explains that the user should click to
      define the period.
  - **Print timetable** for the currently selected class & section:
    - Uses school name and logo from Settings.
    - Renders a formal header and watermark similar to the Fees page
      pattern.
    - Hides controls when printing (only header + grid in print‑out).

- **Settings**
  - **School information**:
    - School name (used in all print headers).
    - School logo (stored as a Data URL and used as a watermark/logo
      in prints and receipts).
  - **Timetable settings**:
    - Configure the number of periods per day.
    - Configure from/to time for each period.

## Hidden / future features

The following modules are implemented in the database and renderer code, but
are **hidden from the UI** in this MVP:

- **Fees** (`#fees` section, `Fees.js`)
- **Income** (`#income` section, `Income.js`)
- **Expenses** (`#expenses` section, `Expenses.js`)
- **Salaries** (`#salaries` section, `Salaries.js`)
- **Reports** (`#reports` section, `Reports.js`)

To re‑enable them in a future release, you mainly need to:

1. Restore their tab buttons in `src/renderer/index.html` under
   `<nav class="tabs">` (for example, add buttons with `data-tab="fees"`,
   `income`, `expenses`, `salaries`, `reports`).
2. Optionally adjust the tab order to match the desired UX.

No database migrations are required; the tables, queries, and renderer logic
are already present.

---

## Tech Stack

- **Runtime / Shell**: Electron
  - Windows is the primary distribution target (dev on macOS).
- **Database**: SQLite via **better-sqlite3** (synchronous, fast embedded DB).
- **Frontend**: Vanilla HTML/CSS/JS with RTL‑friendly layout.
- **Icon tooling** (Windows): Node script using `to-ico`, `jimp`, `sharp`.

---

## Prerequisites

- **Node.js 18+** (recommended; CI uses 18).
- **Yarn** (Berry) – Corepack‑managed is supported.
- **Development OS**:
  - Windows or macOS.
  - macOS only: Xcode Command Line Tools (for native dependencies, if needed).

---

## Getting started (development)

Install dependencies:

```bash
yarn install
```

Run the app in dev mode:

```bash
yarn start
# or
yarn dev
```

This launches Electron and loads the renderer from `src/renderer/index.html`.

The app stores its SQLite database under the user’s home directory in a
`.school-finance` (or similar) application data folder, so local builds are
offline and self‑contained.

---

## Building installers (local)

Ensure you have the base icon PNG at `build/icon.png` before building.

### 1. Generate Windows ICO (from icon.png)

```bash
yarn gen:ico
```

This runs `scripts/gen-ico.js` and produces `build/icon.ico`, which is used by
electron‑builder for Windows.

### 2. Windows installers (portable + NSIS)

```bash
yarn dist:win
```

This uses the `build.win` section in `package.json` and builds:

- NSIS installer (interactive, Start menu + desktop shortcuts).
- Portable EXE (no installation, can be run directly).

### 3. macOS build (optional, local only)

Although the current CI workflow only builds Windows artifacts, you can still
build macOS archives locally:

```bash
yarn dist:mac
```

The `build.mac` section in `package.json` is configured to produce ZIP
artifacts using the ICNS icon at `build/icon.icns`.

---

## CI / Release workflow

The repo includes a GitHub Actions workflow:

- `.github/workflows/build-and-release.yml`

Behavior:

- Triggers on **push of any tag starting with `v`** (for example: `v0.1.1`,
  `v0.1.8`, `v1.0.0`).
- **build-win** job (Windows):
  - Checks out code.
  - Installs dependencies via `yarn install`.
  - Runs `node scripts/gen-ico.js` to generate `build/icon.ico` from
    `build/icon.png`.
  - Builds a Windows NSIS installer with `electron-builder`, setting the
    version from the tag (everything after the leading `v`).
  - Zips the installer and generates `dist/checksums-win.txt` with SHA‑256
    hashes.
  - Uploads EXE + ZIP + checksum as workflow artifacts.
- **release** job (Ubuntu):
  - Downloads the Windows artifacts.
  - Uses `softprops/action-gh-release` to create a GitHub Release for the tag
    and attach:
    - `*Setup*.exe`
    - `*Setup*.exe.zip`
    - `checksums-*.txt`

To cut a new release:

```bash
# after committing your changes
git tag v0.1.9
git push origin v0.1.9
```

GitHub Actions will build the Windows installer and publish a release for that
tag with all artifacts attached.
