"""
============================================================
TESTMONY V0.0.1
CONNECT BEYOND
============================================================

Founder:
    MSAFIRI WILLIAM MUNGA

Company:
    ZetroLink Technology Limited

Type:
    Social Network + Messaging + AI Platform +
    Education + Marketplace + Creator Platform

Backend:
    FastAPI

Database:
    PostgreSQL
    SQLite fallback for local testing

============================================================
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Query,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    or_,
)
from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
    Session,
    relationship,
)


# ============================================================
# 1. APPLICATION CONFIGURATION
# ============================================================

APP_NAME = "TESTMONY"
APP_VERSION = "Testmony V0.0.1"
APP_SLOGAN = "Connect beyond"
FOUNDER = "MSAFIRI WILLIAM MUNGA"
COMPANY = "ZetroLink Technology Limited"

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

STATIC_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'testmony.db'}"

# Render / Heroku style PostgreSQL URLs sometimes start with
# postgres://. SQLAlchemy expects postgresql://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )

connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


# ============================================================
# 3. DATABASE MODELS
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    name = Column(
        String(120),
        nullable=False,
    )

    username = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    bio = Column(
        Text,
        default="",
    )

    location = Column(
        String(120),
        default="",
    )

    profile_picture = Column(
        Text,
        default="",
    )

    cover_photo = Column(
        Text,
        default="",
    )

    theme = Column(
        String(20),
        default="dark",
    )

    is_verified = Column(
        Boolean,
        default=False,
    )

    is_active = Column(
        Boolean,
        default=True,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


class SessionToken(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    token_hash = Column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
    )

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True)

    follower_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    following_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "follower_id",
            "following_id",
            name="unique_follow",
        ),
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    caption = Column(
        Text,
        default="",
    )

    media_url = Column(
        Text,
        default="",
    )

    media_type = Column(
        String(30),
        default="text",
    )

    visibility = Column(
        String(20),
        default="public",
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    post_id = Column(
        Integer,
        ForeignKey("posts.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "post_id",
            name="unique_post_like",
        ),
    )


class SavedPost(Base):
    __tablename__ = "saved_posts"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    post_id = Column(
        Integer,
        ForeignKey("posts.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "post_id",
            name="unique_saved_post",
        ),
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    post_id = Column(
        Integer,
        ForeignKey("posts.id"),
        nullable=False,
    )

    parent_id = Column(
        Integer,
        ForeignKey("comments.id"),
        nullable=True,
    )

    text = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


class Reshare(Base):
    __tablename__ = "reshares"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    post_id = Column(
        Integer,
        ForeignKey("posts.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    text = Column(
        Text,
        default="",
    )

    media_url = Column(
        Text,
        default="",
    )

    media_type = Column(
        String(30),
        default="text",
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    user = relationship("User")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "conversation_id",
            "user_id",
            name="unique_conversation_member",
        ),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    text = Column(
        Text,
        default="",
    )

    media_url = Column(
        Text,
        default="",
    )

    media_type = Column(
        String(30),
        default="text",
    )

    is_read = Column(
        Boolean,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    actor_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    notification_type = Column(
        String(50),
        nullable=False,
    )

    reference_id = Column(
        Integer,
        nullable=True,
    )

    message = Column(
        Text,
        default="",
    )

    is_read = Column(
        Boolean,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


# ============================================================
# 4. CREATE TABLES
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# 5. FASTAPI APP
# ============================================================

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "TESTMONY — Connect beyond. "
        "Social Network + Messaging + AI Platform."
    ),
)


# ============================================================
# 6. CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 7. STATIC FILES
# ============================================================

if STATIC_DIR.exists():
    app.mount(
        "/static",
        StaticFiles(directory=str(STATIC_DIR)),
        name="static",
    )


# ============================================================
# 8. DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# 9. PASSWORD SECURITY
# ============================================================

def hash_password(password: str) -> str:
    """
    PBKDF2-HMAC-SHA256 password hashing.
    """

    salt = secrets.token_bytes(32)

    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    )

    return (
        salt.hex()
        + ":"
        + derived.hex()
    )


def verify_password(
    password: str,
    stored_hash: str,
) -> bool:

    try:
        salt_hex, hash_hex = stored_hash.split(":")

        salt = bytes.fromhex(salt_hex)

        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            200_000,
        )

        return hmac.compare_digest(
            derived.hex(),
            hash_hex,
        )

    except Exception:
        return False


# ============================================================
# 10. SESSION SECURITY
# ============================================================

def hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_session(
    db: Session,
    user_id: int,
) -> str:

    raw_token = secrets.token_urlsafe(64)

    token_hash = hash_token(raw_token)

    session = SessionToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=30),
    )

    db.add(session)
    db.commit()

    return raw_token


def get_current_user(
    authorization: Optional[str],
    db: Session,
) -> User:

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format",
        )

    token = authorization.replace(
        "Bearer ",
        "",
        1,
    ).strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing session token",
        )

    token_hash = hash_token(token)

    session = (
        db.query(SessionToken)
        .filter(
            SessionToken.token_hash == token_hash
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid session",
        )

    now = datetime.now(timezone.utc)

    expires = session.expires_at

    if expires.tzinfo is None:
        expires = expires.replace(
            tzinfo=timezone.utc
        )

    if expires < now:
        db.delete(session)
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Session expired",
        )

    user = (
        db.query(User)
        .filter(User.id == session.user_id)
        .first()
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User account unavailable",
        )

    return user


def current_user(
    authorization: Optional[str] = Header(
        default=None
    ),
    db: Session = Depends(get_db),
):
    return get_current_user(
        authorization,
        db,
    )


# ============================================================
# 11. PYDANTIC SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    username: str = Field(
        min_length=3,
        max_length=50,
    )

    email: str = Field(
        min_length=5,
        max_length=255,
    )

    password: str = Field(
        min_length=6,
        max_length=128,
    )


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_photo: Optional[str] = None
    theme: Optional[str] = None


class PostCreateRequest(BaseModel):
    caption: str = ""
    media_url: str = ""
    media_type: str = "text"
    visibility: str = "public"


class CommentCreateRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=5000,
    )

    parent_id: Optional[int] = None


class StoryCreateRequest(BaseModel):
    text: str = ""
    media_url: str = ""
    media_type: str = "text"


class MessageCreateRequest(BaseModel):
    text: str = ""
    media_url: str = ""
    media_type: str = "text"


class ConversationCreateRequest(BaseModel):
    user_id: int


class ThemeRequest(BaseModel):
    theme: str


# ============================================================
# 12. SERIALIZATION HELPERS
# ============================================================

def user_to_dict(
    user: User,
    db: Session,
):
    followers = (
        db.query(Follow)
        .filter(
            Follow.following_id == user.id
        )
        .count()
    )

    following = (
        db.query(Follow)
        .filter(
            Follow.follower_id == user.id
        )
        .count()
    )

    posts = (
        db.query(Post)
        .filter(
            Post.user_id == user.id
        )
        .count()
    )

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "bio": user.bio,
        "location": user.location,
        "profile_picture": user.profile_picture,
        "cover_photo": user.cover_photo,
        "theme": user.theme,
        "is_verified": user.is_verified,
        "followers": followers,
        "following": following,
        "posts": posts,
        "created_at": user.created_at,
    }


def post_to_dict(
    post: Post,
    db: Session,
    viewer_id: Optional[int] = None,
):
    user = (
        db.query(User)
        .filter(User.id == post.user_id)
        .first()
    )

    likes = (
        db.query(Like)
        .filter(
            Like.post_id == post.id
        )
        .count()
    )

    comments = (
        db.query(Comment)
        .filter(
            Comment.post_id == post.id
        )
        .count()
    )

    reshares = (
        db.query(Reshare)
        .filter(
            Reshare.post_id == post.id
        )
        .count()
    )

    saved = False
    liked = False

    if viewer_id:
        liked = (
            db.query(Like)
            .filter(
                Like.post_id == post.id,
                Like.user_id == viewer_id,
            )
            .first()
            is not None
        )

        saved = (
            db.query(SavedPost)
            .filter(
                SavedPost.post_id == post.id,
                SavedPost.user_id == viewer_id,
            )
            .first()
            is not None
        )

    return {
        "id": post.id,
        "caption": post.caption,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "visibility": post.visibility,
        "created_at": post.created_at,
        "author": (
            user_to_dict(user, db)
            if user
            else None
        ),
        "likes": likes,
        "comments": comments,
        "reshares": reshares,
        "liked": liked,
        "saved": saved,
    }


# ============================================================
# 13. ROOT / HEALTH
# ============================================================

@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"

    if index_file.exists():
        return FileResponse(index_file)

    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "slogan": APP_SLOGAN,
        "founder": FOUNDER,
        "company": COMPANY,
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "slogan": APP_SLOGAN,
        "founder": FOUNDER,
        "company": COMPANY,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# 14. APP INFORMATION
# ============================================================

@app.get("/api")
def api_info():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "slogan": APP_SLOGAN,
        "founder": FOUNDER,
        "company": COMPANY,
        "type": (
            "Social Network + Messaging + "
            "AI Platform + Education + Marketplace + "
            "Creator Platform"
        ),
    }


# ============================================================
# 15. REGISTER
# ============================================================

@app.post("/api/auth/register")
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):

    email = payload.email.strip().lower()

    username = (
        payload.username
        .strip()
        .lower()
        .replace(" ", "")
    )

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    user = User(
        name=payload.name.strip(),
        username=username,
        email=email,
        password_hash=hash_password(
            payload.password
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_session(
        db,
        user.id,
    )

    return {
        "message": "Account created successfully",
        "token": token,
        "user": user_to_dict(
            user,
            db,
        ),
    }


# ============================================================
# 16. LOGIN
# ============================================================

@app.post("/api/auth/login")
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):

    email = payload.email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_session(
        db,
        user.id,
    )

    return {
        "message": "Login successful",
        "token": token,
        "expires_in": 30 * 24 * 60 * 60,
        "user": user_to_dict(
            user,
            db,
        ),
    }


# ============================================================
# 17. LOGOUT
# ============================================================

@app.post("/api/auth/logout")
def logout(
    authorization: Optional[str] = Header(
        default=None
    ),
    db: Session = Depends(get_db),
):

    if not authorization:
        return {
            "message": "Already logged out"
        }

    token = authorization.replace(
        "Bearer ",
        "",
        1,
    ).strip()

    if token:

        token_hash = hash_token(token)

        session = (
            db.query(SessionToken)
            .filter(
                SessionToken.token_hash
                == token_hash
            )
            .first()
        )

        if session:
            db.delete(session)
            db.commit()

    return {
        "message": "Logged out successfully"
    }


# ============================================================
# 18. CURRENT USER
# ============================================================

@app.get("/api/auth/me")
def me(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return {
        "user": user_to_dict(
            user,
            db,
        )
    }


# ============================================================
# 19. UPDATE PROFILE
# ============================================================

@app.put("/api/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    if payload.name is not None:
        user.name = payload.name.strip()

    if payload.username is not None:

        username = (
            payload.username
            .strip()
            .lower()
            .replace(" ", "")
        )

        duplicate = (
            db.query(User)
            .filter(
                User.username == username,
                User.id != user.id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Username already exists",
            )

        user.username = username

    if payload.bio is not None:
        user.bio = payload.bio

    if payload.location is not None:
        user.location = payload.location

    if payload.profile_picture is not None:
        user.profile_picture = (
            payload.profile_picture
        )

    if payload.cover_photo is not None:
        user.cover_photo = (
            payload.cover_photo
        )

    if payload.theme is not None:

        if payload.theme not in (
            "dark",
            "light",
        ):
            raise HTTPException(
                status_code=400,
                detail="Theme must be dark or light",
            )

        user.theme = payload.theme

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated",
        "user": user_to_dict(
            user,
            db,
        ),
    }


# ============================================================
# 20. USER SEARCH
# ============================================================

@app.get("/api/users/search")
def search_users(
    q: str = Query(
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):

    keyword = f"%{q.strip()}%"

    users = (
        db.query(User)
        .filter(
            User.is_active == True,
            or_(
                User.name.ilike(keyword),
                User.username.ilike(keyword),
                User.email.ilike(keyword),
            ),
        )
        .limit(30)
        .all()
    )

    return {
        "results": [
            user_to_dict(
                user,
                db,
            )
            for user in users
        ]
    }


# ============================================================
# 21. GET USER PROFILE
# ============================================================

@app.get("/api/users/{username}")
def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.username == username.lower()
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return {
        "user": user_to_dict(
            user,
            db,
        )
    }


# ============================================================
# 22. FOLLOW USER
# ============================================================

@app.post("/api/users/{user_id}/follow")
def follow_user(
    user_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    if user_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot follow yourself",
        )

    target = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    existing = (
        db.query(Follow)
        .filter(
            Follow.follower_id == user.id,
            Follow.following_id == user_id,
        )
        .first()
    )

    if existing:
        return {
            "message": "Already following",
            "following": True,
        }

    follow = Follow(
        follower_id=user.id,
        following_id=user_id,
    )

    db.add(follow)

    notification = Notification(
        user_id=user_id,
        actor_id=user.id,
        notification_type="follow",
        message=f"{user.name} followed you",
    )

    db.add(notification)

    db.commit()

    return {
        "message": "Followed successfully",
        "following": True,
    }


# ============================================================
# 23. UNFOLLOW USER
# ============================================================

@app.delete("/api/users/{user_id}/follow")
def unfollow_user(
    user_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    follow = (
        db.query(Follow)
        .filter(
            Follow.follower_id == user.id,
            Follow.following_id == user_id,
        )
        .first()
    )

    if follow:
        db.delete(follow)
        db.commit()

    return {
        "message": "Unfollowed successfully",
        "following": False,
    }


# ============================================================
# 24. CREATE POST
# ============================================================

@app.post("/api/posts")
def create_post(
    payload: PostCreateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = Post(
        user_id=user.id,
        caption=payload.caption,
        media_url=payload.media_url,
        media_type=payload.media_type,
        visibility=payload.visibility,
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return {
        "message": "Post created",
        "post": post_to_dict(
            post,
            db,
            user.id,
        ),
    }


# ============================================================
# 25. GLOBAL FEED
# ============================================================

@app.get("/api/feed")
def global_feed(
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    offset = (
        page - 1
    ) * limit

    posts = (
        db.query(Post)
        .filter(
            Post.visibility == "public"
        )
        .order_by(
            Post.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "page": page,
        "limit": limit,
        "posts": [
            post_to_dict(
                post,
                db,
                user.id,
            )
            for post in posts
        ],
    }


# ============================================================
# 26. FOLLOWING FEED
# ============================================================

@app.get("/api/feed/following")
def following_feed(
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    following_rows = (
        db.query(Follow.following_id)
        .filter(
            Follow.follower_id == user.id
        )
        .all()
    )

    following_ids = [
        row[0]
        for row in following_rows
    ]

    following_ids.append(user.id)

    offset = (
        page - 1
    ) * limit

    posts = (
        db.query(Post)
        .filter(
            Post.user_id.in_(following_ids)
        )
        .order_by(
            Post.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "page": page,
        "limit": limit,
        "posts": [
            post_to_dict(
                post,
                db,
                user.id,
            )
            for post in posts
        ],
    }


# ============================================================
# 27. GET SINGLE POST
# ============================================================

@app.get("/api/posts/{post_id}")
def get_post(
    post_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    return {
        "post": post_to_dict(
            post,
            db,
            user.id,
        )
    }


# ============================================================
# 28. DELETE POST
# ============================================================

@app.delete("/api/posts/{post_id}")
def delete_post(
    post_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    db.delete(post)
    db.commit()

    return {
        "message": "Post deleted"
    }


# ============================================================
# 29. LIKE / UNLIKE
# ============================================================

@app.post("/api/posts/{post_id}/like")
def like_post(
    post_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    existing = (
        db.query(Like)
        .filter(
            Like.post_id == post_id,
            Like.user_id == user.id,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        liked = False

    else:

        like = Like(
            user_id=user.id,
            post_id=post_id,
        )

        db.add(like)

        if post.user_id != user.id:
            db.add(
                Notification(
                    user_id=post.user_id,
                    actor_id=user.id,
                    notification_type="like",
                    reference_id=post_id,
                    message=(
                        f"{user.name} liked your post"
                    ),
                )
            )

        liked = True

    db.commit()

    count = (
        db.query(Like)
        .filter(
            Like.post_id == post_id
        )
        .count()
    )

    return {
        "liked": liked,
        "likes": count,
    }


# ============================================================
# 30. SAVE / UNSAVE
# ============================================================

@app.post("/api/posts/{post_id}/save")
def save_post(
    post_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    existing = (
        db.query(SavedPost)
        .filter(
            SavedPost.post_id == post_id,
            SavedPost.user_id == user.id,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        saved = False
    else:
        db.add(
            SavedPost(
                post_id=post_id,
                user_id=user.id,
            )
        )
        saved = True

    db.commit()

    return {
        "saved": saved
    }


# ============================================================
# 31. RESHARE
# ============================================================

@app.post("/api/posts/{post_id}/reshare")
def reshare_post(
    post_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    reshare = Reshare(
        user_id=user.id,
        post_id=post_id,
    )

    db.add(reshare)

    if post.user_id != user.id:
        db.add(
            Notification(
                user_id=post.user_id,
                actor_id=user.id,
                notification_type="reshare",
                reference_id=post_id,
                message=(
                    f"{user.name} reshared your post"
                ),
            )
        )

    db.commit()

    count = (
        db.query(Reshare)
        .filter(
            Reshare.post_id == post_id
        )
        .count()
    )

    return {
        "message": "Post reshared",
        "reshares": count,
    }


# ============================================================
# 32. CREATE COMMENT
# ============================================================

@app.post("/api/posts/{post_id}/comments")
def create_comment(
    post_id: int,
    payload: CommentCreateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    comment = Comment(
        post_id=post_id,
        user_id=user.id,
        parent_id=payload.parent_id,
        text=payload.text,
    )

    db.add(comment)

    if post.user_id != user.id:
        db.add(
            Notification(
                user_id=post.user_id,
                actor_id=user.id,
                notification_type="comment",
                reference_id=post_id,
                message=(
                    f"{user.name} commented on your post"
                ),
            )
        )

    db.commit()
    db.refresh(comment)

    return {
        "message": "Comment created",
        "comment": {
            "id": comment.id,
            "text": comment.text,
            "user": user_to_dict(
                user,
                db,
            ),
            "created_at": comment.created_at,
        },
    }


# ============================================================
# 33. GET COMMENTS
# ============================================================

@app.get("/api/posts/{post_id}/comments")
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
):

    comments = (
        db.query(Comment)
        .filter(
            Comment.post_id == post_id
        )
        .order_by(
            Comment.created_at.asc()
        )
        .all()
    )

    results = []

    for comment in comments:

        comment_user = (
            db.query(User)
            .filter(
                User.id == comment.user_id
            )
            .first()
        )

        results.append(
            {
                "id": comment.id,
                "text": comment.text,
                "parent_id": comment.parent_id,
                "created_at": comment.created_at,
                "user": (
                    user_to_dict(
                        comment_user,
                        db,
                    )
                    if comment_user
                    else None
                ),
            }
        )

    return {
        "comments": results
    }


# ============================================================
# 34. CREATE STORY
# ============================================================

@app.post("/api/stories")
def create_story(
    payload: StoryCreateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    now = datetime.now(timezone.utc)

    story = Story(
        user_id=user.id,
        text=payload.text,
        media_url=payload.media_url,
        media_type=payload.media_type,
        created_at=now,
        expires_at=now + timedelta(hours=24),
    )

    db.add(story)
    db.commit()
    db.refresh(story)

    return {
        "message": "Story created",
        "story": {
            "id": story.id,
            "text": story.text,
            "media_url": story.media_url,
            "media_type": story.media_type,
            "created_at": story.created_at,
            "expires_at": story.expires_at,
        },
    }


# ============================================================
# 35. GET ACTIVE STORIES
# ============================================================

@app.get("/api/stories")
def get_stories(
    db: Session = Depends(get_db),
):

    now = datetime.now(timezone.utc)

    stories = (
        db.query(Story)
        .filter(
            Story.expires_at > now
        )
        .order_by(
            Story.created_at.desc()
        )
        .all()
    )

    results = []

    for story in stories:

        owner = (
            db.query(User)
            .filter(
                User.id == story.user_id
            )
            .first()
        )

        results.append(
            {
                "id": story.id,
                "text": story.text,
                "media_url": story.media_url,
                "media_type": story.media_type,
                "created_at": story.created_at,
                "expires_at": story.expires_at,
                "user": (
                    user_to_dict(
                        owner,
                        db,
                    )
                    if owner
                    else None
                ),
            }
        )

    return {
        "stories": results
    }


# ============================================================
# 36. DELETE EXPIRED STORIES
# ============================================================

@app.delete("/api/stories/cleanup")
def cleanup_stories(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    now = datetime.now(timezone.utc)

    expired = (
        db.query(Story)
        .filter(
            Story.expires_at <= now
        )
        .all()
    )

    count = len(expired)

    for story in expired:
        db.delete(story)

    db.commit()

    return {
        "deleted": count
    }


# ============================================================
# 37. CREATE CONVERSATION
# ============================================================

@app.post("/api/conversations")
def create_conversation(
    payload: ConversationCreateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    if payload.user_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot chat with yourself",
        )

    other = (
        db.query(User)
        .filter(
            User.id == payload.user_id
        )
        .first()
    )

    if not other:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    existing = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.user_id
            == user.id
        )
        .all()
    )

    for member in existing:

        conversation_id = (
            member.conversation_id
        )

        other_member = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id
                == conversation_id,
                ConversationMember.user_id
                == payload.user_id,
            )
            .first()
        )

        if other_member:

            count = (
                db.query(
                    ConversationMember
                )
                .filter(
                    ConversationMember.conversation_id
                    == conversation_id
                )
                .count()
            )

            if count == 2:
                return {
                    "conversation_id":
                        conversation_id
                }

    conversation = Conversation()

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    db.add_all(
        [
            ConversationMember(
                conversation_id=conversation.id,
                user_id=user.id,
            ),
            ConversationMember(
                conversation_id=conversation.id,
                user_id=payload.user_id,
            ),
        ]
    )

    db.commit()

    return {
        "conversation_id": conversation.id
    }


# ============================================================
# 38. CONVERSATION LIST
# ============================================================

@app.get("/api/conversations")
def conversations(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    memberships = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.user_id
            == user.id
        )
        .all()
    )

    results = []

    for membership in memberships:

        conversation_id = (
            membership.conversation_id
        )

        members = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id
                == conversation_id
            )
            .all()
        )

        people = []

        for member in members:

            member_user = (
                db.query(User)
                .filter(
                    User.id == member.user_id
                )
                .first()
            )

            if member_user:
                people.append(
                    user_to_dict(
                        member_user,
                        db,
                    )
                )

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id
                == conversation_id
            )
            .order_by(
                Message.created_at.desc()
            )
            .first()
        )

        results.append(
            {
                "conversation_id":
                    conversation_id,
                "members": people,
                "last_message": (
                    {
                        "id": last_message.id,
                        "text": last_message.text,
                        "media_type":
                            last_message.media_type,
                        "created_at":
                            last_message.created_at,
                    }
                    if last_message
                    else None
                ),
            }
        )

    return {
        "conversations": results
    }


# ============================================================
# 39. GET CONVERSATION MESSAGES
# ============================================================

@app.get(
    "/api/conversations/{conversation_id}/messages"
)
def get_messages(
    conversation_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id
            == conversation_id,
            ConversationMember.user_id
            == user.id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this conversation",
        )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id
            == conversation_id
        )
        .order_by(
            Message.created_at.asc()
        )
        .all()
    )

    results = []

    for message in messages:

        sender = (
            db.query(User)
            .filter(
                User.id == message.sender_id
            )
            .first()
        )

        results.append(
            {
                "id": message.id,
                "text": message.text,
                "media_url": message.media_url,
                "media_type": message.media_type,
                "is_read": message.is_read,
                "created_at": message.created_at,
                "sender": (
                    user_to_dict(
                        sender,
                        db,
                    )
                    if sender
                    else None
                ),
            }
        )

    return {
        "conversation_id":
            conversation_id,
        "messages": results,
    }


# ============================================================
# 40. SEND MESSAGE
# ============================================================

@app.post(
    "/api/conversations/{conversation_id}/messages"
)
def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id
            == conversation_id,
            ConversationMember.user_id
            == user.id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this conversation",
        )

    if not payload.text and not payload.media_url:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty",
        )

    message = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        text=payload.text,
        media_url=payload.media_url,
        media_type=payload.media_type,
    )

    db.add(message)

    other_members = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id
            == conversation_id,
            ConversationMember.user_id
            != user.id,
        )
        .all()
    )

    for other in other_members:

        db.add(
            Notification(
                user_id=other.user_id,
                actor_id=user.id,
                notification_type="message",
                reference_id=conversation_id,
                message=(
                    f"New message from {user.name}"
                ),
            )
        )

    db.commit()
    db.refresh(message)

    return {
        "message": {
            "id": message.id,
            "text": message.text,
            "media_url": message.media_url,
            "media_type": message.media_type,
            "created_at": message.created_at,
        }
    }


# ============================================================
# 41. MARK MESSAGES READ
# ============================================================

@app.post(
    "/api/conversations/{conversation_id}/read"
)
def mark_messages_read(
    conversation_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id
            == conversation_id,
            ConversationMember.user_id
            == user.id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=403,
            detail="Not a member",
        )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id
            == conversation_id,
            Message.sender_id != user.id,
            Message.is_read == False,
        )
        .all()
    )

    for message in messages:
        message.is_read = True

    db.commit()

    return {
        "message": "Messages marked as read",
        "count": len(messages),
    }


# ============================================================
# 42. NOTIFICATIONS
# ============================================================

@app.get("/api/notifications")
def notifications(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    items = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(50)
        .all()
    )

    results = []

    for item in items:

        actor = None

        if item.actor_id:

            actor = (
                db.query(User)
                .filter(
                    User.id == item.actor_id
                )
                .first()
            )

        results.append(
            {
                "id": item.id,
                "type": item.notification_type,
                "message": item.message,
                "reference_id":
                    item.reference_id,
                "is_read": item.is_read,
                "created_at":
                    item.created_at,
                "actor": (
                    user_to_dict(
                        actor,
                        db,
                    )
                    if actor
                    else None
                ),
            }
        )

    return {
        "notifications": results
    }


# ============================================================
# 43. MARK NOTIFICATIONS READ
# ============================================================

@app.post("/api/notifications/read")
def mark_notifications_read(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    items = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
        .all()
    )

    for item in items:
        item.is_read = True

    db.commit()

    return {
        "message":
            "Notifications marked as read",
        "count": len(items),
    }


# ============================================================
# 44. DISCOVERY
# ============================================================

@app.get("/api/discovery")
def discovery():
    return {
        "title": "Testmony Discovery",
        "slogan": APP_SLOGAN,
        "cards": [
            {
                "id": "ai",
                "title": "AI Council",
                "icon": "📖",
                "description": (
                    "Education, Health, Agriculture, "
                    "Research and AI Canvas"
                ),
            },
            {
                "id": "studio",
                "title": "Creative Studio",
                "icon": "🖼️",
                "description": (
                    "Image, Video, Document and Design"
                ),
            },
            {
                "id": "market",
                "title": "Market",
                "icon": "🛍️",
                "description": (
                    "Products, Services and Digital"
                ),
            },
            {
                "id": "map",
                "title": "World Map",
                "icon": "🌍",
                "description": (
                    "Explore countries and communities"
                ),
            },
            {
                "id": "channels",
                "title": "Channels",
                "icon": "📺",
                "description": (
                    "News and media channels"
                ),
            },
            {
                "id": "communities",
                "title": "Communities",
                "icon": "👥",
                "description": (
                    "Join groups and communities"
                ),
            },
            {
                "id": "videos",
                "title": "Videos",
                "icon": "▶️",
                "description": (
                    "Short-form vertical videos"
                ),
            },
            {
                "id": "settings",
                "title": "Settings",
                "icon": "⚙️",
                "description": (
                    "Preferences and account settings"
                ),
            },
        ],
    }


# ============================================================
# 45. AI COUNCIL BLUEPRINT
# ============================================================

@app.get("/api/ai/council")
def ai_council():

    return {
        "name": "Testmony AI Council",
        "status": "foundation",
        "assistants": [
            {
                "id": "education",
                "name": "Education AI",
                "icon": "📚",
                "flow": [
                    "country",
                    "level",
                    "content",
                    "chat",
                ],
            },
            {
                "id": "health",
                "name": "Health AI",
                "icon": "❤️",
                "flow": ["chat"],
            },
            {
                "id": "agriculture",
                "name": "Agriculture AI",
                "icon": "🌿",
                "flow": ["chat"],
            },
            {
                "id": "research",
                "name": "Research AI",
                "icon": "🔎",
                "flow": ["chat"],
            },
            {
                "id": "canvas",
                "name": "AI Canvas",
                "icon": "📐",
                "flow": ["workspace"],
            },
        ],
    }


# ============================================================
# 46. EDUCATION AI OPTIONS
# ============================================================

@app.get("/api/ai/education/options")
def education_options():

    return {
        "countries": [
            "Tanzania",
            "Kenya",
            "Uganda",
            "Rwanda",
            "Burundi",
            "South Africa",
            "Nigeria",
            "Ghana",
            "United Kingdom",
            "United States",
            "Canada",
            "Australia",
            "India",
            "China",
            "Japan",
            "Germany",
            "France",
            "Brazil",
        ],

        "levels": [
            "Nursery / Early Childhood",
            "Primary",
            "Secondary",
            "High School",
            "Certificate",
            "Diploma",
            "Degree",
            "Master",
            "PhD",
        ],

        "content": [
            "Notes",
            "Books",
            "Past Papers",
            "Marking Schemes",
        ],
    }


# ============================================================
# 47. AI CHAT FOUNDATION
# ============================================================

@app.post("/api/ai/chat")
def ai_chat(
    assistant: str = Query(
        default="education"
    ),
    message: str = Query(
        min_length=1
    ),
    user: User = Depends(current_user),
):

    """
    Foundation endpoint.

    Gemini/OpenAI integration will be connected
    in the AI phase.

    This endpoint deliberately does not pretend
    that an external AI API is already connected.
    """

    return {
        "assistant": assistant,
        "message": message,
        "status": "placeholder",
        "reply": (
            "Testmony AI is ready for API integration. "
            "The real AI provider will be connected "
            "in the AI Council phase."
        ),
    }


# ============================================================
# 48. THEME
# ============================================================

@app.put("/api/settings/theme")
def update_theme(
    payload: ThemeRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    theme = payload.theme.lower().strip()

    if theme not in (
        "dark",
        "light",
    ):
        raise HTTPException(
            status_code=400,
            detail="Theme must be dark or light",
        )

    user.theme = theme

    db.commit()

    return {
        "theme": theme
    }


# ============================================================
# 49. USER MANUAL
# ============================================================

USER_MANUAL = f"""
============================================================
TESTMONY — CONNECT BEYOND
============================================================

