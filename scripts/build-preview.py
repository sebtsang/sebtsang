"""Build a compact GitHub-style arcade card from game.js capturePreviewFrames().
Usage: python scripts/build-preview.py /path/to/png-frames (requires Pillow).
Capture 108 frames at 30 fps through docs/?capture.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def font(size):
    return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',size)

frames=[]
for source in sorted(Path(sys.argv[1]).glob('*.png')):
    court=Image.open(source).convert('RGB').crop((100,52,380,262)).resize((280,210),Image.Resampling.NEAREST)
    frame=Image.new('RGB',(640,360),'#151b23')
    draw=ImageDraw.Draw(frame)
    draw.rounded_rectangle((0,0,639,359),radius=8,outline='#3d444d')
    draw.line((1,32,638,32),fill='#3d444d')
    draw.text((12,10),'sebtsang /',font=font(10),fill='#a1abb6')
    draw.text((81,10),'Basketball',font=font(10),fill='#e6edf3')
    draw.text((28,158),'Click to play',font=font(19),fill='#e6edf3')
    draw.text((28,202),'[ enter game ]',font=font(11),fill='#adf0c0')
    mask=Image.new('L',court.size,0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,279,209),radius=16,fill=255)
    frame.paste(court,(340,88),mask)
    frames.append(frame)
# A shared palette prevents color flicker during the celebration.
samples=Image.new('RGB',(640,360*len(frames[::6])))
for i,f in enumerate(frames[::6]): samples.paste(f,(0,i*360))
palette=samples.quantize(colors=128)
encoded=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
# Preserve genuinely rounded outer corners against either GitHub theme.
corner_mask=Image.new('L',(640,360),255)
ImageDraw.Draw(corner_mask).rounded_rectangle((0,0,639,359),radius=8,fill=0)
for f in encoded: f.paste(255,(0,0),corner_mask)
encoded[0].save('docs/preview.gif',save_all=True,append_images=encoded[1:],duration=[30,30,40]*36,loop=0,optimize=False,disposal=2,transparency=255,background=255)
print(f'Encoded {len(frames)} frames: {Path("docs/preview.gif").stat().st_size:,} bytes')
