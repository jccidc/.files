"""Generate .files app icon - modern folder with dot accent."""
from PIL import Image, ImageDraw
import struct, io, os

def draw_folder(size):
    """Draw a modern folder icon at given size with rounded aesthetics."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 512  # scale factor

    # Folder body colors
    body = '#3B82F6'       # accent blue
    body_dark = '#2563EB'  # darker blue for depth
    tab_color = '#60A5FA'  # lighter blue for tab
    dot_color = '#F8FAFC'  # white dot

    # Folder back (shadow/depth layer)
    d.rounded_rectangle(
        [s*56, s*100, s*456, s*430],
        radius=int(s*32),
        fill=body_dark
    )

    # Folder tab (top flap)
    tab_pts = [
        (s*80, s*100),
        (s*80, s*68),
        (s*100, s*48),
        (s*220, s*48),
        (s*248, s*80),
        (s*260, s*100),
    ]
    d.polygon(tab_pts, fill=tab_color)
    # round the tab top
    d.rounded_rectangle(
        [s*80, s*48, s*250, s*110],
        radius=int(s*20),
        fill=tab_color
    )

    # Folder front body
    d.rounded_rectangle(
        [s*48, s*120, s*464, s*440],
        radius=int(s*32),
        fill=body
    )

    # Subtle fold line
    d.line(
        [(s*80, s*170), (s*432, s*170)],
        fill=body_dark,
        width=max(1, int(s*3))
    )

    # The "dot" - represents the period in .files
    dot_r = int(s*36)
    dot_cx, dot_cy = int(s*256), int(s*300)
    d.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=dot_color
    )

    return img


def make_ico(images, path):
    """Create .ico from list of PIL images."""
    buf = io.BytesIO()
    # ICO header
    buf.write(struct.pack('<HHH', 0, 1, len(images)))
    # Calculate offsets
    data_offset = 6 + len(images) * 16
    entries = []
    datas = []
    for img in images:
        png_buf = io.BytesIO()
        img.save(png_buf, 'PNG')
        png_data = png_buf.getvalue()
        w = img.width if img.width < 256 else 0
        h = img.height if img.height < 256 else 0
        entries.append(struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png_data), data_offset))
        data_offset += len(png_data)
        datas.append(png_data)
    for e in entries:
        buf.write(e)
    for d in datas:
        buf.write(d)
    with open(path, 'wb') as f:
        f.write(buf.getvalue())


def make_icns(images_dict, path):
    """Create .icns from dict of {size: PIL Image}."""
    # icns type codes for sizes
    types = {
        16: b'icp4',   # 16x16 PNG
        32: b'icp5',   # 32x32 PNG
        64: b'icp6',   # 64x64 PNG
        128: b'ic07',  # 128x128 PNG
        256: b'ic08',  # 256x256 PNG
        512: b'ic09',  # 512x512 PNG
        1024: b'ic10', # 1024x1024 PNG
    }
    entries = []
    for sz, code in types.items():
        if sz in images_dict:
            png_buf = io.BytesIO()
            images_dict[sz].save(png_buf, 'PNG')
            png_data = png_buf.getvalue()
            entry = code + struct.pack('>I', len(png_data) + 8) + png_data
            entries.append(entry)
    body = b''.join(entries)
    header = b'icns' + struct.pack('>I', len(body) + 8)
    with open(path, 'wb') as f:
        f.write(header + body)


base = os.path.dirname(os.path.abspath(__file__))

# Generate at all needed sizes
sizes = {
    'icon.png': 512,
    '32x32.png': 32,
    '128x128.png': 128,
    '128x128@2x.png': 256,
    'Square30x30Logo.png': 30,
    'Square44x44Logo.png': 44,
    'Square71x71Logo.png': 71,
    'Square89x89Logo.png': 89,
    'Square107x107Logo.png': 107,
    'Square142x142Logo.png': 142,
    'Square150x150Logo.png': 150,
    'Square284x284Logo.png': 284,
    'Square310x310Logo.png': 310,
    'StoreLogo.png': 50,
}

images = {}
for name, sz in sizes.items():
    img = draw_folder(sz)
    img.save(os.path.join(base, name), 'PNG')
    images[sz] = img
    print(f'  {name} ({sz}x{sz})')

# Generate icon.ico (16, 24, 32, 48, 64, 128, 256)
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_images = []
for sz in ico_sizes:
    if sz in images:
        ico_images.append(images[sz])
    else:
        ico_images.append(draw_folder(sz))
make_ico(ico_images, os.path.join(base, 'icon.ico'))
print('  icon.ico')

# Generate icon.icns
icns_dict = {}
for sz in [16, 32, 64, 128, 256, 512]:
    if sz in images:
        icns_dict[sz] = images[sz]
    else:
        icns_dict[sz] = draw_folder(sz)
make_icns(icns_dict, os.path.join(base, 'icon.icns'))
print('  icon.icns')

print('Done!')
