import type { Dictionary } from "./tr";

const en: Dictionary = {
  meta: {
    title: "Voltaris — IZTECH Electromobile Team",
  },
  nav: {
    home: "Home",
    team: "Team",
    vehicle: "Vehicle",
    applications: "Applications",
    sponsors: "Sponsors",
    contact: "Contact",
    joinCta: "Join Us",
    themeDark: "DARK",
    themeLight: "LIGHT",
  },
  home: {
    heroKicker: "Izmir Institute of High Technology",
    heroTitle: "VOLTARIS",
    heroSubtitle: "Electromobile Team",
    heroTagline:
      "Engineering sustainable mobility, pushing boundaries, and putting our energy to the test on the track.",
    ctaVehicle: "Discover Our Vehicle",
    ctaSponsor: "Become a Sponsor",
    scrollHint: "SCROLL",
    aboutTitle: "Who We Are",
    aboutText:
      "Voltaris is an electric vehicle team founded two years ago at Izmir Institute of Technology. In those two years we designed an electromobile from scratch, built it in our own workshop and took it to the TEKNOFEST track. This year the team passed to a new crew; what we inherited is not just a car, but two years of design archives, manufacturing experience and a workshop that already runs. We are picking up from there, working towards the 2027 TEKNOFEST Efficiency Challenge.",
    aboutPoints: [
      "6061-T6 aluminium chassis and an FIA-compliant roll cage",
      "A battery management board we design and build ourselves",
      "Motor driver and vehicle control system development",
      "In-house circuit production on our laser PCB machine",
    ],
    visionKicker: "Where we are going",
    visionTitle: "Our Vision",
    visionText:
      "To turn electric vehicle engineering at IZTECH from a one-semester project into a lasting culture. To be a team that does not start over when the crew changes, but continues each year from where the previous one left off. To be a constant presence at TEKNOFEST, and to see IZTECH near the top of the standings.",
    missionKicker: "How we work",
    missionTitle: "Our Mission",
    missionText:
      "To keep a safe, energy-efficient electromobile — designed, built and tested entirely by students — running on the track every year. And to pass the knowledge and experience we gain on to the next generation.",
    chassisTitle: "Voltaris electromobile assembly animation",
    vehicleTeaserTitle: "Our Race Vehicle",
    vehicleTeaserText:
      "Designed from the ground up, our electromobile is built for low weight and high energy efficiency.",
    vehicleTeaserCta: "Technical Details",
    sponsorsTeaserTitle: "Organizations Backing Us",
    sponsorsTeaserText:
      "Voltaris' journey is made possible by sponsors who believe in our vision.",
    sponsorsTeaserCta: "Sponsorship Opportunities",
    joinTitle: "Want to Join the Team?",
    joinText:
      "If you'd like to bring your skills in engineering, design, software, or organization to the team, we'd love to hear from you.",
    joinCta: "Get in Touch",
  },
  team: {
    heroTitle: "Our Team",
    heroSubtitle: "Different disciplines, one shared goal.",
    introTitle: "The Voltaris Family",
    introText:
      "Students from mechanical, electrical-electronics, industrial design, computer engineering, and business departments come together around a shared passion for electric vehicle engineering.",
    departmentsTitle: "Our Departments",
    departments: [
      {
        name: "Chassis & Aerodynamics",
        description: "Vehicle body design, lightweight material selection, and aerodynamic optimization.",
      },
      {
        name: "Battery & Energy Management",
        description: "Battery pack design, BMS, and energy efficiency studies.",
      },
      {
        name: "Power Electronics & Motor Control",
        description: "Motor driver design, inverters, and control algorithms.",
      },
      {
        name: "Software & Telemetry",
        description: "On-board software, sensor integration, and live data tracking.",
      },
      {
        name: "Design & Modeling",
        description: "3D modeling, simulation, and visual identity work.",
      },
      {
        name: "Organization & Sponsorship",
        description: "Team management, budget planning, and sponsor relations.",
      },
    ],
    membersTitle: "Team Members",
    membersNote: "We'll update this section once you share member photos and names.",
    memberPlaceholder: "Full Name",
    rolePlaceholder: "Department / Role",
  },
  vehicle: {
    heroTitle: "Our Race Vehicle",
    heroSubtitle: "Voltaris E-1",
    heroTagline: "An electromobile built at the intersection of efficiency and performance.",
    sketchEyebrow: "01 — VEHICLE / DESIGN STAGE",
    sketchNote: "Early design sketch. Dimensions are not final. Keep scrolling to complete the drawing.",
    modelPlaceholderTitle: "3D Vehicle Model",
    modelPlaceholderText:
      "Once you share your .glb / .gltf model, we'll embed an interactive viewer here.",
    photosPlaceholderTitle: "Vehicle Gallery",
    photosPlaceholderText: "We'll publish the gallery here once you share vehicle photos.",
    specsTitle: "Technical Specifications",
    specs: [
      { label: "Range", value: "— km" },
      { label: "Top Speed", value: "— km/h" },
      { label: "Weight", value: "— kg" },
      { label: "Motor Power", value: "— kW" },
      { label: "Battery Capacity", value: "— kWh" },
      { label: "Charging Time", value: "— hours" },
    ],
    specsNote: "* We'll update this table once you share your real technical data.",
    timelineTitle: "Development Process",
    timeline: [
      { phase: "Concept & Design", description: "Vehicle concept, aerodynamic simulations, and first sketches." },
      { phase: "Prototype Build", description: "Chassis manufacturing, electronics integration, and first assembly." },
      { phase: "Testing & Optimization", description: "Field tests, data analysis, and performance improvements." },
      { phase: "Race Ready", description: "Final checks and competition entry." },
    ],
  },
  applications: {
    heroTitle: "Applications",
    heroSubtitle:
      "Fill out the form below — partway through, pick which committee you want to join and its specific questions will appear.",
    committees: [
      {
        id: "mekanik",
        name: "Mechanical",
        description:
          "Chassis and roll cage, brakes, steering, suspension, body shell, and drivetrain. Everything from CAD to the welding table in the workshop.",
      },
      {
        id: "elektrik",
        name: "Electrical",
        description:
          "Vehicle control system, motor driver, battery management, onboard charging, and embedded software. The decision-making side of the car.",
      },
      {
        id: "destek",
        name: "Support",
        description: "Sponsorship, finance, technical reporting, and social media. The unseen work that gets the car on track.",
      },
    ],
    form: {
      eyebrow: "APPLICATION FORM",
      committeeQuestion: "Which committee do you want to apply to?",
      submit: "Submit Application",
      submitting: "Sending",
      saving: "Saving…",
      filePreparing: "Preparing…",
      required: "This field is required.",
      note: "* What you share is used only for our internal review and is not passed on to anyone.",
      success: "We've received your application. We'll get back to you by email once we've reviewed it.",
      error: "We couldn't send your application. Check your connection and try again; if it keeps failing, email voltaris.official@gmail.com.",
      fileChoose: "Choose File",
      fileReplace: "Replace",
      fileRemove: "Remove",
      fileHint: "PDF, Word or an image · 8 MB max",
      fileTooLarge: "The file must be under 8 MB.",
    },
    closingTitle: "YOU'RE NEXT",
    closingText: "We're not looking for experience — we're looking for commitment.",
    closingNote: "Applications are open — there's no fixed deadline for now.",
    closingCta: "Go to Applications",
  },
  sponsors: {
    heroTitle: "Our Sponsors",
    heroSubtitle: "The supporters who make Voltaris possible.",
    introTitle: "Why Support Voltaris?",
    introText:
      "Your sponsorship directly contributes to sustainable engineering projects, the growth of innovative young talent, and your brand's visibility within the university community.",
    currentSponsorsTitle: "Our Current Sponsors",
    currentSponsorsNote: "We'll publish your sponsor logos here once you share them.",
    tiersTitle: "Sponsorship Packages",
    tiers: [
      {
        name: "Bronze",
        description: "Logo placement on the website and a thank-you post on social media.",
      },
      {
        name: "Silver",
        description: "Everything in Bronze, plus a small logo placement on the vehicle.",
      },
      {
        name: "Gold",
        description: "Everything in Silver, plus a featured logo on the vehicle and brand representation at events.",
      },
      {
        name: "Platinum",
        description: "Full visibility rights, plus direct collaboration with the team on special projects.",
      },
    ],
    tiersNote: "* Package contents and pricing are examples — update with your own sponsorship deck.",
    ctaTitle: "Interested in Sponsoring?",
    ctaText: "Reach out and we'll send our sponsorship deck or answer any questions.",
    ctaButton: "Get in Touch",
  },
  contact: {
    heroTitle: "Contact",
    heroSubtitle: "Reach out with questions, collaboration proposals, or to join the team.",
    formTitle: "Send a Message",
    formName: "Full Name",
    formEmail: "Email",
    formSubject: "Subject",
    formMessage: "Your Message",
    formSubmit: "Send",
    formNote: "* This form is currently a demo — submitted data is not sent to a server.",
    infoTitle: "Contact Information",
    email: "voltaris.official@gmail.com",
    address: "Izmir Institute of High Technology, Urla, Izmir",
    socialTitle: "Social Media",
  },
  footer: {
    tagline: "Electromobile Team of Izmir Institute of High Technology",
    rights: "All rights reserved.",
    builtWith: "3D experience powered by ThreeUI Community components.",
  },
};

export default en;
