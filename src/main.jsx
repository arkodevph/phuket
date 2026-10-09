import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import heroImage from './assets/phuket-hero.png';
import patongImage from './assets/patong.png';
import karonImage from './assets/karon.png';
import kataImage from './assets/kata.png';
import kamalaImage from './assets/kamala.png';
import BuyerEnquiryForm from './BuyerEnquiryForm.jsx';
import './styles.css';

const australianContact = {
  number: '+61477067457',
  display: '0477 067 457',
  international: '+61 477 067 457',
  email: import.meta.env.VITE_CONTACT_EMAIL || '',
};

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
  const letters = 'GOODSPEED';
  const letterWidth = 1000 / letters.length;
  return (
    <div className="loader" aria-label="Goodspeed Real Estate is loading">
      <div className="loader__top">
        <span>Goodspeed Real Estate / Phuket</span>
        <button type="button" onClick={onSkip}>Skip intro ↗</button>
      </div>
      <svg className="loader__overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="loader-cutout" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000" style={{ maskType: 'luminance' }}>
            <rect width="1000" height="1000" fill="white" />
            {Array.from(letters, (letter, index) => (
              <text className="loader__letter-cutout" key={index} x={index * letterWidth} y="945" textLength={letterWidth} lengthAdjust="spacingAndGlyphs" fill="black">{letter}</text>
            ))}
          </mask>
        </defs>
        <rect width="1000" height="1000" fill="#2446c6" mask="url(#loader-cutout)" />
      </svg>
      <span className="loader__destination">Thailand property / For Australian buyers</span>
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
      gsap.utils.toArray('.loader__letter-cutout').forEach((letter, index) => {
        timeline
          .set(letter, { opacity: 1 }, index * 0.18)
          .fromTo(letter, { scale: 0.55, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.43, ease: 'back.out(1.7)' }, index * 0.18);
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
            <a className="brand" href="#top"><span>G</span><b>Goodspeed Real Estate</b><small>Thailand property for Australians</small></a>
            <nav aria-label="Primary navigation"><a href="#places">Locations</a><a href="#ownership">Ownership</a><a href="#inquire">Enquire</a></nav>
            <a className="nav-contact" href={`tel:${australianContact.number}`} aria-label={`Call our Australian number, ${australianContact.display}`}><span>Australian contact</span><strong>{australianContact.display}</strong><Arrow /></a>
          </header>
          <div className="hero__title" aria-label="Find your place in Phuket">
            <span>Find your place</span><span><i>in</i> Phuket.</span>
          </div>
          <div className="hero__panel">
            <span className="micro">For Australian buyers / Thailand</span>
            <p>Helping Australians find property in Phuket, Thailand — for a holiday home, investment or retirement in the sun.</p>
            <div><span>Holiday home</span><span>Investment</span><span>Retirement</span></div>
          </div>
          <a className="hero__action" href="#inquire"><span>Your Thailand property search starts here</span><b>Enquire about buying property</b><Arrow /></a>
          <div className="hero__folio"><span>West coast property index</span><span>TH / 07.2026</span></div>
          <a className="hero__scroll" href="#discover" aria-label="Scroll to the island guide">↓</a>
        </section>

        <section className="archipelago" id="discover" aria-labelledby="archipelago-title">
          <div className="archipelago__intro" data-reveal>
            <span className="micro">Goodspeed Real Estate / island notes</span>
            <h2 id="archipelago-title">The unmatched<br />beauty of the<br />Andaman coast.</h2>
            <p>Four west-coast neighbourhoods, each with its own pace. Start with the place, then find the address that belongs there.</p>
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
              <strong>4 distinct<br />places to call home</strong>
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
          <p data-reveal>For Australians buying property in Thailand, we help connect your plans with the right Phuket location. Explore homes for holidays, investment or retirement with a clear brief and a considered shortlist.</p>
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
            <span className="micro">Australian buyer desk / practical by design</span>
            <h2>Clarity before<br /><i>commitment.</i></h2>
            <p>Buying from Australia starts with a clear brief: your budget in AUD, preferred location, whether you plan to pay cash or need finance, and when you want to buy. We use those details to guide your property search in Thailand.</p>
            <ol><li><span>01</span>Define your use and budget</li><li><span>02</span>Build a location-led shortlist</li><li><span>03</span>View, compare and verify</li><li><span>04</span>Coordinate independent professionals</li></ol>
            <small>Placeholder information only. Buyers should take independent legal and financial advice.</small>
          </div>
        </section>

        <section className="quote">
          <span>“</span><blockquote>We arrived looking for a view.<br />We left understanding the decision.</blockquote><cite>— Placeholder buyer / Sydney to Phuket</cite>
        </section>

        <section className="inquiry" id="inquire">
          <div className="inquiry__intro" data-reveal>
            <span className="micro">Australian buyer enquiries / 004</span>
            <h2>Your next home<br /><i>starts here.</i></h2>
            <p>Interested in buying property in Thailand? Tell us what you’re looking for, your approximate budget and your timing. We’ll help you take the next step from Australia.</p>
            <a className="inquiry__phone" href={`tel:${australianContact.number}`}><span>Call our Australian number</span><strong>{australianContact.display}</strong><Arrow /></a>
            <p className="inquiry__international">From overseas: <a href={`tel:${australianContact.number}`}>{australianContact.international}</a></p>
            {australianContact.email && <a className="inquiry__email" href={`mailto:${australianContact.email}`}>{australianContact.email}</a>}
            <div className="inquiry__direct"><span>01</span><span>Tell us about your property plans</span><span>02</span><span>Review your enquiry</span><span>03</span><span>Send it to our Australian contact</span></div>
          </div>
          <BuyerEnquiryForm contact={australianContact} />
        </section>

        <footer className="footer">
          <div className="footer__headline">A better place<br /><i>to begin.</i></div>
          <div className="footer__columns">
            <div><span className="micro">Goodspeed Real Estate</span><p>Property search and buyer guidance<br />for Australians buying in Thailand.</p></div>
            <div><span className="micro">West coast</span><a href="#places">Patong</a><a href="#places">Karon</a><a href="#places">Kata</a><a href="#places">Kamala</a></div>
            <div><span className="micro">Australian contact</span><a className="footer__phone" href={`tel:${australianContact.number}`}>{australianContact.display}</a><a href={`tel:${australianContact.number}`}>{australianContact.international} from overseas</a>{australianContact.email && <a href={`mailto:${australianContact.email}`}>{australianContact.email}</a>}<a href="#inquire">Make a property enquiry ↗</a></div>
            <a className="footer__mark" href="#top" aria-label="Back to top"><b>G</b><span>↑</span><small>Back to top</small></a>
          </div>
          <div className="footer__legal"><span>© 2026 Goodspeed Real Estate</span><span>Information / privacy / terms</span><span>For Australian buyers · Phuket, Thailand</span></div>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
