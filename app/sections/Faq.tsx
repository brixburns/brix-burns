"use client";

import { useLang } from "../lib/i18n";

/** Questions the rest of the page doesn't answer. Native <details>: keyboard and screen readers for free. */
export default function Faq() {
  const { t } = useLang();
  return (
    <section className="panel" id="faq">
      <h2 className="panel-title">{t.faqTitle}</h2>
      <div className="faq-list">
        {t.faq.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary className="faq-q">{item.q}</summary>
            <p className="faq-a">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