Founder:
{FOUNDER}

Company:
{COMPANY}

Version:
{APP_VERSION}

Type:
Social Network + Messaging + AI Platform +
Education + Marketplace + Creator Platform


============================================================
1. ABOUT TESTMONY
============================================================

Testmony is a social and communication platform
designed to connect people, knowledge, creativity
and opportunities.


============================================================
2. MAIN NAVIGATION
============================================================

HOME
- Feed
- Stories
- Posts
- Search
- Likes
- Comments
- Saves
- Reshares

DISCOVERY
- AI Council
- Creative Studio
- Market
- World Map
- Channels
- Communities
- Videos
- Settings

CHATS
- Messages
- Voice notes
- Files
- Voice calls
- Video calls

PROFILE
- Profile picture
- Cover photo
- Bio
- Followers
- Following
- Posts


============================================================
3. EDUCATION AI
============================================================

Discovery
    ↓
AI Council
    ↓
Education AI
    ↓
Country
    ↓
Level
    ↓
Content
    ↓
AI Chat


============================================================
4. STORY
============================================================

Stories can contain:
- Text
- Photo
- Video
- Audio

Stories expire after 24 hours.


============================================================
5. ACCOUNT
============================================================

Register:
Name → Username → Email → Password

Login:
Email → Password

Session:
30 days


