"""Render every final PDF page and build contact sheets for visual inspection."""
from pathlib import Path
import json
import pypdfium2 as pdfium
import pdfplumber
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];folder=ROOT/'tmp/pdfs/technical-report'
path=ROOT/'output/pdf/VYLNT_Technical_Report_and_Presentation_Guide.pdf'
doc=pdfium.PdfDocument(str(path));sheets=[];issues=[];sparse=[]
with pdfplumber.open(path) as textdoc:
    for i,page in enumerate(textdoc.pages):
        words=page.extract_words()
        content=[word for word in words if 45<word['top']<730]
        if i>1 and len(content)<45:sparse.append({'page':i+1,'words':len(content)})
        for word in words:
            if word['x0']<49 or word['x1']>564:issues.append({'page':i+1,'text':word['text'],'x0':word['x0'],'x1':word['x1']})
for i in range(len(doc)):
    im=doc[i].render(scale=1.4).to_pil();im.save(folder/f'page-{i+1:02}.png');im.thumbnail((255,345))
    tile=Image.new('RGB',(275,370),'#dfe5eb');tile.paste(im,((275-im.width)//2,10));ImageDraw.Draw(tile).text((12,351),'Page '+str(i+1),fill='#243444');sheets.append(tile)
for start in range(0,len(sheets),12):
    sheet=Image.new('RGB',(825,1480),'white')
    for j,im in enumerate(sheets[start:start+12]):sheet.paste(im,((j%3)*275,(j//3)*370))
    sheet.save(folder/f'contact-{start//12+1}.png')
summary={'pages':len(doc),'boundsIssues':issues,'sparseBodyPages':sparse,'allPagesRendered':True,'visualReview':'pending'}
(folder/'layout-check.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2));assert not issues
