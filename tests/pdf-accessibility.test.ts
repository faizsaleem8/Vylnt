import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { finalizeReportPdf } from '../apps/server/pdf-accessibility';

it('preserves tagged reading structure and declares mapped roles, language, XMP and title', async () => {
  const input = await PDFDocument.create(); input.addPage();
  const tree = input.context.obj({ Type: 'StructTreeRoot', K: [] });
  input.catalog.set(PDFName.of('StructTreeRoot'), input.context.register(tree));
  const font = await readFile('packages/ui/fonts/plex-sans.ttf');
  const result = await PDFDocument.load(await finalizeReportPdf(await input.save(), font));
  expect(result.getTitle()).toBe('VYNLT scan report');
  expect(result.catalog.get(PDFName.of('Lang'))?.toString()).toBe('(en)');
  const outputTree = result.catalog.lookup(PDFName.of('StructTreeRoot'), PDFDict);
  expect(outputTree.lookup(PDFName.of('RoleMap'), PDFDict).get(PDFName.of('Strong'))?.toString()).toBe('/Span');
  const metadata = result.catalog.lookup(PDFName.of('Metadata'));
  if (!(metadata instanceof PDFRawStream)) throw new Error('Expected metadata stream');
  expect(metadata.dict.get(PDFName.of('Subtype'))?.toString()).toBe('/XML');
  expect(Buffer.from(decodePDFRawStream(metadata).decode()).toString('utf8')).toContain('pdfuaid:part="1"');
  const page = result.getPages()[0];
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map(ref => result.context.lookup(ref)) : [contents];
  const content = streams.filter((stream): stream is PDFRawStream => stream instanceof PDFRawStream).map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString()).join('\n');
  expect(content).toContain('/Artifact BMC'); expect(content).toContain('EMC');
});
it('refuses to declare an untagged input as an accessible report', async () => {
  const input = await PDFDocument.create(); input.addPage();
  await expect(finalizeReportPdf(await input.save(), await readFile('packages/ui/fonts/plex-sans.ttf'))).rejects.toThrow();
});
