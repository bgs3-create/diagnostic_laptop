# BGS_SHOP.spec
# Build dengan: pyinstaller BGS_SHOP.spec

import os
from pathlib import Path

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('templates',  'templates'),
        ('static',     'static'),
    ],
    hiddenimports=[
        'psutil', 'flask', 'jinja2', 'werkzeug',
        'engineio', 'sqlalchemy',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas,
    [],
    name='BGS_SHOP_Diagnostic',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,        # Ganti False jika tidak mau terminal muncul
    icon=None,           # Tambahkan path .ico jika ada: icon='static/img/icon.ico'
)
