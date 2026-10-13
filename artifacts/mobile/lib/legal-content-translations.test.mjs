import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGAL_DOCUMENTS } from './legal-content.ts';
import {
  LEGAL_DRAFT_TRANSLATIONS,
  legalTranslationMatchesSource,
} from './legal-content-translations.ts';

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
