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
      "Voltaris is the electric vehicle racing team of Izmir Institute of High Technology, bringing together students from different engineering disciplines. Our goal is to design an energy-efficient, safe, and competitive electromobile to represent our university at national and international competitions.",
    aboutPoints: [
      "Aerodynamics and chassis design",
      "Battery management systems",
      "Motor control and power electronics",
      "Software, telemetry, and data analytics",
    ],
    teamPhotoTitle: "Team Photo",
    teamPhotoText: "We'll place your team photo here once you share it.",
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
    heroSubtitle: "Pick one of our three core tracks, open its application window, and fill out the form.",
    sectionLabelLeft: "02 — COMMITTEES",
    sectionLabelRight: "THREE TRACKS",
    applyLabel: "APPLY",
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
      fullName: "Full Name",
      email: "Email",
      phone: "Phone",
      department: "Department & Year",
      motivation: "Why did you choose this committee?",
      portfolio: "Portfolio / CV link (optional)",
      submit: "Submit Application",
      note: "* This form is currently a demo — submitted data is not sent to a server. Let us know when you want to connect a real submission flow.",
      success: "Your application was received (demo). Connect this form to a real service to go live.",
    },
    closingTitle: "YOU'RE NEXT",
    closingText: "We're not looking for experience — we're looking for commitment.",
    closingNote: "* We'll update this once you share the actual application deadline.",
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
