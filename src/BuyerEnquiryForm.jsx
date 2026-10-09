import { useRef, useState } from 'react';
import { buyingTimeframes, fundingOptions } from './enquiry-options.js';

const initialEnquiry = {
  name: '', email: '', mobile: '', budget: '', location: '', funding: '', timeframe: '', note: '',
};

const formatBudget = (amount) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
}).format(Number(amount));

function createRequestKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('');
}

export default function BuyerEnquiryForm({ contact }) {
  const [enquiry, setEnquiry] = useState(initialEnquiry);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const headingRef = useRef(null);
  const requestKeyRef = useRef(null);
  const submittingRef = useRef(false);

  const setField = (event) => {
    const { name, value } = event.target;
    event.target.setCustomValidity('');
    requestKeyRef.current = null;
    setSubmitError('');
    setEnquiry((current) => ({ ...current, [name]: value }));
  };

  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  function reviewEnquiry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const mobileDigits = enquiry.mobile.replace(/\D/g, '');
    form.elements.name.setCustomValidity(enquiry.name.trim().length < 2 ? 'Please enter your name.' : '');
    form.elements.mobile.setCustomValidity(
      !/^\+?[\d\s().-]+$/.test(enquiry.mobile.trim()) || mobileDigits.length < 8 || mobileDigits.length > 15
        ? 'Enter a valid mobile number, including your country code if outside Australia.' : '',
    );
    form.elements.location.setCustomValidity(enquiry.location.trim().length < 2 ? 'Please enter your preferred location.' : '');
    if (!form.reportValidity()) return;
    setReviewing(true);
    setSubmitError('');
    focusHeading();
  }

  async function sendEnquiry() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      requestKeyRef.current ||= createRequestKey();
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKeyRef.current },
        body: JSON.stringify(enquiry),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok) {
        setSubmitError(result.errors ? Object.values(result.errors).join(' ') : result.message || 'Please try again or call our Australian number.');
        return;
      }
      if (!result.id || !result.receivedAt) throw new Error('Missing receipt');
      setReceipt(result);
      focusHeading();
    } catch {
      setSubmitError(`We couldn’t send your enquiry. Your details are still here — please try again or call ${contact.display}.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function startAgain() {
    setEnquiry(initialEnquiry);
    setReviewing(false);
    setReceipt(null);
    setSubmitError('');
    requestKeyRef.current = null;
    focusHeading();
  }

  return (
    <div className="buyer-enquiry" data-reveal>
      <ol className="buyer-enquiry__steps" aria-label="Enquiry progress">
        <li className={!reviewing ? 'is-active' : ''} aria-current={!reviewing ? 'step' : undefined}><span>01</span>Your property plans</li>
        <li className={reviewing ? 'is-active' : ''} aria-current={reviewing ? 'step' : undefined}><span>02</span>{receipt ? 'Enquiry received' : 'Review & send'}</li>
      </ol>
      <div className="buyer-enquiry__heading">
        <span className="micro">{receipt ? 'Thank you for getting in touch' : reviewing ? 'Your enquiry at a glance' : 'Property enquiry / Budgets in AUD'}</span>
        <h3 ref={headingRef} tabIndex={-1}>{receipt ? 'Your search starts here.' : reviewing ? 'Ready for the next step.' : 'Tell us what you have in mind.'}</h3>
      </div>

      {receipt ? (
        <div className="buyer-enquiry__success" role="status">
          <p>Your property enquiry has been received. Keep your reference below for any follow-up.</p>
          <div className="buyer-enquiry__reference"><span className="micro">Enquiry reference</span><strong>{receipt.id}</strong></div>
          <p>Want to speak with us directly? <a href={`tel:${contact.number}`}>Call {contact.display}</a>.</p>
          <button className="buyer-enquiry__back" type="button" onClick={startAgain}>Make another enquiry ↗</button>
        </div>
      ) : !reviewing ? (
        <form onSubmit={reviewEnquiry} aria-label="Property enquiry">
          <p className="buyer-enquiry__help">All fields marked * are required.</p>
          <div className="buyer-enquiry__pair">
            <label htmlFor="buyer-name"><span>Your name *</span><input id="buyer-name" name="name" autoComplete="name" required maxLength={100} value={enquiry.name} onChange={setField} placeholder="Full name" /></label>
            <label htmlFor="buyer-mobile"><span>Mobile number *</span><input id="buyer-mobile" name="mobile" type="tel" autoComplete="tel" required maxLength={25} value={enquiry.mobile} onChange={setField} placeholder="04xx xxx xxx or +61…" /></label>
          </div>
          <label htmlFor="buyer-email"><span>Email address *</span><input id="buyer-email" name="email" type="email" autoComplete="email" required maxLength={254} value={enquiry.email} onChange={setField} placeholder="you@example.com" /></label>
          <div className="buyer-enquiry__pair">
            <label htmlFor="buyer-budget"><span>Approximate budget (AUD) *</span><div className="buyer-enquiry__budget"><span aria-hidden="true">A$</span><input id="buyer-budget" name="budget" type="number" inputMode="numeric" required min="1" step="1" value={enquiry.budget} onChange={setField} placeholder="e.g. 500000" /></div></label>
            <label htmlFor="buyer-location"><span>Preferred location *</span><input id="buyer-location" name="location" list="buyer-locations" required maxLength={150} value={enquiry.location} onChange={setField} placeholder="e.g. Kamala, Phuket" /><datalist id="buyer-locations">{['Patong, Phuket', 'Karon, Phuket', 'Kata, Phuket', 'Kamala, Phuket', 'Phuket — help me choose'].map((location) => <option key={location} value={location} />)}</datalist></label>
          </div>
          <fieldset className="buyer-enquiry__choice">
            <legend>Cash purchase or finance? *</legend>
            {fundingOptions.map((funding) => (
              <label key={funding} className={enquiry.funding === funding ? 'is-selected' : ''}><input required type="radio" name="funding" value={funding} checked={enquiry.funding === funding} onChange={setField} />{funding}</label>
            ))}
          </fieldset>
          <label htmlFor="buyer-timeframe"><span>Expected buying timeframe *</span><select id="buyer-timeframe" name="timeframe" required value={enquiry.timeframe} onChange={setField}><option value="">When are you looking to buy?</option>{buyingTimeframes.map((timeframe) => <option key={timeframe}>{timeframe}</option>)}</select></label>
          <label htmlFor="buyer-note"><span>Anything else? (optional)</span><textarea id="buyer-note" name="note" rows={2} maxLength={1000} value={enquiry.note} onChange={setField} placeholder="Property type, must-haves or questions…" /></label>
          <p className="buyer-enquiry__help">We’ll use your email and mobile number to contact you about your property enquiry.</p>
          <div className="buyer-enquiry__actions"><button className="buyer-enquiry__next" type="submit">Review enquiry <span aria-hidden="true">↗</span></button></div>
        </form>
      ) : (
        <div className="buyer-enquiry__review" aria-busy={submitting}>
          <dl>
            <div><dt>Name</dt><dd>{enquiry.name.trim()}</dd></div>
            <div><dt>Email</dt><dd>{enquiry.email.trim()}</dd></div>
            <div><dt>Mobile</dt><dd>{enquiry.mobile.trim()}</dd></div>
            <div><dt>Budget</dt><dd>{formatBudget(enquiry.budget)} AUD</dd></div>
            <div><dt>Location</dt><dd>{enquiry.location.trim()}</dd></div>
            <div><dt>Funding</dt><dd>{enquiry.funding}</dd></div>
            <div><dt>Timeframe</dt><dd>{enquiry.timeframe}</dd></div>
            {enquiry.note.trim() && <div><dt>Extra details</dt><dd>{enquiry.note.trim()}</dd></div>}
          </dl>
          <p className="buyer-enquiry__help">Check your details, then send your enquiry to Goodspeed Real Estate.</p>
          {submitError && <p className="buyer-enquiry__error" role="alert">{submitError}</p>}
          <div className="buyer-enquiry__actions">
            <button className="buyer-enquiry__back" type="button" disabled={submitting} onClick={() => { setReviewing(false); setSubmitError(''); focusHeading(); }}>← Edit details</button>
            <button className="buyer-enquiry__next" type="button" disabled={submitting} onClick={sendEnquiry}>{submitting ? 'Sending enquiry…' : 'Send enquiry'} <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
