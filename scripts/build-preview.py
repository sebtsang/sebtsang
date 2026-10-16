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
    court=Image.open(source).convert('RGB').resize((288,216),Image.Resampling.NEAREST)
    frame=Image.new('RGB',(640,300),'#151b23')
    draw=ImageDraw.Draw(frame)
    draw.rounded_rectangle((0,0,639,299),radius=5,outline='#3d444d')
    draw.line((1,32,638,32),fill='#3d444d')
    draw.text((12,10),'sebtsang /',font=font(10),fill='#a1abb6')
    draw.text((81,10),'Basketball',font=font(10),fill='#e6edf3')
    draw.text((28,148),'Click to play',font=font(19),fill='#e6edf3')
    draw.text((28,188),'[ enter game ]',font=font(11),fill='#adf0c0')
    frame.paste(court,(328,58))
    frames.append(frame)
# A shared palette prevents color flicker during the celebration.
samples=Image.new('RGB',(640,300*len(frames[::6])))
for i,f in enumerate(frames[::6]): samples.paste(f,(0,i*300))
palette=samples.quantize(colors=128)
encoded=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
encoded[0].save('docs/preview.gif',save_all=True,append_images=encoded[1:],duration=[30,30,40]*36,loop=0,optimize=False,disposal=2)
print(f'Encoded {len(frames)} frames: {Path("docs/preview.gif").stat().st_size:,} bytes')
