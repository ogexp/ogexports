const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="120 130 880 650">
<defs>
  <linearGradient id="og-metal" gradientUnits="userSpaceOnUse" x1="0" y1="265" x2="0" y2="755">
    <stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#e4e4e8"/>
    <stop offset=".37" stop-color="#8e8f9a"/><stop offset=".445" stop-color="#1f7a4a"/>
    <stop offset=".55" stop-color="#1b7a49"/><stop offset=".62" stop-color="#9a9ba5"/>
    <stop offset=".75" stop-color="#d9dadf"/><stop offset="1" stop-color="#f6f6f8"/>
  </linearGradient>
  <g id="og-g">
    <path d="M785 360 A215 215 0 1 0 845 510" fill="none" stroke="url(#og-metal)" stroke-width="60" stroke-linecap="butt"/>
    <circle cx="785" cy="360" r="30" fill="url(#og-metal)"/>
    <path d="M731 483 H874 A245 245 0 0 1 872.5 545.5 H731 A31 31 0 0 1 731 483 Z" fill="url(#og-metal)"/>
  </g>
  <g id="og-g-outline" fill="none" stroke="#0d3d2e" stroke-linejoin="round">
    <path d="M785 360 A215 215 0 1 0 845 510" stroke-width="76" stroke-linecap="butt"/>
    <circle cx="785" cy="360" r="38" fill="#0d3d2e" stroke="none"/>
    <path d="M731 483 H874 A245 245 0 0 1 872.5 545.5 H731 A31 31 0 0 1 731 483 Z" stroke-width="16" fill="#0d3d2e"/>
  </g>
</defs>
<use href="#og-g-outline"/><use href="#og-g"/>
<circle cx="390" cy="510" r="253" fill="none" stroke="#0d3d2e" stroke-width="76"/>
<circle cx="390" cy="510" r="253" fill="none" stroke="url(#og-metal)" stroke-width="60"/>
<path d="M510 372 A185 185 0 0 0 510 648" fill="none" stroke="#d4a53a" stroke-width="5" stroke-linecap="round"/>
<g fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="8" stroke-linecap="round">
  <path d="M202 442 A200 200 0 0 1 355 313"/><path d="M445 442 A200 200 0 0 1 595 313"/>
</g>
</svg>`;

export const officialPdfLogoDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;
