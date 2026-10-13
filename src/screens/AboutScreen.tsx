// Honest accuracy notes: what the number means and what moves it.
export function AboutScreen() {
  return (
    <>
      <section class="panel">
        <h2>How accurate is this?</h2>
        <p>A plucked or tapped string rings at f = (1 / 2L) √(T / μ), where L is the vibrating length and μ the mass per metre. Stringbed finds f from the sound and solves for the tension T. Expect about <strong>±2 to 3 lb at best</strong>, in calibrated mode, with a locked measurement. It cannot give 0.1 kg accuracy, and it never shows a range tighter than ±2 lb.</p>
      </section>
      <section class="panel">
        <h3>Two conversion modes</h3>
        <ul class="plain">
          <li><strong>Calibrated</strong> (default once you have one): T = T_ref × (f / f_ref)². It scales from a tension you trust for this exact racquet and string, separately for mains and crosses, so errors in length, gauge and density cancel. Range shown: about ±5% plus the spread of your hits.</li>
          <li><strong>Physics</strong>: from your vibrating length, the string gauge and an estimated material density. Range shown: about ±15% with a measured length, ±20% with a length estimated from head size, ±8% once a calibration factor is known.</li>
        </ul>
      </section>
      <section class="panel">
        <h3>Error sources</h3>
        <ul class="plain">
          <li><strong>Effective vibrating length.</strong> The string does not vibrate exactly grommet to grommet; the frame, grommets and the crosses' contact shift the effective ends. Length enters squared, so 3% off in length is 6% off in tension.</li>
          <li><strong>Crossing strings couple the mains.</strong> The bed vibrates as a woven membrane, not as free strings, so a single main does not ring exactly like an isolated string. Calibration absorbs most of this.</li>
          <li><strong>String stiffness.</strong> Bending stiffness pushes higher partials slightly sharp (inharmonicity), which matters most in Tap mode where several partials ring. The detector scores 2f and 3f with tolerance for this, and you can tap the spectrum to pick the fundamental.</li>
          <li><strong>Temperature and humidity.</strong> Polyester and gut change stiffness and tension with temperature, and gut absorbs moisture. Compare readings taken in similar conditions.</li>
          <li><strong>Relaxation.</strong> A new string loses roughly 10% in the first 24 hours, then much more slowly. Early drops are normal; that is why the check line sits at 20%.</li>
          <li><strong>Gauge and density.</strong> Real diameters vary and brands rarely publish density, so the physics mode uses material-class estimates.</li>
          <li><strong>Room and technique.</strong> Noise, a dampener, touching the bed, or a different pluck spot all add spread. Use the Validate screen to see your own repeatability.</li>
        </ul>
      </section>
      <section class="panel">
        <h3>Good practice</h3>
        <ol class="steps">
          <li>Measure the centre main with a ruler and store it on the setup.</li>
          <li>Calibrate within an hour of stringing, or against a stringer's meter.</li>
          <li>Measure the same way every time: same string, spot, excitation and phone distance.</li>
          <li>Trust trends over single readings. The restring call uses your own loss against the strung-at tension.</li>
        </ol>
      </section>
    </>
  );
}
