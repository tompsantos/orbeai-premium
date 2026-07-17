from app.core.security import (
    create_session_token,
    hash_password,
    hash_token,
    normalize_email,
    verify_password,
)


def test_normalize_email() -> None:
    assert normalize_email("  TOM@ORBEONE.COM.BR ") == "tom@orbeone.com.br"


def test_password_hash_roundtrip() -> None:
    password_hash = hash_password("senha-super-segura")

    assert password_hash.startswith("pbkdf2_sha256$")
    assert "senha-super-segura" not in password_hash
    assert verify_password("senha-super-segura", password_hash) is True
    assert verify_password("senha-errada", password_hash) is False


def test_session_token_hashing() -> None:
    token = create_session_token()
    token_hash = hash_token(token)

    assert token
    assert token not in token_hash
    assert len(token_hash) == 64
    assert hash_token(token) == token_hash
