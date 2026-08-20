# -*- coding: utf-8 -*-
"""Repair 49_Main_font2_Arial.ttf's cmap so OTS will accept it.

The defect, read off the raw bytes: the format-4 subtable ends with **two**
segments whose endCode is 0xFFFF. The spec requires strictly increasing end
codes and a single terminal 0xFFFF segment, so Chrome's sanitiser rejects the
whole font with `cmap: Out of order end range (65535 <= 65535)` and the page
silently falls back to a system face.

The cause is that the font maps the non-characters U+FFFE/U+FFFF to real
glyphs. Those must never be mapped, and dropping them leaves exactly one
0xFFFF segment — the required terminator that fontTools adds on compile.
"""
import struct
import sys

from fontTools.ttLib import TTFont


def raw_format4_ends(path):
    """End codes straight off the disk, not via fontTools' normalisation."""
    d = open(path, 'rb').read()
    n = struct.unpack('>H', d[4:6])[0]
    out = []
    for i in range(n):
        off = 12 + i * 16
        if d[off:off + 4] != b'cmap':
            continue
        co = struct.unpack('>I', d[off + 8:off + 12])[0]
        nt = struct.unpack('>H', d[co + 2:co + 4])[0]
        for t in range(nt):
            rec = co + 4 + t * 8
            plat = struct.unpack('>H', d[rec:rec + 2])[0]
            enc = struct.unpack('>H', d[rec + 2:rec + 4])[0]
            so = struct.unpack('>I', d[rec + 4:rec + 8])[0] + co
            fmt = struct.unpack('>H', d[so:so + 2])[0]
            if fmt != 4:
                out.append((plat, enc, fmt, None))
                continue
            seg = struct.unpack('>H', d[so + 6:so + 8])[0] // 2
            ends = [struct.unpack('>H', d[so + 14 + j * 2:so + 16 + j * 2])[0] for j in range(seg)]
            out.append((plat, enc, fmt, ends))
    return out


SRC = 'F:/CircleDevelop/SWFimported/fonts/49_Main_font2_Arial.ttf'
DST = sys.argv[1]

print('BEFORE')
for plat, enc, fmt, ends in raw_format4_ends(SRC):
    if ends is None:
        print('  platform %d/%d format %d (not 4)' % (plat, enc, fmt))
        continue
    bad = [i for i in range(1, len(ends)) if ends[i] <= ends[i - 1]]
    print(
        '  platform %d/%d format 4: %d segments, last three %s, non-increasing at %s'
        % (plat, enc, len(ends), [hex(x) for x in ends[-3:]], bad)
    )

font = TTFont(SRC, lazy=False)
removed = 0
for sub in font['cmap'].tables:
    for cp in (0xFFFE, 0xFFFF):
        if cp in sub.cmap:
            del sub.cmap[cp]
            removed += 1
    # Anything above the BMP cannot live in a format-4 subtable either.
    for cp in [c for c in sub.cmap if c > 0xFFFD]:
        del sub.cmap[cp]
        removed += 1

print('dropped %d non-character mapping(s)' % removed)
font.save(DST)

print('AFTER')
ok = True
for plat, enc, fmt, ends in raw_format4_ends(DST):
    if ends is None:
        continue
    bad = [i for i in range(1, len(ends)) if ends[i] <= ends[i - 1]]
    if bad:
        ok = False
    print(
        '  platform %d/%d format 4: %d segments, last three %s, non-increasing at %s'
        % (plat, enc, len(ends), [hex(x) for x in ends[-3:]], bad)
    )

assert ok, 'the repaired font still has non-increasing end codes'

# The repair must not have cost coverage of anything real.
before = TTFont(SRC, lazy=False)
after = TTFont(DST, lazy=False)
b = set(before.getBestCmap())
a = set(after.getBestCmap())
lost = {c for c in b - a if c < 0xFFFE}
print('codepoints before %d, after %d, real ones lost: %d' % (len(b), len(a), len(lost)))
assert not lost, 'the repair dropped real characters: %s' % sorted(lost)[:10]
print('OK')
