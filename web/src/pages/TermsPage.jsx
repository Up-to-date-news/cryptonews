import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <article className="terms-page">
      <Link to="/" className="back-link">← Back</Link>
      <h1>Terms &amp; Conditions</h1>
      <p className="terms-updated">Last updated: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <section>
        <h2>1. About this site</h2>
        <p>
          This website is a practice and learning project. It is not a commercial news
          organization, and nothing on this site should be treated as professional,
          financial, legal, or investment advice.
        </p>
      </section>

      <section>
        <h2>2. Automated content</h2>
        <p>
          Every article, summary, tag, and selection you see here is produced entirely by
          automated code and AI systems — headlines are pulled from public RSS feeds, then
          summarized and tagged without human editorial review. Events listed here may also
          be entered by an administrator. Because no person reviews this content before
          publication, we cannot guarantee its accuracy, completeness, or timeliness, and
          you should verify anything important against the original source before relying on it.
        </p>
      </section>

      <section>
        <h2>3. No liability for AI output</h2>
        <p>
          To the fullest extent permitted by law, the operators of this site accept no
          responsibility or liability for any action taken, decision made, or outcome
          resulting from content generated, summarized, tagged, or otherwise produced by
          the site's automated and AI systems. This includes, without limitation, errors,
          omissions, misinterpretations, or unintended similarity to other published work
          that may arise from the automated summarization process. The site is provided
          "as is," without warranties of any kind.
        </p>
      </section>

      <section>
        <h2>4. If content belongs to you</h2>
        <p>
          Our system may summarize publicly available articles and event listings as part
          of its automated process. If you believe a summary here draws from your original
          work and you'd rather it didn't, the most reliable way to flag that is within
          your own published content: add a clear note such as "this content belongs to
          [you/your organization]" together with a link back to your original piece, on
          the same page as your original content. Once that marker is in place, our system
          will treat it as a signal to exclude your content from future automated
          referencing. If you'd prefer to reach us directly instead, use the{' '}
          <Link to="/contact">Contact</Link> page and we'll follow up.
        </p>
      </section>

      <section>
        <h2>5. Still having an issue?</h2>
        <p>
          If something on the site looks wrong, or an automated decision affected you in a
          way you don't think is fair, please reach out through the{' '}
          <Link to="/contact">Contact</Link> page. We review submissions and our team —
          with the help of our own systems — will work to resolve genuine issues.
        </p>
      </section>

      <section>
        <h2>6. General terms</h2>
        <ul>
          <li>These terms apply to your use of this site as a whole, including all pages and features.</li>
          <li>We may add, remove, or change any part of this site — including these terms, the content shown, and the features available — at any time and without prior notice.</li>
          <li>Continued use of the site after a change means you accept the terms as they stand at that time.</li>
          <li>This site is offered free of charge and comes with no service-level guarantees; it may be unavailable, incomplete, or discontinued at any time.</li>
          <li>You agree not to misuse the site, including attempting to disrupt its operation or submit false reports.</li>
        </ul>
      </section>
    </article>
  );
}
