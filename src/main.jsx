import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import heroImage from './assets/phuket-hero.png';
import patongImage from './assets/patong.png';
import karonImage from './assets/karon.png';
import kataImage from './assets/kata.png';
import kamalaImage from './assets/kamala.png';
import './styles.css';

const places = [
  {
    id: '01',
    name: 'Patong',
    type: 'Sea-view residences',
    mood: 'Energy on the bay',
    note: 'High-demand west-coast living with immediate access to dining, nightlife and the island’s busiest rental market.',
    image: patongImage,
    coordinates: '07° 53′ N / 98° 17′ E',
    tags: ['Condominiums', 'Rental yield'],
  },
  {
    id: '02',
    name: 'Karon',
    type: 'Pool villas',
    mood: 'Space above the shore',
    note: 'Long beach views, quieter residential pockets and generous villas suited to family holidays or extended stays.',
    image: karonImage,
    coordinates: '07° 50′ N / 98° 17′ E',
    tags: ['Villas', 'Holiday home'],
  },
  {
    id: '03',
    name: 'Kata',
    type: 'Design-led apartments',
    mood: 'A village by the water',
    note: 'Walkable coastal living with a strong lifestyle pull, polished new developments and a year-round community.',
    image: kataImage,
    coordinates: '07° 49′ N / 98° 18′ E',
    tags: ['Condos', 'Lifestyle'],
  },
  {
    id: '04',
    name: 'Kamala',
    type: 'Cliffside estates',
    mood: 'The quiet headland',
    note: 'Private hillside addresses, cinematic sea views and discreet luxury for owners planning a longer horizon.',
    image: kamalaImage,
    coordinates: '07° 57′ N / 98° 17′ E',
    tags: ['Land & villas', 'Long stay'],
  },
];

const pathways = [
  ['01', 'Holiday home', 'A turn-key base for the season, managed while you are away.'],
  ['02', 'Investment', 'New-build and resale options selected for demand, location and durability.'],
  ['03', 'Retirement', 'A considered move with lifestyle, ownership structure and practicalities aligned.'],
];

function Arrow() {
  return <span className="arrow" aria-hidden="true">↗</span>;
}

function GridLines() {
  return <div className="grid-lines" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>;
}

function Loader({ onSkip }) {
  return (
    <div className="loader" aria-label="Nara Phuket is loading">
      <div className="loader__top">
        <span>Nara / Phuket</span>
        <button type="button" onClick={onSkip}>Skip intro ↗</button>
      </div>
      <svg className="loader__overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="loader-cutout" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000" style={{ maskType: 'luminance' }}>
            <rect width="1000" height="1000" fill="white" />
            {Array.from('NARA', (letter, index) => (
              <text className="loader__letter-cutout" key={index} x={index * 250} y="945" textLength="250" lengthAdjust="spacingAndGlyphs" fill="black">{letter}</text>
            ))}
          </mask>
        </defs>
        <rect width="1000" height="1000" fill="#2446c6" mask="url(#loader-cutout)" />
      </svg>
      <span className="loader__destination">Phuket, Thailand / Your place by the Andaman</span>
    </div>
  );
}

const initialTrip = {
  arrival: '', departure: '', adults: '2', children: '0', area: '',
  purpose: '', stay: '', budget: '', name: '', email: '', note: '',
};

