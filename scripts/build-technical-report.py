"""Render the evidence-backed Markdown report using bundled document libraries.
Run with the Codex bundled Python runtime; no application service is started.
"""
from pathlib import Path
import re, json, html
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, Preformatted, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs/VYLNT_TECHNICAL_REPORT.md'
OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
TMP=ROOT/'tmp/pdfs/technical-report'; TMP.mkdir(parents=True,exist_ok=True)
EDITION='7 November 2026'
fonts=Path(matplotlib.get_data_path())/'fonts/ttf'
for name,file in [('Body','DejaVuSans.ttf'),('BodyBold','DejaVuSans-Bold.ttf'),('BodyItalic','DejaVuSans-Oblique.ttf'),('Mono','DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(fonts/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='BodyItalic',boldItalic='BodyBold')
INK=colors.HexColor('#142536'); MUTED=colors.HexColor('#526171'); LIGHT=colors.HexColor('#f0f3f6')
S={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.5,leading=14.2,spaceAfter=6,textColor=INK,splitLongWords=True,allowWidows=0,allowOrphans=0),
 'h1':ParagraphStyle('h1',fontName='BodyBold',fontSize=21,leading=27,spaceAfter=17,keepWithNext=True,textColor=INK),
 'h2':ParagraphStyle('h2',fontName='BodyBold',fontSize=13,leading=17,spaceBefore=12,spaceAfter=8,keepWithNext=True,textColor=INK),
 'table':ParagraphStyle('table',fontName='Body',fontSize=8.5,leading=11.8,textColor=INK,splitLongWords=True),
 'th':ParagraphStyle('th',fontName='BodyBold',fontSize=8.5,leading=11.8,textColor=INK),
 'caption':ParagraphStyle('caption',fontName='BodyItalic',fontSize=8.5,leading=12,spaceBefore=4,spaceAfter=12,textColor=MUTED),
 'code':ParagraphStyle('code',fontName='Mono',fontSize=8,leading=11.3,spaceBefore=5,spaceAfter=12,textColor=INK,leftIndent=8),
 'title':ParagraphStyle('title',fontName='BodyBold',fontSize=30,leading=36,textColor=colors.black,spaceAfter=20),
 'subtitle':ParagraphStyle('subtitle',fontName='Body',fontSize=15,leading=21,textColor=colors.black,spaceAfter=18),
}

def inline(text):
    escaped=html.escape(text,quote=False)
    escaped=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',escaped)
    escaped=re.sub(r'`([^`]+)`',r'<font face="Mono" size="8.6">\1</font>',escaped)
    escaped=re.sub(r'(https://[^\s<]+)',lambda m:'<link href="'+html.escape(html.unescape(m[1]),quote=True)+'" color="#244d70">'+m[1]+'</link>',escaped)
    return escaped

def figure():
    evaluation=json.loads((ROOT/'ml/evaluations/fresh-holdout-js002-2026-10-26.json').read_text())
    r=evaluation['categories']['JS-002']; positive=r['classCounts']['change-warranted']; negative=r['classCounts']['contextual']
    assert (positive,negative,evaluation['metricExamples'])==(80,79,159)
    plt.rcParams.update({'font.size':10,'font.family':'DejaVu Sans'})
    fig,axes=plt.subplots(1,2,figsize=(9,3.5),layout='constrained')
    for ax,data,title in zip(axes,[[[80,0],[0,79]],[[80,0],[79,0]]],['LSTM controlled holdout','Rule only all change baseline']):
        ax.imshow(data,cmap='Blues',vmin=0,vmax=80)
        ax.set_xticks([0,1],['Change','Contextual']);ax.set_yticks([0,1],['Change','Contextual'])
        ax.set_xlabel('Predicted assessment');ax.set_ylabel('Controlled label');ax.set_title(title,fontsize=11,pad=12)
        for i in range(2):
            for j in range(2):ax.text(j,i,str(data[i][j]),ha='center',va='center',fontsize=18,color='white' if data[i][j]>40 else '#182f40')
        ax.spines[:].set_visible(False)
    path=TMP/'confusion.png';fig.savefig(path,dpi=220,facecolor='white');plt.close(fig)
    return path

def equations(block,index):
    if block[0].startswith('i_t'):
        rows=[r'$i_t=\sigma(W_i x_t+U_i h_{t-1}+b_i)$',r'$f_t=\sigma(W_f x_t+U_f h_{t-1}+b_f)$',
          r'$g_t=\tanh(W_g x_t+U_g h_{t-1}+b_g)$',r'$o_t=\sigma(W_o x_t+U_o h_{t-1}+b_o)$',
          r'$c_t=f_t\odot c_{t-1}+i_t\odot g_t$',r'$h_t=o_t\odot\tanh(c_t)$',r'$z=w_{out}^{T}h_L+b_{out},\quad p=\sigma(z/T)$']
    elif block[0].startswith('loss'):
        rows=[r'$\mathcal{L}=\frac{1}{N}\sum_{i=1}^{N}w_i\left[\log(1+\exp(z_i))-y_i z_i\right]$']
    else:
        rows=[r'$\mathrm{Precision}=\frac{TP}{TP+FP}$',r'$\mathrm{Recall}=\frac{TP}{TP+FN+\mathrm{abstained\ positives}}$',
          r'$F_1=\frac{2TP}{2TP+FP+FN}\quad\mathrm{(fully\ decided\ binary\ case)}$',
          r'$\mathrm{Coverage}=\frac{N_{\mathrm{change}}+N_{\mathrm{contextual}}}{N}$']
    height=max(.85,len(rows)*.38+.16)
    fig=plt.figure(figsize=(7,height),facecolor='white')
    for i,row in enumerate(rows):fig.text(.025,1-(i+.65)/len(rows),row,fontsize=13 if len(rows)>1 else 16,ha='left',va='center')
    path=TMP/f'equation-{index}.png';fig.savefig(path,dpi=220);plt.close(fig)
    return Image(str(path),width=504,height=72*height)

class Report(SimpleDocTemplate):
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and flowable.style.name=='h1':
            text=flowable.getPlainText();key='section-'+str(getattr(self,'section_count',0));self.section_count=getattr(self,'section_count',0)+1
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(text,key,0,False);self.notify('TOCEntry',(0,text,self.page,key))
    def beforeDocument(self):self.section_count=0

def footer(c,doc):
    c.saveState();w,h=letter;c.setFont('Body',8);c.setFillColor(MUTED)
    c.drawString(54,31,'VYLNT  |  Technical report  |  '+EDITION);c.drawRightString(w-54,31,str(doc.page))
    if doc.page>1:c.setFont('Body',7.5);c.drawString(54,h-31,'ARCHITECTURE  /  EVIDENCE  /  PRESENTATION GUIDE')
    c.restoreState()

def render_table(lines):
    rows=[[cell.strip() for cell in line.strip().strip('|').split('|')] for line in lines]
    rows=[row for row in rows if not all(re.fullmatch(r':?-+:?',cell.replace(' ','')) for cell in row)]
    n=len(rows[0]);assert all(len(row)==n for row in rows),rows
    if n==3:
        widths=[.21,.37,.42]
        if rows[0][0]=='ID':widths=[.07,.50,.43]
        if rows[0][0]=='Time':widths=[.15,.31,.54]
    elif n==4:
        widths=[.21,.14,.14,.51] if rows[0][0]=='Category' else [.38,.18,.18,.26]
    elif n==5:widths=[.40,.15,.15,.15,.15]
    else:widths=[1/n]*n
    cells=[[Paragraph(inline(cell),S['th' if i==0 else 'table']) for cell in row] for i,row in enumerate(rows)]
    table=Table(cells,colWidths=[504*v for v in widths],repeatRows=1,hAlign='LEFT',spaceAfter=10)
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIGHT),('VALIGN',(0,0),(-1,-1),'TOP'),
      ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
      ('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor('#a6b4c2')),('LINEBELOW',(0,1),(-1,-1),.25,colors.HexColor('#dce3e9'))]))
    return table

def main():
    source=SOURCE.read_text(encoding='utf8');lines=source.splitlines();story=[];chart=figure()
    story.extend([Spacer(1,48),Paragraph('VYLNT Technical Report<br/>and Presentation Guide',S['title']),
      Paragraph('Technical architecture measured results<br/>and engineering defense',S['subtitle']),
      Paragraph('Version 2.0<br/>Evidence cutoff '+EDITION+'<br/>Prepared for hackathon judges and senior engineering interviewers',S['body']),Spacer(1,18)])
    # Opening scope and audience are the first content the reader sees.
    for text in lines[6:9]:
        if text.strip():story.append(Paragraph(inline(text),S['body']))
    story.append(PageBreak());story.append(Paragraph('Contents',S['h2']))
    toc=TableOfContents();toc.levelStyles=[ParagraphStyle('toc',fontName='Body',fontSize=11,leading=17,spaceAfter=12,textColor=INK)];story.append(toc)
    story.append(Spacer(1,25));story.append(Paragraph('How to use this document',S['h2']))
    start=lines.index('## Reading guide')+1;end=lines.index('# 1 Executive Summary and High Level Architecture')
    for text in lines[start:end]:
        if text.strip():story.append(Paragraph(inline(text),S['body']))
    i=end;equation_count=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('# '):
            story.extend([PageBreak(),Paragraph(inline(line[2:]),S['h1'])]);i+=1;continue
        if line.startswith('## '):
            story.append(Paragraph(inline(line[3:]),S['h2']))
            if line.startswith('## 5.3'):
                heading=story.pop()
                story.append(KeepTogether([heading,Image(str(chart),width=504,height=196),Paragraph('Figure 1  Derived confusion matrices from 159 unique controlled JS-002 contexts. Source E7. The frozen logistic policy abstained on every example and is not represented as a binary classifier here.',S['caption'])]))
            i+=1;continue
        if line.startswith('```'):
            math=line=='```math';block=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'):block.append(lines[i]);i+=1
            if math:
                if story and isinstance(story[-1],Paragraph):story[-1]=Paragraph(story[-1].text,ParagraphStyle('equation-intro',parent=story[-1].style,keepWithNext=True))
                equation_count+=1;story.append(equations(block,equation_count));story.append(Spacer(1,6))
            else:story.append(Preformatted('\n'.join(block),S['code']))
            i+=1;continue
        if line.startswith('|'):
            block=[]
            while i<len(lines) and lines[i].strip().startswith('|'):block.append(lines[i]);i+=1
            # Annotated scientific matrices replace their duplicate Markdown tables.
            if block[0].startswith('| Ground truth |'):continue
            story.append(render_table(block));continue
        # Markdown paragraphs are author-controlled complete prose lines.
        style=S['body']
        if re.match(r'^\d+\. ',line):
            style=ParagraphStyle('list',parent=S['body'],leftIndent=15,firstLineIndent=-15)
        story.append(Paragraph(inline(line),style));i+=1
    target=OUT/'VYLNT_Technical_Report_and_Presentation_Guide.pdf'
    doc=Report(str(target),pagesize=letter,leftMargin=54,rightMargin=54,topMargin=56,bottomMargin=53,
       title='VYLNT Technical Report and Presentation Guide',author='VYLNT project',subject='Architecture and measured controlled ML qualification',pageCompression=1)
    doc.multiBuild(story,onFirstPage=footer,onLaterPages=footer)
    reader=PdfReader(target);text='\n'.join(p.extract_text() or '' for p in reader.pages)
    required=['Executive Summary','Technology Stack','Core Features','Mathematical Rigor','Empirical Proof','Production Readiness','Interview Defense','Presentation','159','1,801','0.6695','95.42','326 of 630','Follow One Report','Closed-Book Interview Drill','not been fitted']
    assert all(s in text for s in required),[s for s in required if s not in text]
    assert all((p.extract_text() or '').strip() for p in reader.pages)
    summary={'pages':len(reader.pages),'markdownWords':len(source.split()),'pdfBytes':target.stat().st_size,'requiredChecks':required,
       'derivedMetrics':{'lstmF1':1.0,'ruleF1':160/239,'TP':80,'TN':79,'FP':0,'FN':0},'renderReview':'pending'}
    (TMP/'validation.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
