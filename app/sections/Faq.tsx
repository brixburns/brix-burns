"use client";

import { ARCHIVED } from "../lib/chain";
import { useLang } from "../lib/i18n";

// archived: only the questions on the floor, the tax, the reserve, burning
// without holding and official contracts (same order in both languages:
// i18n.tsx faq[]); the team-earnings, Top Burners and Trixster ones are over
const KEEP_ARCHIVED = new Set([0, 1, 2, 3, 7, 15]);

/**
 * Questions the rest of the page doesn't answer. The whole section starts
 * closed (just "FAQ +"); inside, each question opens on its own. Native
 * <details>: keyboard and screen readers for free.
 */
export default function Faq() {
  const { t } = useLang();
  return (
    <section className="panel" id="faq">
      <details className="faq-section">
        <summary className="faq-toggle">
          <h2 className="panel-title">{t.faqTitle}</h2>
          <span className="faq-toggle-sign" aria-hidden="true"/>
        </summary>
        <div className="faq-list">
          {t.faq.filter((_, i) => !ARCHIVED || KEEP_ARCHIVED.has(i)).map((item) => (
            <details className="faq-item" key={item.q}>
              <summary className="faq-q">{item.q}</summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </details>
    </section>
  );
}
