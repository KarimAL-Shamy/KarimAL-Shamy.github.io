# Karim Hassan — Computer Engineering Portfolio

[![GitHub Pages](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=github)](https://karimal-shamy.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/karim-hassan-ab6860188/)

> High-performance, accessible, and responsive personal portfolio showcasing software engineering projects, algorithmic visualizers, embedded systems experience, technical certifications, and engineering capabilities.

---

## 🌟 Interactive Showcase & Features

### 1. 3D Fanned-Deck Certificate Carousel
- **Gestural Physics**: Authentically mimics a physical hand-held deck of cards with smooth rotation, dynamic un-fanning on pull, and flick/swipe dismissal.
- **Micro-Tactile Audio Synthesis**: Uses the Web Audio API (`SoundService`) to synthesize subtle frequencies on swipe, snap, and navigation clicks without external media assets.
- **Circular SVG Progress Timer**: Real-time circular autoplay timer with pause-on-hover and background tab auto-pausing via `visibilitychange`.
- **Certificate Lightbox Modal**: High-resolution image preview with metadata display, keyboard accessibility (`Escape`), and background scroll locking.

### 2. Algorithmic Demonstration Suite
- **Pathfinding & Search Visualizer**: Interactive grid animator comparing **A\* Search** (with Manhattan, Euclidean, and Octile heuristics) and **Breadth-First Search (BFS)** across multi-size agent footprints (1x1, 2x2, 3x3) with precomputed sector connectivity.
- **Sorting Visualizer**: Web-based animator illustrating real-time comparisons and array swaps for Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort, and Heap Sort.
- **Dynamic Mathematical Clock**: Canvas clock developed with polar coordinates in p5.js, animating smooth trigonometric radial arcs for hours, minutes, seconds, and milliseconds.
- **Tic Tac Toe GUI Game**: Interactive desktop-styled turn-based game featuring object-oriented game logic and score tracking.

### 3. Generative Hero Particle System
- Interactive vector canvas built with **Pt.js**, animating responsive floating point geometries and mouse-proximity line segment illumination.
- Integrated with `IntersectionObserver` to automatically halt animation loops when out of viewport, preserving device battery and GPU resources.

### 4. Interactive Skills Matrix & Category Filter
- Categorized skill bars and tech badges (Languages, Frameworks, Tools) with smooth opacity highlighting and category switching.

### 5. Multi-Language Terminal Typing
- Animated developer terminal prompt powered by Typed.js, featuring localized greetings in English, French, and Arabic.

### 6. Theme Switching & Persistence
- Intelligent dark/light theme detection defaulting to visitor's operating system setting (`prefers-color-scheme: dark`) with manual toggle and `localStorage` persistence.

---

## 🛠️ Software Engineering Methodologies & Clean Code

| Principle | Implementation Details |
|---|---|
| **Single Responsibility Principle (SRP)** | Modular controllers (`NavigationController`, `ThemeController`, `PortfolioFilterController`, `SkillsMatrixController`, `ProjectModalController`, `CertificateDeckCarousel`, `SoundService`, `CertificateLightbox`). |
| **Single Source of Truth** | Centralized project and certificate metadata dictionaries; unified modal lifecycle management. |
| **Defensive Programming** | Boundary checks, fallback clipboard execution (`document.execCommand`), existence guards on DOM queries and external libraries. |
| **Performance Optimization** | `requestAnimationFrame` loop throttling, debounced resize observers, hardware-accelerated CSS 3D transforms (`translate3d`, `rotate`, `scale`). |
| **Accessibility (WCAG 2.1)** | Semantic HTML5 structure, ARIA roles (`role="region"`, `role="dialog"`, `role="group"`, `aria-roledescription="carousel"`), keyboard navigation (`Escape`, `ArrowLeft`, `ArrowRight`, `Tab` focus trapping), and `prefers-reduced-motion` compliance. |
| **Security & Hygiene** | All external links hardened with `rel="noopener noreferrer"`; sanitized DOM operations avoiding vulnerable string injection. |

---

## 📂 Project Architecture

```plaintext
Portfolio-Website/
├── index.html                   # Semantic HTML5 entry page with meta, OpenGraph, and ARIA markup
├── favicon.ico                  # Site favicon
├── README.md                    # Project documentation
├── Resume/
│   └── Resume_Karim.pdf         # Current Resume / CV
├── scripts/
│   ├── index.js                 # Modular controllers (Navigation, Theme, Filter, Skills, Clipboard)
│   ├── modal.js                 # Project details modal dialog and gesture screenshot carousel
│   ├── cert-carousel.js         # Production-grade 3D fanned-deck certificate carousel & lightbox
│   ├── canvas.js                # Generative Pt.js particle animation for hero section
│   ├── jquery.min.js            # DOM utility
│   ├── jquery.mixitup.min.js     # Grid filtering engine
│   ├── jquery.waypoints.min.js  # Scroll entrance animation triggers
│   ├── pt.min.js                # Canvas point-math library
│   └── typed.js                 # Typing terminal animator
├── style/
│   └── style.css                # Comprehensive responsive stylesheet (Light/Dark themes)
├── img/
│   ├── certificates/            # High-resolution technical certificate previews
│   ├── slides/                  # Project detail screenshots
│   └── logos/                   # Organization, university, and asset brand icons
└── projects/
    ├── pathfinding/             # A* & BFS heuristic search visualizer application
    ├── sorting/                 # Sorting algorithm animation tool
    ├── clock/                   # Dynamic polar coordinate trigonometric clock
    └── tictactoe/               # Interactive GUI game application
```

---

## 🚀 Running Locally

Because this project is built using standard web technologies with no compilation steps required:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KarimAL-Shamy/KarimAL-Shamy.github.io.git
   cd KarimAL-Shamy.github.io
   ```

2. **Open in any browser or launch a static server:**
   ```bash
   # Using Python 3:
   python -m http.server 8000
   ```
   Navigate to `http://localhost:8000` in your web browser.

---

## 👤 Author

**Karim Hassan**  
- **Major**: Computer Engineering, Memorial University of Newfoundland (MUN)  
- **GitHub**: [@KarimAL-Shamy](https://github.com/KarimAL-Shamy)  
- **LinkedIn**: [Karim Hassan](https://www.linkedin.com/in/karim-hassan-ab6860188/)  
- **Email**: [Kshassan@mun.ca](mailto:Kshassan@mun.ca)  

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
