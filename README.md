# rvsteele
Terminal-style personal portfolio built with Next.js + TypeScript.

## Run locally
```bash
npm install
npm run dev
```

## What it includes
- Simulated Linux-like terminal UI
- Virtual filesystem with read/write commands
- Editable files with `vim <file>` / `vi <file>` (backed by JSVI)

Inside vim:
- `:w` saves
- `:q` exits
- `:wq` saves and exits

## Third-party license notice (JSVI)
This project includes code from **JSVI** (`public/vendor/jsvi/vi.js`, `public/vendor/jsvi/vi.css`)
from https://github.com/jcubic/jsvi.

JSVI license:

JSVI - VI in JavaScript.  
Copyright (C) 2006-2008 Internet Connection, Inc.  
Copyright (C) 2013-2018 Jakub T. Jankiewicz

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA.
