"""Encode frames from game.js capturePreviewFrames() into the README preview.
Usage: python scripts/build-preview.py /path/to/png-frames
Requires Pillow. Capture at 30 fps through docs/?capture; use 108 frames.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

frames=[]
for source in sorted(Path(sys.argv[1]).glob('*.png')):
    court=Image.open(source).convert('RGB').resize((400,300),Image.Resampling.NEAREST)
    frame=Image.new('RGB',(400,324),'#192729')
    frame.paste(court,(0,0))
    draw=ImageDraw.Draw(frame)
    draw.line((0,300,400,300),fill='#384844')
    draw.text((200,312),'CLICK TO PLAY',anchor='mm',font=ImageFont.load_default(),fill='#dfd9bd')
    frames.append(frame)
# One shared palette keeps the court colors steady during confetti.
samples=Image.new('RGB',(400,324*len(frames[::6])))
for i,f in enumerate(frames[::6]): samples.paste(f,(0,i*324))
palette=samples.quantize(colors=128)
encoded=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
encoded[0].save('docs/preview.gif',save_all=True,append_images=encoded[1:],duration=[30,30,40]*36,loop=0,optimize=False,disposal=2)
print(f'Encoded {len(frames)} frames: {Path("docs/preview.gif").stat().st_size:,} bytes')