function TripPlanner() {
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState(initialTrip);
  const [draftOpened, setDraftOpened] = useState(false);
  const localToday = new Date();
  localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
  const today = localToday.toISOString().slice(0, 10);
  const setField = (field, value) => setTrip((current) => ({ ...current, [field]: value }));

  const emailBody = [
    `Hello Nara Phuket,`,
    `I'd like help planning a visit to Phuket.`,
    ``,
    `Dates: ${trip.arrival} to ${trip.departure}`,
    `Travellers: ${trip.adults} adult(s), ${trip.children} child(ren)`,
    `Preferred area: ${trip.area}`,
    `Purpose: ${trip.purpose}`,
    `Stay: ${trip.stay}`,
    `Budget per night: ${trip.budget || 'Flexible'}`,
    `Notes: ${trip.note || 'None'}`,
    ``,
    `Name: ${trip.name}`,
    `Email: ${trip.email}`,
  ].join('\n');
  const emailHref = `mailto:hello@example.com?subject=${encodeURIComponent('Phuket visit brief — ' + trip.name)}&body=${encodeURIComponent(emailBody)}`;

  function continueForm(event) {
    event.preventDefault();
    if (step === 0 && trip.departure <= trip.arrival) {
      event.currentTarget.querySelector('[name="departure"]').setCustomValidity('Choose a date after your arrival.');
      event.currentTarget.reportValidity();
      return;
    }
    setStep((current) => Math.min(current + 1, 2));
  }

  return (
    <div className="trip-planner" data-reveal>
      <div className="trip-planner__steps" aria-label="Trip planner progress">
        {['Your visit', 'Your stay', 'Review'].map((label, index) => (
          <button key={label} type="button" className={step === index ? 'is-active' : ''} onClick={() => { if (index < step) setStep(index); }} disabled={index > step}>
            <span>0{index + 1}</span>{label}
          </button>
        ))}
      </div>

      {step < 2 ? (
        <form key={step} onSubmit={continueForm}>
          <div className="trip-planner__heading"><span className="micro">{step === 0 ? '01 / When & who' : '02 / What matters'}</span><h3>{step === 0 ? 'Set the scene.' : 'Make it yours.'}</h3></div>
          {step === 0 ? <>
            <div className="trip-planner__pair">
              <label><span>Arrival date *</span><input required type="date" name="arrival" min={today} value={trip.arrival} onChange={(event) => setField('arrival', event.target.value)} /></label>
              <label><span>Departure date *</span><input required type="date" name="departure" min={trip.arrival || today} value={trip.departure} onChange={(event) => { event.target.setCustomValidity(''); setField('departure', event.target.value); }} /></label>
            </div>
            <div className="trip-planner__pair">
              <label><span>Adults *</span><select required value={trip.adults} onChange={(event) => setField('adults', event.target.value)}>{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'adult' : 'adults'}</option>)}</select></label>
              <label><span>Children</span><select value={trip.children} onChange={(event) => setField('children', event.target.value)}>{[0,1,2,3,4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'child' : 'children'}</option>)}</select></label>
            </div>
            <label><span>Where would you like to stay? *</span><select required value={trip.area} onChange={(event) => setField('area', event.target.value)}><option value="">Choose a coast</option><option>Patong</option><option>Karon</option><option>Kata</option><option>Kamala</option><option>Help me choose</option></select></label>
          </> : <>
            <fieldset className="trip-planner__choice"><legend>What brings you here? *</legend>{['Holiday', 'Explore a future home', 'Long stay'].map((choice) => <label key={choice} className={trip.purpose === choice ? 'is-selected' : ''}><input required type="radio" name="purpose" value={choice} checked={trip.purpose === choice} onChange={() => setField('purpose', choice)} />{choice}</label>)}</fieldset>
            <label><span>Preferred stay *</span><select required value={trip.stay} onChange={(event) => setField('stay', event.target.value)}><option value="">Choose a stay</option><option>Private villa</option><option>Sea-view apartment</option><option>Boutique hotel</option><option>Open to suggestions</option></select></label>
            <div className="trip-planner__pair">
              <label><span>Budget per night</span><select value={trip.budget} onChange={(event) => setField('budget', event.target.value)}><option value="">Flexible</option><option>Under ฿5,000</option><option>฿5,000–10,000</option><option>฿10,000–20,000</option><option>฿20,000+</option></select></label>
              <label><span>Your name *</span><input required name="name" value={trip.name} onChange={(event) => setField('name', event.target.value)} placeholder="Your name" /></label>
            </div>
            <label><span>Email for your itinerary *</span><input required type="email" name="email" value={trip.email} onChange={(event) => setField('email', event.target.value)} placeholder="you@example.com" /></label>
            <label><span>Anything we should know?</span><textarea rows="2" value={trip.note} onChange={(event) => setField('note', event.target.value)} placeholder="Occasion, pace, accessibility, must-sees…" /></label>
          </>}
          <div className="trip-planner__actions">{step > 0 && <button type="button" className="trip-planner__back" onClick={() => setStep(step - 1)}>← Back</button>}<button className="trip-planner__next" type="submit">{step === 0 ? 'Choose your stay' : 'Review your visit'} <Arrow /></button></div>
        </form>
      ) : <div className="trip-planner__review">
        <div className="trip-planner__heading"><span className="micro">03 / Your visit at a glance</span><h3>Almost on your way.</h3></div>
        <dl><div><dt>When</dt><dd>{trip.arrival} — {trip.departure}</dd></div><div><dt>Who</dt><dd>{trip.adults} adult(s){Number(trip.children) ? ` + ${trip.children} child(ren)` : ''}</dd></div><div><dt>Where</dt><dd>{trip.area}</dd></div><div><dt>The plan</dt><dd>{trip.purpose} / {trip.stay}</dd></div><div><dt>Budget</dt><dd>{trip.budget || 'Flexible'}</dd></div><div><dt>Reply to</dt><dd>{trip.name} · {trip.email}</dd></div></dl>
        <p>This opens a ready-to-send email with your trip details. You can review it before sending.</p>
        <div className="trip-planner__actions"><button className="trip-planner__back" type="button" onClick={() => setStep(1)}>← Edit details</button><a className="trip-planner__next" href={emailHref} onClick={() => setDraftOpened(true)}>Open email draft <Arrow /></a></div>
        {draftOpened && <small className="trip-planner__notice">Your email app should open with the brief. Please press send there to complete the request.</small>}
      </div>}
    </div>
  );
}

