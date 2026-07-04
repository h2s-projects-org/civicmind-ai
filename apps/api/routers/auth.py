"""
CivicMind AI — Authentication Router

Implements JWT-based authentication with bcrypt password hashing
and OAuth2 password bearer scheme. Supports role-based access control
(RBAC) with roles: Super Admin, Organization Admin, Analyst,
Decision Maker, and Viewer.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from apps.api.config import get_settings
from apps.api.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    OrganizationResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ─── Password Hashing ──────────────────────────────────────────────────────

try:
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)
except ImportError:
    import hashlib

    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(plain: str, hashed: str) -> bool:
        return hashlib.sha256(plain.encode()).hexdigest() == hashed


# ─── JWT Token Management ──────────────────────────────────────────────────

try:
    import jwt as pyjwt

    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
        )
        to_encode.update({"exp": expire})
        return pyjwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)

    def decode_access_token(token: str) -> dict:
        try:
            return pyjwt.decode(
                token, settings.secret_key, algorithms=[settings.jwt_algorithm]
            )
        except pyjwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except pyjwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
except ImportError:
    import base64
    import json
    import time

    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = time.time() + (
            expires_delta.total_seconds()
            if expires_delta
            else settings.access_token_expire_minutes * 60
        )
        to_encode["exp"] = expire
        payload = json.dumps(to_encode)
        return base64.urlsafe_b64encode(payload.encode()).decode()

    def decode_access_token(token: str) -> dict:
        try:
            payload = base64.urlsafe_b64decode(token.encode()).decode()
            data = json.loads(payload)
            if data.get("exp", 0) < time.time():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                )
            return data
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )


# ─── In-Memory User Store (Development) ────────────────────────────────────
# In production, this is replaced by the PostgreSQL User table.
_users_store: dict[str, dict] = {}


# ─── Dependency: Get Current User ──────────────────────────────────────────

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """FastAPI dependency that extracts and validates the current user
    from the JWT bearer token.

    Returns None if no token is provided (for endpoints that support
    optional authentication).
    """
    if not token:
        return None

    payload = decode_access_token(token)
    email = payload.get("sub")
    if not email or email not in _users_store:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or token invalid",
        )
    return _users_store[email]


async def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    """Dependency that requires authentication — raises 401 if no user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control.

    Usage::
        @router.get("/admin", dependencies=[Depends(require_role("Super Admin"))])
        async def admin_endpoint(): ...
    """

    async def role_checker(user: dict = Depends(require_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(allowed_roles)}",
            )
        return user

    return role_checker


# ─── Routes ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate a user and return a JWT access token.

    For development convenience, if the user doesn't exist yet,
    they are auto-registered with the provided credentials.
    """
    email = request.email

    # Auto-register for development if user doesn't exist
    if email not in _users_store:
        name = email.split("@")[0].replace(".", " ").title()

        # Infer department from email
        if "safety" in email:
            department = "Department of Public Safety"
        elif "env" in email or "sanitation" in email:
            department = "Bureau of Sanitation & Environment"
        elif "trans" in email or "transit" in email:
            department = "Department of Transportation"
        else:
            department = "Community Administration"

        user_id = str(uuid.uuid4())
        _users_store[email] = {
            "id": user_id,
            "email": email,
            "name": name,
            "hashed_password": hash_password(request.password),
            "role": request.role or "Analyst",
            "department": department,
            "organization": {
                "id": str(uuid.uuid4()),
                "name": "Metro Civic Commission",
                "type": "Municipality",
                "region": "State Central Region",
            },
        }

    user = _users_store[email]

    # In production, verify password against stored hash
    # For dev mode, we accept any password
    if not settings.debug:
        if not verify_password(request.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

    # Generate JWT
    token = create_access_token(
        data={"sub": email, "role": user["role"]},
    )

    org = user.get("organization")
    org_response = None
    if org:
        org_response = OrganizationResponse(
            id=org["id"],
            name=org["name"],
            type=org["type"],
            region=org["region"],
        )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            department=user.get("department"),
            organization=org_response,
        ),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user account."""
    if request.email in _users_store:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())

    _users_store[request.email] = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "hashed_password": hash_password(request.password),
        "role": request.role or "Viewer",
        "department": request.department,
        "organization": {
            "id": org_id,
            "name": request.organization_name or "Default Organization",
            "type": "Municipality",
            "region": "Default Region",
        },
    }

    token = create_access_token(
        data={"sub": request.email, "role": request.role or "Viewer"},
    )

    org = _users_store[request.email]["organization"]

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=request.email,
            name=request.name,
            role=request.role or "Viewer",
            department=request.department,
            organization=OrganizationResponse(
                id=org["id"],
                name=org["name"],
                type=org["type"],
                region=org["region"],
            ),
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(user: dict = Depends(require_user)):
    """Return the profile of the currently authenticated user."""
    org = user.get("organization")
    org_response = None
    if org:
        org_response = OrganizationResponse(
            id=org["id"],
            name=org["name"],
            type=org["type"],
            region=org["region"],
        )

    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        organization=org_response,
    )
