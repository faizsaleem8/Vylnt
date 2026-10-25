import { PDFDocument, PDFDict, PDFName, rgb, beginMarkedContent, endMarkedContent } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/** Finalize our tagged Chromium template, not arbitrary uploaded PDFs. */
export async function finalizeReportPdf(bytes: Uint8Array, fontBytes: Uint8Array): Promise<Buffer> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const tree = document.catalog.lookup(PDFName.of('StructTreeRoot'), PDFDict);
  if (!tree) throw new Error('Tagged report structure is missing');
  const roles = tree.lookupMaybe(PDFName.of('RoleMap'), PDFDict) ?? document.context.obj({});
  // Strong is a PDF 2.0 structure type; PDF/UA-1 needs its PDF 1.7 equivalent.
  roles.set(PDFName.of('Strong'), PDFName.of('Span')); tree.set(PDFName.of('RoleMap'), roles);
  document.setTitle('VYLNT scan report', { showInWindowTitleBar: true }); document.setLanguage('en');
  const xmp = `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/" pdfuaid:part="1"/><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">VYLNT scan report</rdf:li></rdf:Alt></dc:title><dc:language><rdf:Bag><rdf:li>en</rdf:li></rdf:Bag></dc:language></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const metadata = document.context.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' });
  document.catalog.set(PDFName.of('Metadata'), document.context.register(metadata));
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const pages = document.getPages(), size = 7, margin = 18 * 72 / 25.4;
  pages.forEach((page, index) => {
    const counter = `Page ${index + 1} of ${pages.length}`;
    // Decorative repeated footer is excluded from the logical reading order.
    page.pushOperators(beginMarkedContent('Artifact'));
    page.drawText('VYLNT / Configuration observations', { x: margin, y: 24, size, font, color: rgb(95 / 255, 107 / 255, 124 / 255) });
    page.drawText(counter, { x: page.getWidth() - margin - font.widthOfTextAtSize(counter, size), y: 24, size, font, color: rgb(95 / 255, 107 / 255, 124 / 255) });
    page.pushOperators(endMarkedContent());
  });
  return Buffer.from(await document.save());
}