function App() {
  const [activePlace, setActivePlace] = useState(0);
  const [spotlightIndex, setSpotlightIndex] = useState(1);
  const [loaderReady, setLoaderReady] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const appRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('is-loading', loaderVisible);
  }, [loaderVisible]);

  useEffect(() => {
    if (!loaderReady || !loaderVisible) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLoaderVisible(false);
      return undefined;
    }
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'power4.inOut' },
        onComplete: () => setLoaderVisible(false),
      });
      gsap.utils.toArray('.loader__letter-cutout').forEach((letter) => {
        timeline
          .set(letter, { opacity: 1 })
          .fromTo(letter, { scale: 0.55, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.43, ease: 'back.out(1.7)' });
      });
      timeline
        .to('.loader', { opacity: 0, duration: 0.9, ease: 'sine.inOut' }, '+=0.3')
        .fromTo('.hero__title, .site-nav, .hero__panel, .hero__action, .hero__folio, .hero__scroll', { opacity: 0, y: 22 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.76, ease: 'power3.out' }, '-=0.52');
    }, appRef);
    return () => context.revert();
  }, [loaderReady, loaderVisible]);

  useEffect(() => {
    if (loaderVisible) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const elements = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const targets = entry.target.classList.contains('archipelago__tiles') ? entry.target.children : entry.target;
        gsap.fromTo(targets, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .12, ease: 'power3.out' });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [loaderVisible]);

  const skipLoader = () => {
    setLoaderVisible(false);
  };
  const place = places[activePlace];
  const spotlight = places[spotlightIndex];

  return (
    <div ref={appRef}>
      {loaderVisible && <Loader onSkip={skipLoader} />}
      <main>
        <section className="hero" id="top">
          <img className="hero__image" src={heroImage} alt="Contemporary Phuket villa overlooking the Andaman Sea" onLoad={() => setLoaderReady(true)} onError={() => setLoaderReady(true)} fetchPriority="high" />
          <div className="hero__veil" />
          <GridLines />
          <header className="site-nav">
            <a className="brand" href="#top"><span>N</span><b>Nara Phuket</b><small>Property office</small></a>
            <nav aria-label="Primary navigation"><a href="#places">Locations</a><a href="#ownership">Ownership</a><a href="#inquire">Enquire</a></nav>
            <a className="nav-contact" href="#inquire">Plan your visit <Arrow /></a>
          </header>
          <div className="hero__title" aria-label="Find your place in Phuket">
            <span>Find your place</span><span><i>in</i> Phuket.</span>
          </div>
          <div className="hero__panel">
            <span className="micro">For foreign buyers / Thailand</span>
            <p>Condos, villas and land for a holiday home, investment or a longer life in the sun.</p>
            <div><span>Holiday home</span><span>Investment</span><span>Retirement</span></div>
          </div>
          <a className="hero__action" href="#inquire"><span>Start with the island itself</span><b>Plan your Phuket visit</b><Arrow /></a>
          <div className="hero__folio"><span>West coast property index</span><span>TH / 07.2026</span></div>
          <a className="hero__scroll" href="#discover" aria-label="Scroll to the island guide">↓</a>
        </section>

        <section className="archipelago" id="discover" aria-labelledby="archipelago-title">
          <div className="archipelago__intro" data-reveal>
            <span className="micro">Nara Phuket / island notes</span>
            <h2 id="archipelago-title">The unmatched<br />beauty of the<br />Andaman coast.</h2>
            <p>Four west-coast neighborhoods, each with its own pace. Start with the place, then find the address that belongs there.</p>
          </div>
          <div className="archipelago__tiles" data-reveal>
            <a className="archipelago__tile archipelago__tile--route" href="#places">
              <span className="archipelago__tile-arrow" aria-hidden="true">↗</span>
              <svg className="archipelago__route" viewBox="0 0 240 300" aria-hidden="true">
                <path d="M168 17 C156 43 181 58 155 81 C130 103 145 119 111 141 C77 164 103 186 71 211 C52 226 63 250 42 278" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 5" />
                <circle cx="155" cy="81" r="5" /><circle cx="111" cy="141" r="5" /><circle cx="71" cy="211" r="5" /><circle cx="42" cy="278" r="5" />
              </svg>
              <span className="archipelago__route-label">Patong<br />Karon<br />Kata<br />Kamala</span>
              <span className="archipelago__tile-copy">Follow the<br />west coast</span>
            </a>
            <a className="archipelago__tile archipelago__tile--coast" href="#places">
              <img src={karonImage} alt="Karon coastline and bay" loading="lazy" />
              <span className="archipelago__tile-arrow" aria-hidden="true">↗</span>
              <span className="archipelago__tile-copy"><b>04</b> shorelines<br /><small>One island to explore</small></span>
            </a>
            <a className="archipelago__tile archipelago__tile--note" href="#places" aria-label="Explore four Phuket coastlines">
              <div className="archipelago__portraits" aria-hidden="true"><img src={patongImage} alt="" /><img src={kataImage} alt="" /><img src={kamalaImage} alt="" /></div>
              <span className="archipelago__note-mark" aria-hidden="true">✳</span>
              <strong>4 distinct<br />ways to stay</strong>
              <p>From lively bays to quieter headlands—find the setting that feels like yours.</p>
            </a>
            <div className="archipelago__tile archipelago__tile--feature">
              <img key={spotlight.id} src={spotlight.image} alt={`${spotlight.name} coastline and residence`} loading="lazy" />
              <div className="archipelago__feature-bottom"><div><span className="micro">Featured coast / {spotlight.id}</span><strong>{spotlight.name}, from a different point of view.</strong></div><div className="archipelago__controls"><button type="button" onClick={() => setSpotlightIndex((index) => (index + places.length - 1) % places.length)} aria-label="Previous coast">←</button><button type="button" onClick={() => setSpotlightIndex((index) => (index + 1) % places.length)} aria-label="Next coast">→</button></div></div>
            </div>
          </div>
        </section>

        <section className="promise" id="ownership">
          <div className="promise__label micro">The brief / 001</div>
          <h2 data-reveal>Not just a view.<br /><i>A position.</i></h2>
          <p data-reveal>We search Phuket property through two lenses at once: how it feels to live there, and how well the address holds its logic over time.</p>
          <div className="promise__facts">
            <div><b>01</b><span>Beautiful beaches</span></div>
            <div><b>02</b><span>Strong investment potential</span></div>
            <div><b>03</b><span>Modern property choices</span></div>
            <div><b>04</b><span>Relaxed tropical lifestyle</span></div>
          </div>
        </section>

        <section className="places" id="places">
          <div className="places__heading" data-reveal><span className="micro">Four west-coast bearings / 002</span><h2>Choose the life<br />around the address.</h2></div>
          <div className="places__stage">
            <div className="places__visual" data-reveal>
              <img key={place.id} src={place.image} alt={`${place.name} property and coastline`} />
              <div className="places__coordinate"><span>{place.coordinates}</span><span>PHUKET / THAILAND</span></div>
              <span className="places__number">{place.id}</span>
            </div>
            <div className="places__index">
              {places.map((item, index) => (
                <button type="button" key={item.id} className={index === activePlace ? 'is-active' : ''} onClick={() => setActivePlace(index)} onMouseEnter={() => setActivePlace(index)}>
                  <span className="places__row-number">{item.id}</span>
                  <span className="places__row-copy"><small>{item.mood}</small><strong>{item.name}</strong><i>{item.type}</i></span>
                  <img src={item.image} alt="" />
                  <span className="places__row-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>
          <article className="place-note" data-reveal>
            <div><span className="micro">Selected area / {place.id}</span><h3>{place.name}</h3></div>
            <p>{place.note}</p>
            <div className="place-note__tags">{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        </section>

        <section className="pathways">
          <div className="pathways__intro" data-reveal><span className="micro">The right property starts with why / 003</span><h2>One island.<br />Three intentions.</h2></div>
          <div className="pathways__list">
            {pathways.map(([id, title, note]) => (
              <article key={id} data-reveal><span>{id}</span><h3>{title}</h3><p>{note}</p><a href="#inquire" aria-label={`Discuss ${title}`}>↗</a></article>
            ))}
          </div>
        </section>

        <section className="buyer-note">
          <div className="buyer-note__image"><img src={kataImage} alt="Interior of a Phuket residence overlooking the sea" loading="lazy" /></div>
          <div className="buyer-note__copy" data-reveal>
            <span className="micro">Foreign buyer desk / practical by design</span>
            <h2>Clarity before<br /><i>commitment.</i></h2>
            <p>We translate the search into a clean decision: preferred ownership route, realistic budget, ongoing costs, completion timeline and the questions worth asking before a viewing.</p>
            <ol><li><span>01</span>Define your use and budget</li><li><span>02</span>Build a location-led shortlist</li><li><span>03</span>View, compare and verify</li><li><span>04</span>Coordinate independent professionals</li></ol>
            <small>Placeholder information only. Buyers should take independent legal and financial advice.</small>
          </div>
        </section>

        <section className="quote">
          <span>“</span><blockquote>We arrived looking for a view.<br />We left understanding the decision.</blockquote><cite>— Placeholder buyer / Sydney to Phuket</cite>
        </section>

        <section className="inquiry" id="inquire">
          <div className="inquiry__intro" data-reveal>
            <span className="micro">Phuket visit planner / 004</span>
            <h2>Make the visit<br /><i>your own.</i></h2>
            <p>A holiday, a long stay, or the first step toward a future home. Tell us when you’re coming and what kind of Phuket you want to experience.</p>
            <a className="inquiry__phone" href="tel:+61477067457">Call or text <strong>0477 067 457</strong> <Arrow /></a>
            <div className="inquiry__direct"><span>01</span><span>Choose your dates and coast</span><span>02</span><span>Describe your ideal stay</span><span>03</span><span>Review and send your brief</span></div>
          </div>
          <TripPlanner />
        </section>

        <footer className="footer">
          <div className="footer__headline">A better place<br /><i>to begin.</i></div>
          <div className="footer__columns">
            <div><span className="micro">Nara Phuket</span><p>Independent property search<br />and buyer-side guidance.</p></div>
            <div><span className="micro">West coast</span><a href="#places">Patong</a><a href="#places">Karon</a><a href="#places">Kata</a><a href="#places">Kamala</a></div>
            <div><span className="micro">Contact</span><a href="mailto:hello@example.com">hello@example.com</a><a href="tel:+61477067457">0477 067 457</a><a href="#inquire">Message an advisor ↗</a></div>
            <a className="footer__mark" href="#top" aria-label="Back to top"><b>N</b><span>↑</span><small>Back to top</small></a>
          </div>
          <div className="footer__legal"><span>© 2026 Placeholder Property Co.</span><span>Information / privacy / terms</span><span>Phuket · Thailand</span></div>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