============================================================
6. SUPPORT
============================================================

Company:
{COMPANY}

Founder:
{FOUNDER}


============================================================
TESTMONY
CONNECT BEYOND
============================================================
"""


@app.get("/api/user-manual")
def get_user_manual():
    return {
        "title": "Testmony User Manual",
        "version": APP_VERSION,
        "content": USER_MANUAL,
    }


# ============================================================
# 50. SIMPLE APP STATISTICS
# ============================================================

@app.get("/api/stats")
def app_stats(
    db: Session = Depends(get_db),
):

    users = (
        db.query(User)
        .count()
    )

    posts = (
        db.query(Post)
        .count()
    )

    stories = (
        db.query(Story)
        .filter(
            Story.expires_at
            > datetime.now(timezone.utc)
        )
        .count()
    )

    conversations = (
        db.query(Conversation)
        .count()
    )

    messages = (
        db.query(Message)
        .count()
    )

    return {
        "users": users,
        "posts": posts,
        "active_stories": stories,
        "conversations": conversations,
        "messages": messages,
    }


# ============================================================
# 51. STARTUP EVENT
# ============================================================

@app.on_event("startup")
def startup_event():

    print("=" * 60)
    print("TESTMONY STARTED")
    print("=" * 60)
    print(f"APP       : {APP_NAME}")
    print(f"VERSION   : {APP_VERSION}")
    print(f"SLOGAN    : {APP_SLOGAN}")
    print(f"FOUNDER   : {FOUNDER}")
    print(f"COMPANY   : {COMPANY}")
    print(f"DATABASE  : {DATABASE_URL}")
    print("=" * 60)


# ============================================================
# 52. LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(
            os.getenv(
                "PORT",
                "8000",
            )
        ),
        reload=True,
    )
