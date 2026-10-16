"""Build a full-court README preview from game.js capturePreviewFrames().
Usage: python scripts/build-preview.py /path/to/png-frames (requires Pillow).
Capture 108 frames at 30 fps through docs/?capture.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

size=(640,480)
frames=[]
for source in sorted(Path(sys.argv[1]).glob('*.png')):
    frame=Image.open(source).convert('RGB').resize(size,Image.Resampling.NEAREST)
    draw=ImageDraw.Draw(frame)
    font=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',20,index=1)
    # Centered in the open space between the net and the resting ball.
    draw.text((320,250),'Click to play',anchor='mm',font=font,fill='#000000')
    frames.append(frame)
# A shared palette prevents color flicker during the celebration.
samples=Image.new('RGB',(640,480*len(frames[::6])))
for i,f in enumerate(frames[::6]): samples.paste(f,(0,i*480))
palette=samples.quantize(colors=128)
encoded=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
# Transparent rounded corners blend into either GitHub theme.
corner_mask=Image.new('L',size,255)
ImageDraw.Draw(corner_mask).rounded_rectangle((0,0,639,479),radius=12,fill=0)
for f in encoded: f.paste(255,(0,0),corner_mask)
output=Path('docs/court-preview-black.gif')
encoded[0].save(output,save_all=True,append_images=encoded[1:],duration=[30,30,40]*36,loop=0,optimize=False,disposal=2,transparency=255,background=255)
print(f'Encoded {len(frames)} frames: {output.stat().st_size:,} bytes')
