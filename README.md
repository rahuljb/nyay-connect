# Nyay Connect (Advocate Discovery Platform MVP)

Nyay Connect is a premium advocate discovery platform (styled as "LinkedIn + Practo for Advocates") tailored for the Indian legal ecosystem. It helps citizens find verified advocates nearby by city or specialization, offers an AI-powered case matchmaking assistant, and provides a structured consultation intake and scheduling dashboard.

This repository is organized as a monorepo containing a **FastAPI backend** and a **Next.js frontend**.

---

## Repository Structure

```
nyay-connect/
├── backend/                  # FastAPI Web Server
│   ├── app/
│   │   ├── auth.py           # Native bcrypt password hashing & JWT auth token generation
│   │   ├── database.py       # SQLAlchemy setup and database connection session helper
│   │   ├── main.py           # REST API routes (Auth, Profiles, Search, Leads, and AI Classify)
│   │   ├── models.py         # SQLAlchemy DB models (User, Advocate, Specialization, Consultation)
│   │   └── schemas.py        # Pydantic request/response validation schemas
│   ├── .env                  # Environment configurations (DB URL, secret keys)
│   └── requirements.txt      # Python dependencies
└── frontend/                 # Next.js Frontend App (App Router)
    ├── app/
    │   ├── components/
    │   │   └── Navbar.js     # Global header tracking client-side auth state
    │   ├── advocate/[id]/    # Public Advocate Profile & consultation request forms
    │   ├── dashboard/        # Unified role-specific dashboards (Citizen, Advocate, Admin panels)
    │   ├── login/            # Glassmorphism login screen
    │   ├── register/         # Citizen registration screen (isolated)
    │   │   └── advocate/     # Dedicated advocate registration portal URL
    │   ├── global.css        # Premium vanilla CSS variables, glassmorphism card templates & layouts
    │   └── page.js           # Interactive home page (search filters & AI matchmaking bar)
    └── package.json          # Node dependencies and npm scripts
```

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, PostgreSQL, SQLAlchemy, Native bcrypt (no passlib wrap bugs)
- **Frontend:** Next.js (App Router), Vanilla CSS, responsive layout
- **Database:** PostgreSQL (with `pgvector` compatibility ready for future stages)
- **AI Matching:** Gemini 1.5 Flash (via `google-generativeai` SDK) with robust local keyword-based fallback rules

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ & npm
- PostgreSQL running locally

---

### 1. Database Setup
Ensure PostgreSQL is running, then create the database:
```bash
createdb nyay_connect
```
*Note: The default connection string used is `postgresql://rahul@localhost/nyay_connect`. You can customize this in the backend `.env` file.*

---

### 2. Backend Installation & Setup
Navigate to the `backend/` directory, create a virtual environment, install requirements, and start the server:

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
The backend API docs will be available at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Installation & Setup
Navigate to the `frontend/` directory, install packages, and start the Next.js development server:

```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js server
npm run dev -- -p 3000
```
Open `http://localhost:3000` in your web browser.

---

## Database Bootstrapping & Seed Data

Once both servers are running, seed the PostgreSQL database with default specializations and test accounts by calling the bootstrap endpoint:
```bash
curl -X POST http://127.0.0.1:8000/api/bootstrap
```

This endpoint registers the following default credentials for local testing:

### Admin Credentials
- **Email:** `admin@nyayconnect.com`
- **Password:** `admin123`
- *Use to:* Verify advocate profiles and feature them on the front page.

### Citizen Credentials
- **Email:** `rahul@gmail.com` (or `anjali@gmail.com`)
- **Password:** `citizen123`
- *Use to:* Search advocates, test AI matching, and submit consultation requests.

### Advocate Credentials
- **Email:** `hari.prasad@gmail.com` (or `sneha.patel@gmail.com`, `amit.verma@gmail.com`)
- **Password:** `advocate123`
- *Use to:* Accept/Decline leads, schedule consultation dates, and modify bio descriptions.

---

## Core Features & Workflows

### 1. Dedicated Advocate Portal
- **Citizen Registration:** `http://localhost:3000/register` (Isolated; role options removed).
- **Advocate Enrollment:** `http://localhost:3000/register/advocate` (Directly displays professional credentials input).

### 2. Premium Grid Search
- Filter advocates by city, state, or specialization.
- Premium/Featured advocates (managed via the Admin panel) are automatically sorted first with a glowing golden border.

### 3. AI Matchmaker
- Citizen describes a legal problem in natural English (e.g. *"Builder delayed apartment possession for 6 months"*).
- The system parses the query and classifies it (e.g. under *Property Law*).
- An AI banner displaying the matched category and confidence score is rendered, showing recommended advocates.
- **Gemini SDK Integration:** If a `GEMINI_API_KEY` is present in the backend `.env`, the system queries Gemini 1.5 Flash. Otherwise, it seamlessly falls back to a local keyword-indexing algorithm.

### 4. Refined Split Dashboards
Both Citizens and Advocates have dashboards categorized into separate sections:
- **Upcoming Appointment Details:** Lists scheduled consultation times and clickable virtual meeting links.
- **Current Cases:** Active consultations in progress.
- **Previous Case List:** Finished cases marked as completed by the advocate.

### 5. Inline Scheduler
- When an advocate clicks **Accept & Schedule** on a new lead, an inline scheduling form appears, prompting for **Date & Time** and **Meeting Link**. Once submitted, the case automatically migrates to *Upcoming Appointments* on both user dashboards.

---

## License

This project is prepared for startup validation. Disclaimer: In accordance with BCI (Bar Council of India) guidelines, this platform does not solicit clients or advertise services.
