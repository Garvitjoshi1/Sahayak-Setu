# Sahayak Setu (सहायक सेतु)

**Execute Government Services Independently. We show you exactly how and where.**

Sahayak Setu is a multilingual web platform designed to empower Indian citizens. It shifts away from being a passive information aggregator into an active execution platform, featuring interactive wizards, an eligibility funnel, and an in-house AI assistant.

![Sahayak Setu Hero Section](public/hero-screenshot.png)
*(Note: Add a screenshot of your hero section/homepage here)*

---

## Core Features

### 1. Application Execution Wizard
A 3-step interactive wizard that replaces static text guides:
* **Step 1:** Select from a comprehensive database of essential government services.
* **Step 2:** A local Document Validator checklist ensures users have the exact PDFs/JPEGs required before they even visit the portal.
* **Step 3:** Direct routing to the official execution portal with a mini-timeline recap.

![Wizard Interface](public/wizard-screenshot.png)
*(Note: Add a screenshot of the 3-step application wizard here)*

### 2. 3D Eligibility Engine (Funnel Architecture)
A step-by-step funnel calculator. Instead of overwhelming users with a wall of schemes, it asks for Age, Income, and Occupation, and then dynamically filters the exact schemes they qualify for using an in-memory matching algorithm.

### 3. In-House AI Execution Bot
A custom Rule-Based/RAG AI engine built directly into the client. 
* **Privacy-First:** Runs entirely without OpenAI/Google API dependencies.
* **Structured Outputs:** The AI generates HTML cards, step-by-step lists, and actionable "Apply Now" buttons rather than unstructured text.
* **Strict Guardrails:** Automatically blocks out-of-scope queries.

![AI Chat Assistant](public/chat-screenshot.png)
*(Note: Add a screenshot of the AI chat assistant interface here)*

### 4. Deep Multilingual Support (i18n)
Native, zero-dependency translation engine supporting six languages: English, Hindi, Bengali, Telugu, Marathi, and Tamil.

### 5. Advanced UI/UX & Dark Mode
* **System Sync:** Listens to OS-level theme changes via `window.matchMedia`.
* **OLED Dark Mode:** Utilizes True Black (`#050505`) with 6% white elevation for cards.
* **3D CSS Rendering:** Implements `perspective`, `transform-style: preserve-3d`, and complex gradient drop-shadows for a tactile feel.

### 6. SEO & Performance Optimized
* **Dynamic JSON-LD:** Automatically injects WebSite, Organization, and HowTo structured data schemas for Google Rich Snippets.
* **Vercel Edge Caching:** Configured `vercel.json` with immutable Cache-Control and Expires headers to achieve top Lighthouse performance scores.

---

## Tech Stack

* **Frontend Framework:** React 18
* **Language:** TypeScript (Strict Mode)
* **Build Tool:** Vite
* **Styling:** Pure CSS (CSS Variables, Flexbox/Grid, 3D Transforms)
* **Deployment:** Vercel

---

## Project Structure

```text
sahayak-setu/
├── public/
│   ├── logo.png             # Favicon & UI Logo
│   └── hero-screenshot.png  # README Screenshots
├── src/
│   ├── App.tsx              # Core Application, AI Engine, & Database
│   ├── main.tsx             # React DOM Mounting
│   └── vite-env.d.ts
├── package.json
├── vercel.json              # Edge Network Caching & Gzip Rules
└── tsconfig.json

🚀 Getting Started (Local Development)
Clone the repository:

Bash
git clone [https://github.com/your-username/sahayak-setu.git](https://github.com/your-username/sahayak-setu.git)
cd sahayak-setu
Install dependencies:

Bash
npm install
Start the development server:

Bash
npm run dev

☁️ Deployment to Vercel
This repository is optimized for Vercel deployment. It includes a vercel.json file that enforces Gzip compression and long-term caching headers to guarantee an "A" performance grade.

Go to your Vercel Dashboard.

Click Add New Project and import this repository.

Important: If your React app is inside a subfolder (e.g., sahayak-setu), click Edit under Root Directory and select that folder.

Vercel will automatically detect Vite and configure the build commands.

Click Deploy.

⚖️ Legal Disclaimer
This platform is a personal engineering project created for informational and execution-assist purposes only. We are an independent entity and are not affiliated with the Government of India. While we strive for accuracy, users must verify all data, documents, and procedures on official gov.in portals. We are not liable for any errors, omissions, or rejected applications.