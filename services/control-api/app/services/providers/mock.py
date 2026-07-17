from dataclasses import dataclass


MOCK_PROVIDER_NAME = "orbe-mock"
MOCK_MODEL_NAME = "orbe-mock-v0"


@dataclass(frozen=True)
class MockModelResult:
    content: str
    input_tokens: int
    output_tokens: int
    router_reason: str


def estimate_tokens(text: str) -> int:
    words = text.split()
    return max(1, int(len(words) * 1.35))


def generate_mock_response(user_content: str, mode: str, model_preference: str) -> MockModelResult:
    clean_content = user_content.strip()

    response = (
        "recebi sua mensagem e salvei tudo no backend real da orbeAI. "
        f"modo ativo: {mode}. modelo preferido: {model_preference}. "
        "por enquanto esta resposta vem do provider mock, mas o fluxo já está pronto "
        "para o orbeRouter escolher um provedor real depois."
    )

    if clean_content:
        response += f" mensagem recebida: {clean_content}"

    return MockModelResult(
        content=response,
        input_tokens=estimate_tokens(user_content),
        output_tokens=estimate_tokens(response),
        router_reason="Provider mock usado enquanto o orbeRouter real ainda não está conectado.",
    )
