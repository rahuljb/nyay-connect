import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import google.generativeai as genai
import json

from .database import engine, Base, get_db
from . import models, schemas, auth

app = FastAPI(title="Nyay Connect API", version="1.0.0")

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    # Automatically create tables for the MVP database on startup
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


# --- AUTH ENDPOINTS ---


@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = (
        db.query(models.User).filter(models.User.email == user_in.email).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists.",
        )

    # Create new user
    hashed_pw = auth.get_password_hash(user_in.password)
    db_user = models.User(
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        role=user_in.role,
        password_hash=hashed_pw,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = (
        db.query(models.User).filter(models.User.email == user_in.email).first()
    )
    if not db_user or not auth.verify_password(
        user_in.password, db_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate token
    token_data = {
        "email": db_user.email,
        "role": db_user.role,
        "user_id": db_user.id,
    }
    access_token = auth.create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- ADVOCATE PROFILE ENDPOINTS ---


@app.post("/api/advocates/profile", response_model=schemas.AdvocateResponse)
def create_advocate_profile(
    profile_in: schemas.AdvocateCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "advocate":
        raise HTTPException(
            status_code=403,
            detail="Only accounts with role 'advocate' can create advocate profiles.",
        )

    # Check if profile already exists
    existing_profile = (
        db.query(models.Advocate).filter(models.Advocate.id == current_user.id).first()
    )
    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Advocate profile already exists.",
        )

    # Fetch specializations
    specs = (
        db.query(models.Specialization)
        .filter(models.Specialization.id.in_(profile_in.specialization_ids))
        .all()
    )

    # Create profile
    db_advocate = models.Advocate(
        id=current_user.id,
        enrollment_number=profile_in.enrollment_number,
        state_bar_council=profile_in.state_bar_council,
        experience_years=profile_in.experience_years,
        city=profile_in.city,
        state=profile_in.state,
        bio=profile_in.bio,
        languages=profile_in.languages,
        courts=profile_in.courts,
        specializations=specs,
    )
    db.add(db_advocate)
    db.commit()
    db.refresh(db_advocate)
    return db_advocate


@app.put("/api/advocates/profile", response_model=schemas.AdvocateResponse)
def update_advocate_profile(
    profile_in: schemas.AdvocateProfileUpdate,
    advocate: models.Advocate = Depends(auth.get_current_advocate),
    db: Session = Depends(get_db),
):
    # Update standard fields
    update_data = profile_in.dict(exclude_unset=True)

    if "specialization_ids" in update_data:
        spec_ids = update_data.pop("specialization_ids")
        specs = (
            db.query(models.Specialization)
            .filter(models.Specialization.id.in_(spec_ids))
            .all()
        )
        advocate.specializations = specs

    for key, value in update_data.items():
        setattr(advocate, key, value)

    db.commit()
    db.refresh(advocate)
    return advocate


@app.get("/api/advocates/profile/me", response_model=schemas.AdvocateResponse)
def get_my_advocate_profile(
    advocate: models.Advocate = Depends(auth.get_current_advocate),
):
    return advocate


@app.get("/api/advocates/{advocate_id}", response_model=schemas.AdvocateResponse)
def get_advocate_profile_by_id(advocate_id: str, db: Session = Depends(get_db)):
    advocate = (
        db.query(models.Advocate).filter(models.Advocate.id == advocate_id).first()
    )
    if not advocate:
        raise HTTPException(
            status_code=404,
            detail="Advocate profile not found.",
        )
    return advocate


# --- SEARCH & FILTER ENDPOINTS ---


@app.get("/api/search", response_model=List[schemas.AdvocateSearchResponse])
def search_advocates(
    city: Optional[str] = None,
    specialization: Optional[str] = None,
    min_experience: Optional[int] = None,
    verified_only: bool = False,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
):
    db_query = db.query(models.Advocate).join(models.User)

    if city:
        db_query = db_query.filter(models.Advocate.city.ilike(f"%{city}%"))

    if verified_only:
        db_query = db_query.filter(models.Advocate.verified == True)

    if min_experience is not None:
        db_query = db_query.filter(models.Advocate.experience_years >= min_experience)

    if specialization:
        # Join specializations table
        db_query = db_query.filter(
            models.Advocate.specializations.any(
                models.Specialization.name.ilike(f"%{specialization}%")
            )
        )

    if query:
        # Search bio, city, or user name
        db_query = db_query.filter(
            models.Advocate.bio.ilike(f"%{query}%")
            | models.Advocate.city.ilike(f"%{query}%")
            | models.User.name.ilike(f"%{query}%")
        )

    advocates = db_query.all()

    # Map to custom search response for ease of front-end display
    results = []
    for adv in advocates:
        results.append(
            schemas.AdvocateSearchResponse(
                id=adv.id,
                name=adv.user.name,
                email=adv.user.email,
                phone=adv.user.phone,
                experience_years=adv.experience_years,
                city=adv.city,
                state=adv.state,
                languages=adv.languages or [],
                courts=adv.courts or [],
                verified=adv.verified,
                premium=adv.premium,
                specializations=[s.name for s in adv.specializations],
            )
        )

    # Sort premium advocates first
    results.sort(key=lambda x: (not x.premium, -x.experience_years))
    return results


# --- SPECIALIZATIONS ---


@app.get("/api/specializations", response_model=List[schemas.SpecializationResponse])
def get_specializations(db: Session = Depends(get_db)):
    return db.query(models.Specialization).all()


# --- CONSULTATION REQUESTS ---


@app.post("/api/consultations", response_model=schemas.ConsultationResponse)
def request_consultation(
    consultation_in: schemas.ConsultationCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Only citizens can send consultation requests.",
        )

    # Verify advocate exists
    adv = (
        db.query(models.Advocate)
        .filter(models.Advocate.id == consultation_in.advocate_id)
        .first()
    )
    if not adv:
        raise HTTPException(
            status_code=404,
            detail="The requested advocate does not exist.",
        )

    db_consultation = models.Consultation(
        user_id=current_user.id,
        advocate_id=consultation_in.advocate_id,
        issue_summary=consultation_in.issue_summary,
        status="pending",
    )
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)

    # Map names to response
    resp = schemas.ConsultationResponse.from_orm(db_consultation)
    resp.citizen_name = current_user.name
    resp.advocate_name = adv.user.name
    return resp


@app.get("/api/consultations", response_model=List[schemas.ConsultationResponse])
def get_my_consultations(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "citizen":
        consultations = (
            db.query(models.Consultation)
            .filter(models.Consultation.user_id == current_user.id)
            .order_by(models.Consultation.created_at.desc())
            .all()
        )
    elif current_user.role == "advocate":
        consultations = (
            db.query(models.Consultation)
            .filter(models.Consultation.advocate_id == current_user.id)
            .order_by(models.Consultation.created_at.desc())
            .all()
        )
    else:  # Admin
        consultations = (
            db.query(models.Consultation)
            .order_by(models.Consultation.created_at.desc())
            .all()
        )


    results = []
    for c in consultations:
        resp = schemas.ConsultationResponse.from_orm(c)
        resp.citizen_name = c.citizen.name
        resp.advocate_name = c.advocate.user.name
        results.append(resp)

    return results


@app.put("/api/consultations/{consultation_id}", response_model=schemas.ConsultationResponse)
def update_consultation_status(
    consultation_id: str,
    status_in: schemas.ConsultationStatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    consultation = (
        db.query(models.Consultation)
        .filter(models.Consultation.id == consultation_id)
        .first()
    )
    if not consultation:
        raise HTTPException(
            status_code=404,
            detail="Consultation request not found.",
        )

    # Authorization check
    if current_user.role == "advocate" and consultation.advocate_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update this consultation request.",
        )
    elif current_user.role == "citizen" and consultation.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update this consultation request.",
        )

    consultation.status = status_in.status
    if status_in.appointment_date is not None:
        consultation.appointment_date = status_in.appointment_date
    if status_in.meeting_link is not None:
        consultation.meeting_link = status_in.meeting_link
    db.commit()
    db.refresh(consultation)

    resp = schemas.ConsultationResponse.from_orm(consultation)
    resp.citizen_name = consultation.citizen.name
    resp.advocate_name = consultation.advocate.user.name
    return resp


# --- ADMIN VERIFICATION & PROMOTION ---


@app.put("/api/admin/verify/{advocate_id}", response_model=schemas.AdvocateResponse)
def toggle_advocate_verification(
    advocate_id: str,
    verified: bool = Query(..., description="Set to true to verify, false to unverify"),
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    adv = db.query(models.Advocate).filter(models.Advocate.id == advocate_id).first()
    if not adv:
        raise HTTPException(
            status_code=404,
            detail="Advocate profile not found.",
        )

    adv.verified = verified
    db.commit()
    db.refresh(adv)
    return adv


@app.put("/api/admin/premium/{advocate_id}", response_model=schemas.AdvocateResponse)
def toggle_advocate_premium(
    advocate_id: str,
    premium: bool = Query(..., description="Set to true to promote, false to demote"),
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    adv = db.query(models.Advocate).filter(models.Advocate.id == advocate_id).first()
    if not adv:
        raise HTTPException(
            status_code=404,
            detail="Advocate profile not found.",
        )

    adv.premium = premium
    db.commit()
    db.refresh(adv)
    return adv


# --- AI CLASSIFICATION AND MATCHING ---


@app.get("/api/ai/classify")
def ai_classify_and_match(
    query: str = Query(..., description="The user's legal issue description"),
    db: Session = Depends(get_db),
):
    specializations = db.query(models.Specialization).all()
    spec_names = [s.name for s in specializations]

    if not spec_names:
        # fallback defaults if table empty
        spec_names = [
            "Criminal Law",
            "Family Law",
            "Property Law",
            "Consumer Law",
            "Startup Law",
            "GST",
            "Labour Law",
            "Accident Claims",
        ]

    category = "Property Law"  # Default
    confidence = 70
    used_llm = False

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            prompt = f"""
            You are a legal AI assistant for an Indian platform. Your job is to classify a citizen's legal problem into exactly one of these categories: {', '.join(spec_names)}.
            
            Here is the user's issue:
            "{query}"
            
            Return ONLY a valid JSON object with the format:
            {{
                "category": "Name of Category",
                "confidence": Integer (between 0 and 100)
            }}
            Do not include markdown blocks or any other explanation, just the raw JSON.
            """

            response = model.generate_content(prompt)
            # Remove any possible formatting
            resp_text = response.text.strip()
            if resp_text.startswith("```json"):
                resp_text = resp_text.replace("```json", "").replace("```", "").strip()
            elif resp_text.startswith("```"):
                resp_text = resp_text.replace("```", "").strip()

            parsed = json.loads(resp_text)
            if parsed.get("category") in spec_names:
                category = parsed["category"]
                confidence = parsed.get("confidence", 80)
                used_llm = True
        except Exception as e:
            print(f"Error calling Gemini API: {e}")

    # Fallback keyword-based classification
    if not used_llm:
        query_lower = query.lower()
        keyword_map = {
            "Property Law": [
                "builder",
                "apartment",
                "land",
                "house",
                "flat",
                "property",
                "tenant",
                "landlord",
                "rent",
                "handover",
                "possession",
                "deed",
                "encumbrance",
                "real estate",
                "rera",
            ],
            "Criminal Law": [
                "police",
                "arrest",
                "bail",
                "theft",
                "crime",
                "criminal",
                "assault",
                "murder",
                "threat",
                "fir",
                "cheating",
                "harassment",
            ],
            "Family Law": [
                "divorce",
                "custody",
                "marriage",
                "wife",
                "husband",
                "child",
                "alimony",
                "maintenance",
                "partition",
                "will",
                "inheritance",
                "dowry",
            ],
            "Consumer Law": [
                "defective",
                "refund",
                "warranty",
                "product",
                "service",
                "consumer",
                "shop",
                "e-commerce",
                "amazon",
                "flipkart",
                "fake",
                "cheat",
            ],
            "Startup Law": [
                "startup",
                "funding",
                "equity",
                "co-founder",
                "shares",
                "agreement",
                "incorporation",
                "vesting",
                "trademark",
                "patent",
                "nda",
            ],
            "GST": [
                "tax",
                "gst",
                "invoice",
                "cgst",
                "sgst",
                "igst",
                "filing",
                "return",
                "audit",
                "customs",
            ],
            "Labour Law": [
                "employee",
                "salary",
                "termination",
                "employer",
                "job",
                "fired",
                "pf",
                "gratuity",
                "labor",
                "hr",
            ],
            "Accident Claims": [
                "accident",
                "insurance",
                "claim",
                "injury",
                "crash",
                "car",
                "bike",
                "collision",
                "compensation",
                "mact",
            ],
        }

        max_matches = 0
        for cat, kw_list in keyword_map.items():
            matches = sum(1 for kw in kw_list if kw in query_lower)
            if matches > max_matches:
                max_matches = matches
                category = cat
        if max_matches > 0:
            confidence = min(60 + max_matches * 10, 95)
        else:
            category = "Consumer Law"  # fallback default
            confidence = 40

    # Retrieve advocates with this specialization
    db_advocates = (
        db.query(models.Advocate)
        .join(models.User)
        .filter(
            models.Advocate.specializations.any(
                models.Specialization.name == category
            )
        )
        .all()
    )

    recommended = []
    for adv in db_advocates:
        recommended.append(
            schemas.AdvocateSearchResponse(
                id=adv.id,
                name=adv.user.name,
                email=adv.user.email,
                phone=adv.user.phone,
                experience_years=adv.experience_years,
                city=adv.city,
                state=adv.state,
                languages=adv.languages or [],
                courts=adv.courts or [],
                verified=adv.verified,
                premium=adv.premium,
                specializations=[s.name for s in adv.specializations],
            )
        )

    # Sort recommended advocates (premium first, then experience)
    recommended.sort(key=lambda x: (not x.premium, -x.experience_years))

    return {
        "classification": {
            "category": category,
            "confidence": confidence,
            "used_llm": used_llm,
        },
        "recommended_advocates": recommended,
    }


# --- BOOTSTRAP DATA ENDPOINT ---


@app.post("/api/bootstrap")
def bootstrap_data(db: Session = Depends(get_db)):
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)

    # 1. Add Specializations
    specialization_names = [
        "Criminal Law",
        "Family Law",
        "Property Law",
        "Consumer Law",
        "Startup Law",
        "GST",
        "Labour Law",
        "Accident Claims",
    ]

    existing_specs = {s.name: s for s in db.query(models.Specialization).all()}
    added_specs = []

    for name in specialization_names:
        if name not in existing_specs:
            spec = models.Specialization(name=name)
            db.add(spec)
            added_specs.append(name)

    db.commit()

    # Refresh specializations
    specs = {s.name: s for s in db.query(models.Specialization).all()}

    # 2. Add Admin User
    admin_email = "admin@nyayconnect.com"
    admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not admin:
        admin = models.User(
            name="Platform Admin",
            email=admin_email,
            phone="9999999999",
            role="admin",
            password_hash=auth.get_password_hash("admin123"),
        )
        db.add(admin)

    # 3. Add Citizens
    citizens_data = [
        ("Rahul Sharma", "rahul@gmail.com", "citizen123"),
        ("Anjali Menon", "anjali@gmail.com", "citizen123"),
    ]
    for name, email, pw in citizens_data:
        cit = db.query(models.User).filter(models.User.email == email).first()
        if not cit:
            cit = models.User(
                name=name,
                email=email,
                phone="8888888888",
                role="citizen",
                password_hash=auth.get_password_hash(pw),
            )
            db.add(cit)

    # 4. Add Advocates & Profiles
    advocates_data = [
        {
            "name": "Advocate Hari Prasad",
            "email": "hari.prasad@gmail.com",
            "password": "advocate123",
            "enrollment_number": "K/1245/2012",
            "state_bar_council": "Bar Council of Kerala",
            "experience_years": 14,
            "city": "Trivandrum",
            "state": "Kerala",
            "bio": "Expert in property registrations, land disputes, builder delayed handover cases, and RERA claims in Trivandrum district.",
            "languages": ["English", "Malayalam", "Tamil"],
            "courts": ["High Court Kerala", "District Court Trivandrum"],
            "verified": True,
            "premium": True,
            "specializations": ["Property Law", "Consumer Law"],
        },
        {
            "name": "Advocate Sneha Patel",
            "email": "sneha.patel@gmail.com",
            "password": "advocate123",
            "enrollment_number": "MAH/9082/2016",
            "state_bar_council": "Bar Council of Maharashtra",
            "experience_years": 10,
            "city": "Mumbai",
            "state": "Maharashtra",
            "bio": "Dedicated family law counselor specializing in divorce litigation, child custody disputes, and maintenance claims.",
            "languages": ["English", "Hindi", "Gujarati"],
            "courts": ["Bombay High Court", "Family Court Bandra"],
            "verified": True,
            "premium": False,
            "specializations": ["Family Law"],
        },
        {
            "name": "Advocate Amit Verma",
            "email": "amit.verma@gmail.com",
            "password": "advocate123",
            "enrollment_number": "D/4412/2010",
            "state_bar_council": "Bar Council of Delhi",
            "experience_years": 16,
            "city": "Delhi",
            "state": "NCR",
            "bio": "Aggressive representation in criminal trials, white-collar crimes, CBI probes, and anticipatory bail petitions.",
            "languages": ["English", "Hindi"],
            "courts": ["Supreme Court of India", "Delhi High Court", "Patiala House Courts"],
            "verified": True,
            "premium": True,
            "specializations": ["Criminal Law"],
        },
        {
            "name": "Advocate Vikram Sen",
            "email": "vikram.sen@gmail.com",
            "password": "advocate123",
            "enrollment_number": "KA/2231/2018",
            "state_bar_council": "Bar Council of Karnataka",
            "experience_years": 8,
            "city": "Bangalore",
            "state": "Karnataka",
            "bio": "Helping tech startups incorporate, design cofounder agreements, manage ESOPs, and structure venture capital rounds.",
            "languages": ["English", "Kannada", "Hindi"],
            "courts": ["Karnataka High Court", "Civil Court Bangalore"],
            "verified": False,
            "premium": False,
            "specializations": ["Startup Law", "GST"],
        },
    ]

    for adv in advocates_data:
        user = db.query(models.User).filter(models.User.email == adv["email"]).first()
        if not user:
            user = models.User(
                name=adv["name"],
                email=adv["email"],
                phone="7777777777",
                role="advocate",
                password_hash=auth.get_password_hash(adv["password"]),
            )
            db.add(user)
            db.commit()  # commit to get user.id

        profile = db.query(models.Advocate).filter(models.Advocate.id == user.id).first()
        if not profile:
            # Map specialization names to models
            adv_specs = [specs[name] for name in adv["specializations"] if name in specs]

            profile = models.Advocate(
                id=user.id,
                enrollment_number=adv["enrollment_number"],
                state_bar_council=adv["state_bar_council"],
                experience_years=adv["experience_years"],
                city=adv.get("city", ""),
                state=adv.get("state", ""),
                bio=adv["bio"],
                languages=adv["languages"],
                courts=adv["courts"],
                verified=adv["verified"],
                premium=adv["premium"],
                specializations=adv_specs,
            )
            db.add(profile)

    db.commit()

    return {
        "status": "success",
        "message": "Database initialized with specializations, an admin, dummy citizens, and verified advocates.",
    }
