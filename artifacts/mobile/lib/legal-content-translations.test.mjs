import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEGAL_DOCUMENTS } from './legal-content.ts';
import {
  LEGAL_DRAFT_TRANSLATIONS,
  getLegalDocumentForPreference,
  legalTranslationMatchesSource,
} from './legal-content-translations.ts';

const legalRoute = readFileSync(new URL('../app/account/legal/[section].tsx', import.meta.url), 'utf8');

test('provides Urdu and Arabic pending-review translations for all five legal documents', () => {
  assert.deepEqual(
    Object.keys(LEGAL_DRAFT_TRANSLATIONS).sort(),
    Object.keys(LEGAL_DOCUMENTS).sort(),
  );

  for (const [documentId, source] of Object.entries(LEGAL_DOCUMENTS)) {
    for (const language of ['ur', 'ar']) {
      const translation = LEGAL_DRAFT_TRANSLATIONS[documentId][language];
      assert.equal(translation.reviewStatus, 'pending', `${documentId}/${language} review status`);
      assert.ok(translation.title.trim(), `${documentId}/${language} title`);
      assert.ok(translation.summary.trim(), `${documentId}/${language} summary`);
      assert.ok(
        legalTranslationMatchesSource(source, translation),
        `${documentId}/${language} must preserve every source section, paragraph, and bullet`,
      );
      assert.ok(
        translation.sections.every(section => section.heading.trim()),
        `${documentId}/${language} section headings`,
      );
      assert.ok(
        translation.sections.every(section =>
          [...(section.paragraphs ?? []), ...(section.bullets ?? [])].every(text => text.trim()),
        ),
        `${documentId}/${language} legal copy`,
      );
    }
  }
});

test('legal screen displays the document matching the saved English, Urdu, or Arabic preference', () => {
  assert.equal(Object.keys(LEGAL_DOCUMENTS).length, 5, 'all five legal routes are covered');

  for (const [documentId, source] of Object.entries(LEGAL_DOCUMENTS)) {
    assert.equal(getLegalDocumentForPreference(source, documentId, 'en'), source, `${documentId}/en`);

    for (const language of ['ur', 'ar']) {
      const translation = LEGAL_DRAFT_TRANSLATIONS[documentId][language];
      const displayed = getLegalDocumentForPreference(source, documentId, language);
      assert.equal(displayed, translation, `${documentId}/${language} displays its draft`);
      assert.notEqual(displayed, source, `${documentId}/${language} must not display English`);
      assert.match(displayed.title, /\p{Script=Arabic}/u, `${documentId}/${language} title uses the RTL script`);
      assert.match(
        displayed.sections.flatMap(section => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? [])]).join(' '),
        /\p{Script=Arabic}/u,
        `${documentId}/${language} legal body uses the RTL script`,
      );
    }
  }
});

test('Urdu and Arabic screens switch to the English source and back to their draft', () => {
  for (const [documentId, source] of Object.entries(LEGAL_DOCUMENTS)) {
    for (const language of ['ur', 'ar']) {
      assert.equal(
        getLegalDocumentForPreference(source, documentId, language, true),
        source,
        `${documentId}/${language} shows the English source`,
      );
      assert.equal(
        getLegalDocumentForPreference(source, documentId, language, false),
        LEGAL_DRAFT_TRANSLATIONS[documentId][language],
        `${documentId}/${language} returns to its draft`,
      );
    }
  }
});

test('the legal route uses the saved language and renders only the selected document', () => {
  assert.match(legalRoute, /const language = preferences\.language;/);
  assert.match(
    legalRoute,
    /getLegalDocumentForPreference\(sourceDocument,\s*sectionName,\s*language,\s*showEnglishSource\)/,
  );
  assert.match(legalRoute, /<Text[^>]*>\{document\.title\}<\/Text>|document\.title/);
  assert.match(legalRoute, /document\.sections\.map/);
  assert.match(legalRoute, /if \(!document\) return/);
  assert.match(legalRoute, /if \(!document\) return <Screen title=\{translateUi\('Policy unavailable', language\)\}/);
});

test('unavailable or structurally incomplete drafts are rejected instead of falling back to English', () => {
  const source = LEGAL_DOCUMENTS.terms;
  const valid = LEGAL_DRAFT_TRANSLATIONS.terms.ur;
  const incompleteDrafts = [
    { ...valid, title: '' },
    { ...valid, sections: valid.sections.slice(0, -1) },
    { ...valid, sections: [{ ...valid.sections[0], heading: ' ' }, ...valid.sections.slice(1)] },
    {
      ...valid,
      sections: [{ ...valid.sections[0], paragraphs: [''] }, ...valid.sections.slice(1)],
    },
    {
      ...valid,
      sections: [{ ...valid.sections[0], bullets: 'not an array' }, ...valid.sections.slice(1)],
    },
  ];
  for (const draft of incompleteDrafts) {
    assert.equal(legalTranslationMatchesSource(source, draft), false);
  }

  const originalUrdu = LEGAL_DRAFT_TRANSLATIONS.terms.ur;
  const originalArabic = LEGAL_DRAFT_TRANSLATIONS.terms.ar;
  try {
    delete LEGAL_DRAFT_TRANSLATIONS.terms.ur;
    assert.equal(getLegalDocumentForPreference(source, 'terms', 'ur'), undefined);
    LEGAL_DRAFT_TRANSLATIONS.terms.ur = { ...originalUrdu, sections: originalUrdu.sections.slice(0, -1) };
    assert.equal(getLegalDocumentForPreference(source, 'terms', 'ur'), undefined);

    delete LEGAL_DRAFT_TRANSLATIONS.terms.ar;
    assert.equal(getLegalDocumentForPreference(source, 'terms', 'ar'), undefined);
    LEGAL_DRAFT_TRANSLATIONS.terms.ar = { ...originalArabic, sections: originalArabic.sections.slice(0, -1) };
    assert.equal(getLegalDocumentForPreference(source, 'terms', 'ar'), undefined);
  } finally {
    LEGAL_DRAFT_TRANSLATIONS.terms.ur = originalUrdu;
    LEGAL_DRAFT_TRANSLATIONS.terms.ar = originalArabic;
  }
});
