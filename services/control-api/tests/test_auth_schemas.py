import pytest
from pydantic import ValidationError

from app.schemas.auth import AuthLoginRequest, AuthRegisterRequest


def test_register_schema_normalizes_email() -> None:
    payload = AuthRegisterRequest(
        email="  TOM@ORBEONE.COM.BR ",
        name="Tom",
        password="senha-segura-123",
    )

    assert payload.email == "tom@orbeone.com.br"


def test_register_schema_rejects_weak_password() -> None:
    with pytest.raises(ValidationError):
        AuthRegisterRequest(
            email="tom@orbeone.com.br",
            name="Tom",
            password="123",
        )


def test_login_schema_normalizes_email() -> None:
    payload = AuthLoginRequest(
        email="  TOM@ORBEONE.COM.BR ",
        password="senha-segura-123",
    )

    assert payload.email == "tom@orbeone.com.br"
